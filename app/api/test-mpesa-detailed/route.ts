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
    console.log('🔍 Testing M-Pesa API with detailed logging...')
    
    // Get Kulman's credentials
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_environment, mpesa_initiator_name, mpesa_initiator_password')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single()
    
    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }
    
    const consumerKey = partner.mpesa_consumer_key
    const consumerSecret = partner.mpesa_consumer_secret
    const shortCode = partner.mpesa_shortcode
    const initiatorPassword = partner.mpesa_initiator_password
    const environment = partner.mpesa_environment || 'production'
    
    // Get access token
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'
    
    console.log('Getting access token from:', `${baseUrl}/oauth/v1/generate`)
    
    const tokenResponse = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
      }
    })
    
    const tokenData = await tokenResponse.json()
    console.log('Token response:', tokenData)
    
    if (!tokenData.access_token) {
      return NextResponse.json({
        error: 'Failed to get access token',
        token_response: tokenData,
        status: tokenResponse.status
      }, { status: 500 })
    }
    
    // Prepare B2C request
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const securityCredential = Buffer.from(`${shortCode}${initiatorPassword}${timestamp}`).toString('base64')
    
    const b2cRequest = {
      InitiatorName: partner.mpesa_initiator_name || "testapi",
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: 10,
      PartyA: shortCode,
      PartyB: "254727638940",
      Remarks: "Test disbursement",
      QueueTimeOutURL: "https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-timeout",
      ResultURL: "https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-result",
      Occasion: "TEST_DETAILED_CHECK"
    }
    
    console.log('B2C Request:', JSON.stringify(b2cRequest, null, 2))
    
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
    
    return NextResponse.json({
      message: 'M-Pesa API test completed',
      environment: environment,
      base_url: baseUrl,
      short_code: shortCode,
      initiator_name: partner.mpesa_initiator_name,
      has_initiator_password: !!initiatorPassword,
      timestamp: timestamp,
      security_credential_length: securityCredential.length,
      token_response: tokenData,
      b2c_request: b2cRequest,
      b2c_response_status: b2cResponse.status,
      b2c_response: b2cData
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to test M-Pesa API',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
