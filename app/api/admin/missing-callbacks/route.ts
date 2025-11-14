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

    let payload
    try {
      payload = await verifyJWTToken(token)
    } catch (authError) {
      console.error('[Missing Callbacks API] JWT verification error:', authError)
      return NextResponse.json({ 
        error: 'Invalid authentication',
        message: authError instanceof Error ? authError.message : 'JWT verification failed'
      }, { status: 401 })
    }

    if (!payload || !(payload as any).userId) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = (payload as any).userId

    // Check if user is super_admin
    let user, userError
    try {
      const result = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()
      user = result.data
      userError = result.error
    } catch (userQueryError) {
      console.error('[Missing Callbacks API] User query exception:', userQueryError)
      return NextResponse.json({
        error: 'Failed to verify user',
        message: userQueryError instanceof Error ? userQueryError.message : 'User query failed'
      }, { status: 500 })
    }

    if (userError || !user || user.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Super admin access required' },
        { status: 403 }
      )
    }

    let searchParams, partnerId, statusFilter, limit, offset
    try {
      searchParams = new URL(request.url).searchParams
      partnerId = searchParams.get('partner_id')
      statusFilter = searchParams.get('status') // Filter by transaction status
      limit = parseInt(searchParams.get('limit') || '100')
      offset = parseInt(searchParams.get('offset') || '0')
    } catch (urlError) {
      console.error('[Missing Callbacks API] URL parsing error:', urlError)
      return NextResponse.json({
        error: 'Invalid request URL',
        message: urlError instanceof Error ? urlError.message : 'Failed to parse URL'
      }, { status: 400 })
    }

    // Get all disbursement requests (simplified query without relation first)
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
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (partnerId) {
      query = query.eq('partner_id', partnerId)
    }

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: transactions, error: transactionError } = await query
      .range(offset, offset + limit - 1)

    if (transactionError) {
      log.error('Error fetching transactions', transactionError)
      console.error('[Missing Callbacks API] Transaction query error:', transactionError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch transactions',
          message: transactionError.message,
          details: transactionError
        },
        { status: 500 }
      )
    }

    if (!transactions || transactions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
        without_callbacks: 0,
        with_callbacks: 0,
        pagination: {
          limit,
          offset,
          has_more: false
        }
      })
    }

    // Get all conversation IDs and originator conversation IDs
    const conversationIds = new Set<string>()
    const originatorConversationIds = new Set<string>()
    
    transactions.forEach(transaction => {
      if (transaction.conversation_id && typeof transaction.conversation_id === 'string' && transaction.conversation_id.trim().length > 0) {
        conversationIds.add(transaction.conversation_id.trim())
      }
      if (transaction.originator_conversation_id && typeof transaction.originator_conversation_id === 'string' && transaction.originator_conversation_id.trim().length > 0) {
        originatorConversationIds.add(transaction.originator_conversation_id.trim())
      }
    })

    // Check which transactions have callbacks
    let callbackMap: Record<string, boolean> = {}
    
    try {
      // Query callbacks using .in() for better performance and to avoid OR query length limits
      // Query conversation_id matches
      const conversationIdArray = Array.from(conversationIds).filter(id => id && id.length > 0)
      if (conversationIdArray.length > 0) {
        const { data: callbacksByConversationId, error: error1 } = await supabase
          .from('mpesa_callbacks')
          .select('conversation_id, originator_conversation_id')
          .in('conversation_id', conversationIdArray)

        if (error1) {
          log.error('Error fetching callbacks by conversation_id', error1)
        } else if (callbacksByConversationId) {
          callbacksByConversationId.forEach(callback => {
            if (callback?.conversation_id) {
              callbackMap[callback.conversation_id] = true
            }
            if (callback?.originator_conversation_id) {
              callbackMap[callback.originator_conversation_id] = true
            }
          })
        }
      }

      // Query originator_conversation_id matches
      const originatorIdArray = Array.from(originatorConversationIds).filter(id => id && id.length > 0)
      if (originatorIdArray.length > 0) {
        const { data: callbacksByOriginatorId, error: error2 } = await supabase
          .from('mpesa_callbacks')
          .select('conversation_id, originator_conversation_id')
          .in('originator_conversation_id', originatorIdArray)

        if (error2) {
          log.error('Error fetching callbacks by originator_conversation_id', error2)
        } else if (callbacksByOriginatorId) {
          callbacksByOriginatorId.forEach(callback => {
            if (callback?.conversation_id) {
              callbackMap[callback.conversation_id] = true
            }
            if (callback?.originator_conversation_id) {
              callbackMap[callback.originator_conversation_id] = true
            }
          })
        }
      }
    } catch (callbackError) {
      log.error('Error in callback query logic', callbackError)
      // Continue execution - we'll just return all transactions as missing callbacks
    }

    // Get partner information separately if needed
    const partnerIds = new Set<string>()
    transactions.forEach(transaction => {
      if (transaction.partner_id) {
        partnerIds.add(transaction.partner_id)
      }
    })

    let partnerMap: Record<string, any> = {}
    if (partnerIds.size > 0) {
      try {
        const partnerIdArray = Array.from(partnerIds)
        const { data: partners, error: partnerError } = await supabase
          .from('partners')
          .select('id, name, short_code')
          .in('id', partnerIdArray)

        if (partnerError) {
          log.error('Error fetching partners', partnerError)
          console.error('[Missing Callbacks API] Partner query error:', partnerError)
          // Continue without partner info - don't fail the whole request
        } else if (partners) {
          partners.forEach(partner => {
            partnerMap[partner.id] = partner
          })
        }
      } catch (partnerQueryError) {
        log.error('Error in partner query', partnerQueryError)
        console.error('[Missing Callbacks API] Partner query exception:', partnerQueryError)
        // Continue without partner info
      }
    }

    // Filter transactions that don't have callbacks
    const transactionsWithoutCallbacks = transactions.filter(transaction => {
      const hasCallback = 
        (transaction.conversation_id && callbackMap[transaction.conversation_id]) ||
        (transaction.originator_conversation_id && callbackMap[transaction.originator_conversation_id])
      
      return !hasCallback
    }).map(transaction => {
      try {
        return {
          ...transaction,
          // Add partner information
          partners: transaction.partner_id ? partnerMap[transaction.partner_id] || null : null
        }
      } catch (mapError) {
        console.error('[Missing Callbacks API] Error mapping transaction:', mapError, transaction)
        // Return transaction without partner info if mapping fails
        return {
          ...transaction,
          partners: null
        }
      }
    })

    // Get total count (for pagination)
    let countQuery = supabase
      .from('disbursement_requests')
      .select('id', { count: 'exact', head: true })

    if (partnerId) {
      countQuery = countQuery.eq('partner_id', partnerId)
    }

    if (statusFilter) {
      countQuery = countQuery.eq('status', statusFilter)
    }

    const { count, error: countError } = await countQuery
    
    if (countError) {
      log.error('Error fetching count', countError)
      console.error('[Missing Callbacks API] Count query error:', countError)
      // Continue with count as 0 if there's an error
    }

    // Prepare response data
    const responseData = {
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
    }

    // Validate response is serializable
    try {
      JSON.stringify(responseData)
    } catch (serializeError) {
      console.error('[Missing Callbacks API] Response serialization error:', serializeError)
      console.error('[Missing Callbacks API] Problematic data:', {
        dataLength: transactionsWithoutCallbacks.length,
        sampleTransaction: transactionsWithoutCallbacks[0]
      })
      // Return a simplified response
      return NextResponse.json({
        success: true,
        data: transactionsWithoutCallbacks.map(t => ({
          id: t.id,
          conversation_id: t.conversation_id,
          originator_conversation_id: t.originator_conversation_id,
          customer_name: t.customer_name,
          msisdn: t.msisdn,
          amount: t.amount,
          status: t.status,
          partner_id: t.partner_id,
          created_at: t.created_at,
          partners: t.partners
        })),
        total: count || 0,
        without_callbacks: transactionsWithoutCallbacks.length,
        with_callbacks: transactions.length - transactionsWithoutCallbacks.length,
        pagination: {
          limit,
          offset,
          has_more: (count || 0) > offset + limit
        }
      })
    }

    return NextResponse.json(responseData)

  } catch (error) {
    // Log to both logger and console for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorStack = error instanceof Error ? error.stack : undefined
    log.error('Error in missing callbacks API', error)
    console.error('[Missing Callbacks API] Error:', errorMessage)
    console.error('[Missing Callbacks API] Stack:', errorStack)
    console.error('[Missing Callbacks API] Full error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        message: errorMessage,
        // Include stack trace in development
        ...(process.env.NODE_ENV === 'development' && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    )
  }
}

