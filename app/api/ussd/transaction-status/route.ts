import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Helper function to validate API key
// Uses the same hashing method as the disbursement endpoint for consistency
async function validateApiKey(apiKey: string): Promise<{ isValid: boolean; partnerId?: string; partnerName?: string }> {
  try {
    // Trim whitespace from API key
    const trimmedApiKey = apiKey.trim()
    
    if (!trimmedApiKey) {
      console.log('API key validation failed: Empty API key provided')
      return { isValid: false }
    }
    
    // Hash the provided API key using SHA-256
    // Using Node.js crypto.createHash which produces the same result as Web Crypto API
    const hashedApiKey = crypto.createHash('sha256').update(trimmedApiKey, 'utf8').digest('hex').toLowerCase()
    
    // Log the hash for debugging (first 16 chars only for security)
    console.log('API key validation attempt', {
      apiKeyPrefix: trimmedApiKey.substring(0, 15),
      hashedApiKeyPrefix: hashedApiKey.substring(0, 16),
      fullHashLength: hashedApiKey.length
    })
    
    // Query directly with the hash (matches disbursement endpoint logic)
    // Use .single() instead of .maybeSingle() to match disbursement endpoint behavior
    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, name, api_key_hash')
      .eq('api_key_hash', hashedApiKey)
      .eq('is_active', true)
      .single()

    if (error) {
      // Check if it's a "not found" error (PGRST116)
      if (error.code === 'PGRST116') {
        console.log('API key validation failed: Partner not found with matching hash', {
          apiKeyLength: trimmedApiKey.length,
          apiKeyPrefix: trimmedApiKey.substring(0, 15),
          hashedApiKey: hashedApiKey,
          searchedHash: hashedApiKey,
          timestamp: new Date().toISOString()
        })
        
        // Try a fallback query to see if partner exists with different hash format
        const { data: allPartners } = await supabase
          .from('partners')
          .select('id, name, api_key_hash, is_active')
          .eq('is_active', true)
          .limit(10)
        
        console.log('Fallback check: Found active partners', {
          count: allPartners?.length || 0,
          partnerHashes: allPartners?.map(p => ({
            name: p.name,
            hashPrefix: p.api_key_hash?.substring(0, 16) || 'NULL',
            hashLength: p.api_key_hash?.length || 0
          })) || []
        })
      } else {
        console.error('API key validation database error:', {
          error: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        })
      }
      return { isValid: false }
    }

    if (partner) {
      // Double-check the hash matches (case-insensitive comparison)
      const storedHash = (partner.api_key_hash || '').toLowerCase()
      if (storedHash === hashedApiKey) {
        return { 
          isValid: true, 
          partnerId: partner.id, 
          partnerName: partner.name 
        }
      } else {
        console.log('API key validation failed: Hash mismatch', {
          apiKeyPrefix: trimmedApiKey.substring(0, 15),
          computedHash: hashedApiKey.substring(0, 16),
          storedHash: storedHash.substring(0, 16),
          timestamp: new Date().toISOString()
        })
      }
    }

    // If we get here, something unexpected happened
    console.log('API key validation failed: Unexpected condition', {
      apiKeyLength: trimmedApiKey.length,
      apiKeyPrefix: trimmedApiKey.substring(0, 15),
      hasPartner: !!partner,
      timestamp: new Date().toISOString()
    })
    return { isValid: false }
  } catch (error) {
    console.error('API key validation error:', error)
    return { isValid: false }
  }
}

