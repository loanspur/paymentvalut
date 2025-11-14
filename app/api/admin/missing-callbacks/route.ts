import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-utils'
import { log } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * GET - Get transactions without M-Pesa callbacks
 * Returns disbursement requests that don't have matching callbacks
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !(payload as any).userId) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = (payload as any).userId

    // Check if user is super_admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !user || user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')
    const status = searchParams.get('status') // Filter by transaction status
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get all disbursement requests
    let query = supabase
      .from('disbursement_requests')
      .select(`
        id,
        conversation_id,
        originator_conversation_id,
        client_request_id,
        customer_name,
        customer_id,
        msisdn,
        amount,
        status,
        result_code,
        result_desc,
        transaction_id,
        transaction_receipt,
        partner_id,
        created_at,
        updated_at,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    const { data: transactions, error: transactionError } = await query
      .range(offset, offset + limit - 1)

    if (transactionError) {
      log.error('Error fetching transactions', transactionError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch transactions',
          details: process.env.NODE_ENV === 'development' ? transactionError.message : undefined
        },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0
      })
    }

    // Get all conversation IDs and originator conversation IDs
    const conversationIds = new Set<string>()
    const originatorConversationIds = new Set<string>()
    
    transactions.forEach(transaction => {
      if (transaction.conversation_id) {
        conversationIds.add(transaction.conversation_id)
      }
      if (transaction.originator_conversation_id) {
        originatorConversationIds.add(transaction.originator_conversation_id)
      }
    })

    // Check which transactions have callbacks
    const allIds = Array.from(new Set(Array.from(conversationIds).concat(Array.from(originatorConversationIds))))
    
    let callbackMap: Record<string, boolean> = {}
    
    if (allIds.length > 0) {
      // Query callbacks using .in() for better performance and to avoid OR query length limits
      // Query conversation_id matches
      const conversationIdArray = Array.from(conversationIds)
      if (conversationIdArray.length > 0) {
        const { data: callbacksByConversationId, error: error1 } = await supabase
          .from('mpesa_callbacks')
          .select('conversation_id, originator_conversation_id')
          .in('conversation_id', conversationIdArray)

        if (error1) {
          log.error('Error fetching callbacks by conversation_id', error1)
        } else if (callbacksByConversationId) {
          callbacksByConversationId.forEach(callback => {
            if (callback.conversation_id) {
              callbackMap[callback.conversation_id] = true
            }
            if (callback.originator_conversation_id) {
              callbackMap[callback.originator_conversation_id] = true
            }
          })
        }
      }

      // Query originator_conversation_id matches
      const originatorIdArray = Array.from(originatorConversationIds)
      if (originatorIdArray.length > 0) {
        const { data: callbacksByOriginatorId, error: error2 } = await supabase
          .from('mpesa_callbacks')
          .select('conversation_id, originator_conversation_id')
          .in('originator_conversation_id', originatorIdArray)

        if (error2) {
          log.error('Error fetching callbacks by originator_conversation_id', error2)
        } else if (callbacksByOriginatorId) {
          callbacksByOriginatorId.forEach(callback => {
            if (callback.conversation_id) {
              callbackMap[callback.conversation_id] = true
            }
            if (callback.originator_conversation_id) {
              callbackMap[callback.originator_conversation_id] = true
            }
          })
        }
      }
    }

    // Filter transactions that don't have callbacks
    const transactionsWithoutCallbacks = transactions.filter(transaction => {
      const hasCallback = 
        (transaction.conversation_id && callbackMap[transaction.conversation_id]) ||
        (transaction.originator_conversation_id && callbackMap[transaction.originator_conversation_id])
      
      return !hasCallback
    })

    // Get total count (for pagination)
    let countQuery = supabase
      .from('disbursement_requests')
      .select('id', { count: 'exact', head: true })

    if (partnerId) {
      countQuery = countQuery.eq('partner_id', partnerId)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count } = await countQuery

    return NextResponse.json({
      success: true,
      data: transactionsWithoutCallbacks,
      total: count || 0,
      without_callbacks: transactionsWithoutCallbacks.length,
      with_callbacks: transactions.length - transactionsWithoutCallbacks.length,
      pagination: {
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    log.error('Error in missing callbacks API', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    log.error('Error details', { errorMessage, errorStack })
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      },
      { status: 500 }
    )
  }
}

