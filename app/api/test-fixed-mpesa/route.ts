import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing Fixed M-Pesa B2C Implementation...')
    
    // Get partner credentials from database
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_environment, is_mpesa_configured, mpesa_initiator_name, mpesa_initiator_password')
      .eq('is_mpesa_configured', true)
      .eq('is_active', true)

    if (partnerError) {
      return NextResponse.json({
        error: 'Failed to fetch partners',
        details: partnerError.message
      }, { status: 500 })
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({
        error: 'No configured partner found',
        details: 'No active partners with M-Pesa configuration found'
      }, { status: 400 })
    }

    // Use the first configured partner (preferably Kulman if available)
    const partner = partners.find(p => p.name.toLowerCase().includes('kulman')) || partners[0]

    console.log('✅ Partner found:', {
      id: partner.id,
      name: partner.name,
      initiator_name: partner.mpesa_initiator_name,
      has_consumer_key: !!partner.mpesa_consumer_key,
      has_consumer_secret: !!partner.mpesa_consumer_secret,
      has_initiator_password: !!partner.mpesa_initiator_password,
      environment: partner.mpesa_environment
    })

    // Get access token using the same method as the working disburse function
    const environment = partner.mpesa_environment || 'sandbox'
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${btoa(`${partner.mpesa_consumer_key}:${partner.mpesa_consumer_secret}`)}`
      }
    })

    const tokenData = await tokenResponse.json()
    
    if (!tokenData.access_token) {
      return NextResponse.json({
        error: 'Failed to get access token',
        token_response: tokenData,
        status: tokenResponse.status
      }, { status: 500 })
    }

    console.log('✅ Access token obtained')

    // Generate SecurityCredential using the EXACT same method as the working disburse function
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const securityCredential = Buffer.from(`${partner.mpesa_shortcode}${partner.mpesa_initiator_password}${timestamp}`).toString('base64')

    console.log('✅ SecurityCredential generated using working method')

    // Prepare B2C request using the EXACT same structure as the working disburse function
    const b2cRequest = {
      InitiatorName: partner.mpesa_initiator_name || "testapi",
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: 1, // Small test amount
      PartyA: partner.mpesa_shortcode,
      PartyB: "254727638940", // Test phone number
      Remarks: "Fixed implementation test",
      QueueTimeOutURL: "https://mpesab2c-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/timeout",
      ResultURL: "https://mpesab2c-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/result",
      Occasion: "FIXED_TEST_" + Date.now()
    }

    console.log('📡 Sending B2C request to M-Pesa...')
    console.log('Request details:', {
      url: `${baseUrl}/mpesa/b2c/v1/paymentrequest`,
      shortcode: partner.mpesa_shortcode,
      initiator_name: partner.mpesa_initiator_name,
      amount: b2cRequest.Amount,
      phone: b2cRequest.PartyB,
      occasion: b2cRequest.Occasion
    })

    // Call M-Pesa B2C API
    const b2cResponse = await fetch(`${baseUrl}/mpesa/b2c/v1/paymentrequest`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cRequest)
    })

    const b2cData = await b2cResponse.json()

    console.log('📊 M-Pesa Response:', {
      status: b2cResponse.status,
      response_code: b2cData.ResponseCode,
      response_description: b2cData.ResponseDescription,
      conversation_id: b2cData.ConversationID
    })

    return NextResponse.json({
      message: 'Fixed M-Pesa B2C test completed',
      success: b2cData.ResponseCode === '0',
      environment: environment,
      base_url: baseUrl,
      partner: {
        shortcode: partner.mpesa_shortcode,
        initiator_name: partner.mpesa_initiator_name,
        has_initiator_password: !!partner.mpesa_initiator_password
      },
      request_details: {
        timestamp: timestamp,
        security_credential_length: securityCredential.length,
        amount: b2cRequest.Amount,
        phone: b2cRequest.PartyB,
        occasion: b2cRequest.Occasion
      },
      mpesa_response: {
        status: b2cResponse.status,
        response_code: b2cData.ResponseCode,
        response_description: b2cData.ResponseDescription,
        conversation_id: b2cData.ConversationID,
        originator_conversation_id: b2cData.OriginatorConversationID
      },
      callback_urls: {
        timeout: b2cRequest.QueueTimeOutURL,
        result: b2cRequest.ResultURL
      }
    })

  } catch (error) {
    console.error('❌ Test failed:', error)
    return NextResponse.json({
      error: 'Test failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}