// Enhanced transaction status endpoint for USSD team
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const apiKey = request.headers.get('x-api-key')
    
    // Validate API key
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'API key is required',
          error_code: 'AUTH_1001'
        },
        { status: 401 }
      )
    }

    const { isValid, partnerId, partnerName } = await validateApiKey(apiKey)
    if (!isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid API key',
          error_code: 'AUTH_1002'
        },
        { status: 401 }
      )
    }

    // Extract query parameters
    const conversationId = searchParams.get('conversation_id')
    const clientRequestId = searchParams.get('client_request_id')
    const msisdn = searchParams.get('msisdn')
    const transactionId = searchParams.get('transaction_id')
    const status = searchParams.get('status')
    const limitParamRaw = searchParams.get('limit')
    const limitAll = !limitParamRaw || limitParamRaw.toLowerCase() === 'all'
    const parsedLimit = limitAll ? undefined : parseInt(limitParamRaw, 10)
    const limit = (limitAll || parsedLimit === undefined || Number.isNaN(parsedLimit)) ? undefined : parsedLimit
    const parsedOffset = parseInt(searchParams.get('offset') || '0', 10)
    const offset = limitAll ? 0 : (Number.isNaN(parsedOffset) ? 0 : parsedOffset)

    // Build query conditions
    let query = supabase
      .from('disbursement_requests')
      .select(`
        id,
        origin,
        tenant_id,
        customer_id,
        client_request_id,
        msisdn,
        amount,
        status,
        conversation_id,
        originator_conversation_id,
        transaction_receipt,
        transaction_id,
        result_code,
        result_desc,
        partner_id,
        created_at,
        updated_at
      `)
      .eq('partner_id', partnerId)

    // Add filters based on provided parameters
    if (conversationId) {
      const conversationFilter = [
        `conversation_id.eq.${conversationId}`,
        `originator_conversation_id.eq.${conversationId}`,
        `transaction_receipt.eq.${conversationId}`,
        `transaction_id.eq.${conversationId}`
      ].join(',')
      query = query.or(conversationFilter)
    }
    if (clientRequestId) {
      query = query.eq('client_request_id', clientRequestId)
    }
    if (msisdn) {
      query = query.eq('msisdn', msisdn)
    }
    if (transactionId) {
      query = query.eq('id', transactionId)
    }
    if (status) {
      query = query.eq('status', status)
    }

    // Execute query with pagination
    const baseQuery = query.order('created_at', { ascending: false })
    let transactionsResult
    if (limitAll || limit === undefined) {
      transactionsResult = await baseQuery
    } else {
      transactionsResult = await baseQuery.range(offset, offset + limit - 1)
    }

    const { data: transactions, error: transactionError, count } = transactionsResult

    if (transactionError) {
      console.error('Error fetching transactions:', transactionError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch transactions',
          error_code: 'DB_1001'
        },
        { status: 500 }
      )
    }

    // Get transaction statistics for the partner
    const { data: stats, error: statsError } = await supabase
      .from('disbursement_requests')
      .select('status, amount, created_at')
      .eq('partner_id', partnerId)

    if (statsError) {
      console.error('Error fetching transaction stats:', statsError)
    }

    // Gather conversation IDs for enhanced M-Pesa lookup
    const conversationIdsToCheck = new Set<string>()
    transactions?.forEach(transaction => {
      if (transaction.conversation_id) {
        conversationIdsToCheck.add(transaction.conversation_id)
      }
    })
    if (conversationId) {
      conversationIdsToCheck.add(conversationId)
    }

    // Fetch related M-Pesa callback data
    const mpesaCallbackMap: Record<string, any[]> = {}
    if (conversationIdsToCheck.size > 0) {
      const conversationIdArray = Array.from(conversationIdsToCheck)
      const { data: callbackData, error: callbackError } = await supabase
        .from('mpesa_callbacks')
        .select(`
          id,
          partner_id,
          disbursement_id,
          callback_type,
          conversation_id,
          originator_conversation_id,
          transaction_id,
          receipt_number,
          transaction_amount,
          transaction_date,
          result_code,
          result_desc,
          raw_callback_data,
          created_at
        `)
        .in('conversation_id', conversationIdArray)
        .order('created_at', { ascending: false })

      if (callbackError) {
        console.error('Error fetching M-Pesa callback data:', callbackError)
      } else if (callbackData) {
        callbackData.forEach(callback => {
          const callbackPartnerId = callback.partner_id
          if (callbackPartnerId && callbackPartnerId !== partnerId) {
            return
          }

          const key = callback.conversation_id || 'unknown'
          if (!mpesaCallbackMap[key]) {
            mpesaCallbackMap[key] = []
          }
          mpesaCallbackMap[key].push({
            callback_id: callback.id,
            callback_type: callback.callback_type,
            conversation_id: callback.conversation_id,
            originator_conversation_id: callback.originator_conversation_id,
            disbursement_id: callback.disbursement_id,
            mpesa_transaction_id: callback.transaction_id || null,
            receipt_number: callback.receipt_number || null,
            transaction_amount: callback.transaction_amount !== null && callback.transaction_amount !== undefined
              ? Number(callback.transaction_amount)
              : null,
            transaction_date: callback.transaction_date || null,
            result_code: callback.result_code || null,
            result_description: callback.result_desc || null,
            raw_callback_data: callback.raw_callback_data || null,
            created_at: callback.created_at
          })
        })
      }

      // Fallback: try originator_conversation_id or transaction_id match when direct lookup fails
      if (
        conversationId &&
        (!mpesaCallbackMap[conversationId] || mpesaCallbackMap[conversationId].length === 0)
      ) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('mpesa_callbacks')
          .select(`
            id,
            partner_id,
            disbursement_id,
            callback_type,
            conversation_id,
            originator_conversation_id,
            transaction_id,
            receipt_number,
            transaction_amount,
            transaction_date,
            result_code,
            result_desc,
            raw_callback_data,
            created_at
          `)
          .eq('partner_id', partnerId)
          .or(`originator_conversation_id.eq.${conversationId},transaction_id.eq.${conversationId}`)
          .order('created_at', { ascending: false })

        if (fallbackError) {
          console.error('Error fetching fallback M-Pesa callback data:', fallbackError)
        } else if (fallbackData) {
          fallbackData.forEach(callback => {
            const key = callback.conversation_id || conversationId || 'unknown'
            if (!mpesaCallbackMap[key]) {
              mpesaCallbackMap[key] = []
            }
            mpesaCallbackMap[key].push({
              callback_id: callback.id,
              callback_type: callback.callback_type,
              conversation_id: callback.conversation_id || conversationId,
              originator_conversation_id: callback.originator_conversation_id,
              disbursement_id: callback.disbursement_id,
              mpesa_transaction_id: callback.transaction_id || null,
              receipt_number: callback.receipt_number || null,
              transaction_amount: callback.transaction_amount !== null && callback.transaction_amount !== undefined
                ? Number(callback.transaction_amount)
                : null,
              transaction_date: callback.transaction_date || null,
              result_code: callback.result_code || null,
              result_description: callback.result_desc || null,
              raw_callback_data: callback.raw_callback_data || null,
              created_at: callback.created_at
            })
          })
        }
      }
    }

    // Build transaction response with enriched M-Pesa details
    let finalTransactions = (transactions || []).map(transaction => {
      const mpesaDetails = mpesaCallbackMap[transaction.conversation_id || ''] || []
      const primaryMpesa = mpesaDetails[0]

      const amountNumber = transaction.amount !== null && transaction.amount !== undefined
        ? Number(transaction.amount)
        : null

      return {
        transaction_id: transaction.id,
        conversation_id: transaction.conversation_id,
        client_request_id: transaction.client_request_id,
        originator_conversation_id: transaction.originator_conversation_id,
        origin: transaction.origin,
        tenant_id: transaction.tenant_id,
        customer_id: transaction.customer_id,
        msisdn: transaction.msisdn,
        amount: amountNumber,
        status: transaction.status,
        result_code: transaction.result_code,
        result_description: transaction.result_desc,
        transaction_receipt: transaction.transaction_receipt,
        transaction_id_reference: transaction.transaction_id,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        partner_id: transaction.partner_id,
        mpesa_transaction_id: primaryMpesa?.mpesa_transaction_id || null,
        mpesa_receipt_number: primaryMpesa?.receipt_number || transaction.transaction_receipt || null,
        mpesa_result_code: primaryMpesa?.result_code || transaction.result_code || null,
        mpesa_result_description: primaryMpesa?.result_description || transaction.result_desc || null,
        mpesa_transaction_amount: primaryMpesa?.transaction_amount !== undefined && primaryMpesa?.transaction_amount !== null
          ? primaryMpesa.transaction_amount
          : amountNumber,
        mpesa_transaction_date: primaryMpesa?.transaction_date || null,
        mpesa_details: mpesaDetails
      }
    })

    // Fallback: If no disbursement records but M-Pesa callbacks exist for the conversation
    if (
      finalTransactions.length === 0 &&
      conversationId &&
      mpesaCallbackMap[conversationId] &&
      mpesaCallbackMap[conversationId].length > 0
    ) {
      finalTransactions = mpesaCallbackMap[conversationId].map(detail => {
        const inferredStatus = detail.result_code === '0'
          ? 'success'
          : detail.result_code === '1'
            ? 'pending'
            : 'failed'

        return {
          transaction_id: detail.disbursement_id || null,
          conversation_id: detail.conversation_id,
          originator_conversation_id: detail.originator_conversation_id,
          client_request_id: null,
          origin: 'mpesa_callback',
          tenant_id: null,
          customer_id: null,
          msisdn: null,
          amount: detail.transaction_amount !== null && detail.transaction_amount !== undefined
            ? Number(detail.transaction_amount)
            : null,
          status: inferredStatus,
          result_code: detail.result_code,
          result_description: detail.result_description,
          transaction_receipt: detail.receipt_number,
          transaction_id_reference: detail.mpesa_transaction_id,
          created_at: detail.created_at,
          updated_at: detail.created_at,
          partner_id: partnerId,
          mpesa_transaction_id: detail.mpesa_transaction_id,
          mpesa_receipt_number: detail.receipt_number,
          mpesa_result_code: detail.result_code,
          mpesa_result_description: detail.result_description,
          mpesa_transaction_amount: detail.transaction_amount !== null && detail.transaction_amount !== undefined
            ? Number(detail.transaction_amount)
            : null,
          mpesa_transaction_date: detail.transaction_date || null,
          mpesa_details: [detail],
          source: 'mpesa_callback'
        }
      })
    }

    // Calculate comprehensive statistics
    const totalTransactions = stats?.length || 0
    const successfulTransactions = stats?.filter(t => t.status === 'success').length || 0
    const pendingTransactions = stats?.filter(t => t.status === 'queued' || t.status === 'accepted').length || 0
    const failedTransactions = stats?.filter(t => t.status === 'failed').length || 0
    const totalAmount = stats?.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0
    const successfulAmount = stats?.filter(t => t.status === 'success').reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) || 0

    // Get recent activity (last 24 hours)
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const recentTransactions = stats?.filter(t => new Date(t.created_at) > new Date(last24Hours)).length || 0

    // Format response
    const response = {
      success: true,
      message: 'Transaction status retrieved successfully',
      partner: {
        id: partnerId,
        name: partnerName
      },
      query: {
        conversation_id: conversationId,
        client_request_id: clientRequestId,
        msisdn: msisdn,
        transaction_id: transactionId,
        status: status,
        limit: limitAll ? 'all' : (limit ?? 'all'),
        offset: offset
      },
      pagination: {
        total: count !== null && count !== undefined ? count : finalTransactions.length,
        limit: limitAll ? 'all' : (limit ?? finalTransactions.length),
        offset: offset,
        has_more: limitAll ? false : (count || finalTransactions.length) > offset + (limit ?? finalTransactions.length)
      },
      transactions: finalTransactions,
      statistics: {
        total_transactions: totalTransactions,
        successful_transactions: successfulTransactions,
        pending_transactions: pendingTransactions,
        failed_transactions: failedTransactions,
        success_rate: totalTransactions > 0 ? (successfulTransactions / totalTransactions * 100).toFixed(2) : '0.00',
        total_amount: totalAmount,
        successful_amount: successfulAmount,
        recent_activity_24h: recentTransactions
      },
      status_definitions: {
        queued: 'Transaction is queued for processing',
        accepted: 'Transaction accepted by M-Pesa, processing',
        success: 'Transaction completed successfully',
        failed: 'Transaction failed'
      },
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('USSD Transaction Status API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        error_code: 'SERVER_1001'
      },
      { status: 500 }
    )
  }
}

