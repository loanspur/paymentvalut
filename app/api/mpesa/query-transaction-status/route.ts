import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-utils'
import { log } from '@/lib/logger'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Decrypt credentials from vault
 */
function decryptCredentials(encryptedData: string, passphrase: string): any {
  try {
    const algorithm = 'aes-256-gcm'
    const key = crypto.scryptSync(passphrase, 'mpesa-vault-salt', 32)
    
    const combined = Buffer.from(encryptedData, 'base64')
    const iv = combined.slice(0, 16)
    const authTag = combined.slice(16, 32)
    const encrypted = combined.slice(32)
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    decipher.setAAD(Buffer.from('mpesa-vault'))
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8')
    decrypted += decipher.final('utf8')
    
    return JSON.parse(decrypted)
  } catch (error) {
    log.error('Failed to decrypt credentials', error)
    throw new Error('Failed to decrypt credentials')
  }
}

/**
 * Get M-Pesa access token
 */
async function getMpesaAccessToken(consumerKey: string, consumerSecret: string, environment: string): Promise<string> {
  const baseUrl = environment === 'production' 
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
  
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
  
  const response = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`
    }
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to get access token: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  if (!data.access_token) {
    throw new Error('No access token received from M-Pesa')
  }

  return data.access_token
}

/**
 * Query M-Pesa transaction status
 */
async function queryTransactionStatus(
  accessToken: string,
  originatorConversationId: string,
  credentials: any,
  environment: string
): Promise<any> {
  const baseUrl = environment === 'production' 
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke'
  
  const callbackBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://eazzypay.online'
  
  const requestBody = {
    Initiator: credentials.initiator_name || 'default_initiator',
    SecurityCredential: credentials.security_credential,
    CommandID: 'TransactionStatusQuery',
    TransactionID: originatorConversationId, // Using Originator Conversation ID
    PartyA: credentials.shortcode,
    IdentifierType: '4',
    ResultURL: `${callbackBaseUrl}/api/mpesa-callback/transaction-status-result`,
    QueueTimeOutURL: `${callbackBaseUrl}/api/mpesa-callback/transaction-status-timeout`,
    Remarks: 'Transaction Status Query',
    Occasion: `StatusQuery_${Date.now()}`
  }

  const response = await fetch(`${baseUrl}/mpesa/transactionstatus/v1/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const responseText = await response.text()
  let responseData
  
  try {
    responseData = JSON.parse(responseText)
  } catch (error) {
    throw new Error(`Failed to parse response: ${responseText}`)
  }

  if (!response.ok) {
    throw new Error(`M-Pesa API error: ${response.status} - ${JSON.stringify(responseData)}`)
  }

  return responseData
}

/**
 * Get partner credentials from vault
 */
async function getPartnerCredentials(partnerId: string): Promise<any> {
  const vaultPassphrase = process.env.MPESA_VAULT_PASSPHRASE || 'mpesa-vault-passphrase-2025'
  
  // Get partner data
  const { data: partner, error } = await supabase
    .from('partners')
    .select('encrypted_credentials, consumer_key, consumer_secret, initiator_password, security_credential, mpesa_initiator_name, mpesa_shortcode, mpesa_environment')
    .eq('id', partnerId)
    .single()

  if (error || !partner) {
    throw new Error('Partner not found')
  }

  // Try to use encrypted credentials first
  if (partner.encrypted_credentials) {
    try {
      return decryptCredentials(partner.encrypted_credentials, vaultPassphrase)
    } catch (decryptError) {
      log.warn('Failed to decrypt vault credentials, using plain text', { error: decryptError })
      // Fall through to plain text
    }
  }

  // Fallback to plain text credentials
  if (partner.consumer_key && partner.consumer_secret && partner.initiator_password) {
    return {
      consumer_key: partner.consumer_key,
      consumer_secret: partner.consumer_secret,
      initiator_password: partner.initiator_password,
      security_credential: partner.security_credential || partner.initiator_password,
      initiator_name: partner.mpesa_initiator_name || 'default_initiator',
      shortcode: partner.mpesa_shortcode || '',
      environment: partner.mpesa_environment || 'sandbox'
    }
  }

  throw new Error('No valid credentials found for partner')
}

/**
 * POST - Query transaction status using Originator Conversation ID
 */