// POST method for bulk transaction status checking
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key')
    
    // Validate API key
    if (!apiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: 'API key is required',
          error_code: 'AUTH_1001'
        },
        { status: 401 }
      )
    }

    const { isValid, partnerId, partnerName } = await validateApiKey(apiKey)
    if (!isValid) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid API key',
          error_code: 'AUTH_1002'
        },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { transaction_ids, conversation_ids, client_request_ids } = body

    if (!transaction_ids && !conversation_ids && !client_request_ids) {
      return NextResponse.json(
        { 
          success: false,
          error: 'At least one of transaction_ids, conversation_ids, or client_request_ids is required',
          error_code: 'VALIDATION_1001'
        },
        { status: 400 }
      )
    }

    // Build query for bulk lookup
    let query = supabase
      .from('disbursement_requests')
      .select(`
        id,
        origin,
        tenant_id,
        customer_id,
        client_request_id,
        msisdn,
        amount,
        status,
        conversation_id,
        transaction_receipt,
        result_code,
        result_desc,
        partner_id,
        created_at,
        updated_at
      `)
      .eq('partner_id', partnerId)

    // Add OR conditions for bulk lookup
    const orConditions = []
    if (transaction_ids && transaction_ids.length > 0) {
      orConditions.push(`id.in.(${transaction_ids.join(',')})`)
    }
    if (conversation_ids && conversation_ids.length > 0) {
      orConditions.push(`conversation_id.in.(${conversation_ids.join(',')})`)
    }
    if (client_request_ids && client_request_ids.length > 0) {
      orConditions.push(`client_request_id.in.(${client_request_ids.join(',')})`)
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','))
    }

    const { data: transactions, error: transactionError } = await query
      .order('created_at', { ascending: false })

    if (transactionError) {
      console.error('Error fetching bulk transactions:', transactionError)
      return NextResponse.json(
        { 
          success: false,
          error: 'Failed to fetch transactions',
          error_code: 'DB_1001'
        },
        { status: 500 }
      )
    }

    const response = {
      success: true,
      message: 'Bulk transaction status retrieved successfully',
      partner: {
        id: partnerId,
        name: partnerName
      },
      query: {
        transaction_ids: transaction_ids || [],
        conversation_ids: conversation_ids || [],
        client_request_ids: client_request_ids || []
      },
      count: transactions?.length || 0,
      transactions: transactions?.map(transaction => ({
        transaction_id: transaction.id,
        conversation_id: transaction.conversation_id,
        client_request_id: transaction.client_request_id,
        origin: transaction.origin,
        tenant_id: transaction.tenant_id,
        customer_id: transaction.customer_id,
        msisdn: transaction.msisdn,
        amount: parseFloat(transaction.amount),
        status: transaction.status,
        result_code: transaction.result_code,
        result_description: transaction.result_desc,
        transaction_receipt: transaction.transaction_receipt,
        created_at: transaction.created_at,
        updated_at: transaction.updated_at,
        partner_id: transaction.partner_id
      })) || [],
      timestamp: new Date().toISOString()
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('USSD Bulk Transaction Status API error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error',
        error_code: 'SERVER_1001'
      },
      { status: 500 }
    )
  }
}