export async function POST(request: NextRequest) {
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

    // Get user's partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      log.error('Error fetching user for transaction status query', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Allow super_admin to query any partner, or users to query their own partner
    const body = await request.json()
    const { originator_conversation_id, partner_id } = body

    if (!originator_conversation_id) {
      return NextResponse.json(
        { error: 'originator_conversation_id is required' },
        { status: 400 }
      )
    }

    // Determine which partner to use
    let targetPartnerId: string
    if (user.role === 'super_admin' && partner_id) {
      targetPartnerId = partner_id
    } else if (user.partner_id) {
      targetPartnerId = user.partner_id
    } else {
      return NextResponse.json(
        { error: 'Partner access required' },
        { status: 403 }
      )
    }

    log.info('Querying transaction status', {
      originator_conversation_id,
      partner_id: targetPartnerId,
      user_id: userId
    })

    // Get partner credentials from vault
    const credentials = await getPartnerCredentials(targetPartnerId)
    const environment = credentials.environment || 'sandbox'

    // Get M-Pesa access token
    const accessToken = await getMpesaAccessToken(
      credentials.consumer_key,
      credentials.consumer_secret,
      environment
    )

    log.info('M-Pesa access token obtained', { environment })

    // Query transaction status
    const queryResult = await queryTransactionStatus(
      accessToken,
      originator_conversation_id,
      credentials,
      environment
    )

    log.info('Transaction status query initiated', {
      originator_conversation_id,
      conversation_id: queryResult.ConversationID,
      response_code: queryResult.ResponseCode
    })

    return NextResponse.json({
      success: true,
      message: 'Transaction status query initiated successfully',
      query: {
        originator_conversation_id,
        conversation_id: queryResult.ConversationID,
        originator_conversation_id_response: queryResult.OriginatorConversationID,
        response_code: queryResult.ResponseCode,
        response_description: queryResult.ResponseDescription
      },
      note: 'The actual transaction status will be sent to your callback URL. Check the callback endpoint for results.',
      callback_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://eazzypay.online'}/api/mpesa-callback/transaction-status-result`
    })

  } catch (error) {
    log.error('Error querying transaction status', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query transaction status',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * POST - Query multiple transaction statuses
 */
export async function PUT(request: NextRequest) {
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

    // Get user's partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      log.error('Error fetching user for batch transaction status query', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const { originator_conversation_ids, partner_id } = body

    if (!originator_conversation_ids || !Array.isArray(originator_conversation_ids) || originator_conversation_ids.length === 0) {
      return NextResponse.json(
        { error: 'originator_conversation_ids array is required' },
        { status: 400 }
      )
    }

    // Determine which partner to use
    let targetPartnerId: string
    if (user.role === 'super_admin' && partner_id) {
      targetPartnerId = partner_id
    } else if (user.partner_id) {
      targetPartnerId = user.partner_id
    } else {
      return NextResponse.json(
        { error: 'Partner access required' },
        { status: 403 }
      )
    }

    log.info('Batch querying transaction status', {
      count: originator_conversation_ids.length,
      partner_id: targetPartnerId,
      user_id: userId
    })

    // Get partner credentials from vault
    const credentials = await getPartnerCredentials(targetPartnerId)
    const environment = credentials.environment || 'sandbox'

    // Get M-Pesa access token (reuse for all queries)
    const accessToken = await getMpesaAccessToken(
      credentials.consumer_key,
      credentials.consumer_secret,
      environment
    )

    // Query each transaction status
    const results = []
    for (const originatorConversationId of originator_conversation_ids) {
      try {
        // Add delay between queries to avoid rate limiting
        if (results.length > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        }

        const queryResult = await queryTransactionStatus(
          accessToken,
          originatorConversationId,
          credentials,
          environment
        )

        results.push({
          originator_conversation_id: originatorConversationId,
          success: true,
          conversation_id: queryResult.ConversationID,
          response_code: queryResult.ResponseCode,
          response_description: queryResult.ResponseDescription
        })

        log.info('Transaction status query initiated', {
          originator_conversation_id: originatorConversationId,
          conversation_id: queryResult.ConversationID
        })
      } catch (error) {
        results.push({
          originator_conversation_id: originatorConversationId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })

        log.error('Failed to query transaction status', {
          originator_conversation_id: originatorConversationId,
          error
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Initiated queries for ${results.length} transactions`,
      results,
      note: 'The actual transaction statuses will be sent to your callback URL. Check the callback endpoint for results.',
      callback_url: `${process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://eazzypay.online'}/api/mpesa-callback/transaction-status-result`
    })

  } catch (error) {
    log.error('Error in batch transaction status query', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to query transaction statuses',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

