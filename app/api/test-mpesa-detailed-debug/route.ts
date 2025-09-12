import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Testing M-Pesa API with detailed debugging...')
    
    // Get Kulman partner
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({ 
        error: 'Failed to fetch Kulman partner', 
        details: partnerError 
      }, { status: 500 })
    }

    // Test M-Pesa access token generation
    const mpesaUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    const auth = Buffer.from(`${partner.mpesa_consumer_key}:${partner.mpesa_consumer_secret}`).toString('base64')
    
    console.log('🔑 Testing access token generation...')
    const tokenResponse = await fetch(mpesaUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      }
    })

    const tokenData = await tokenResponse.json()
    console.log('Token response:', tokenData)

    if (!tokenData.access_token) {
      return NextResponse.json({
        error: 'Failed to get access token',
        token_response: tokenData,
        partner_credentials: {
          consumer_key: partner.mpesa_consumer_key ? 'SET' : 'MISSING',
          consumer_secret: partner.mpesa_consumer_secret ? 'SET' : 'MISSING',
          shortcode: partner.mpesa_shortcode,
          initiator_name: partner.mpesa_initiator_name
        }
      })
    }

    // Test B2C API call
    const shortCode = partner.mpesa_shortcode
    const initiatorPassword = partner.mpesa_initiator_password
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    
    // Use the same SecurityCredential as in the working function
    const securityCredential = "cxTWGd+ZPS6KJQoXv225RkGgRetIxOlIvZCCTcN2DinhWlzG+nyo5gAGpw5Q/P/pMDlvPlwFUNepKR6FXhovMl9DkOKOVxDSIDCfbE+mNnwo6wFTuSKaC2SHHmA/fl9Z5iYf3e9APKGUeSQEs84REe+mlBmBi38XcqefhIVs5ULOOHCcXVZDpuq2oDf7yhYVU3NTBu3Osz8Tk9TJdJvEoB8Ozz+UL9137KSp+vi+16AU2Az4mkSEnsKcNzsjYOp0/ufxV9GbtaC2NSx8IEbRt6BbOtjdccYee+MptmbolkE++QkvcrwlgSi8BBEYpcuMZLLc8s4o5pB84HUwbPgTfA=="

    const b2cRequest = {
      InitiatorName: partner.mpesa_initiator_name || "testapi",
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: 1, // Small test amount
      PartyA: shortCode,
      PartyB: "254727638940",
      Remarks: "Test disbursement debug",
      QueueTimeOutURL: "https://paymentvalut-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/timeout",
      ResultURL: "https://paymentvalut-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/result",
      Occasion: "debug-test"
    }

    console.log('📡 Testing B2C API call...')
    const b2cResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cRequest)
    })

    const b2cData = await b2cResponse.json()
    console.log('B2C response:', b2cData)

    return NextResponse.json({
      message: 'M-Pesa API detailed test',
      access_token_status: tokenData.access_token ? 'SUCCESS' : 'FAILED',
      access_token_preview: tokenData.access_token ? tokenData.access_token.substring(0, 20) + '...' : 'MISSING',
      b2c_request: b2cRequest,
      b2c_response: b2cData,
      b2c_status_code: b2cResponse.status,
      partner_credentials: {
        consumer_key: partner.mpesa_consumer_key ? 'SET' : 'MISSING',
        consumer_secret: partner.mpesa_consumer_secret ? 'SET' : 'MISSING',
        shortcode: partner.mpesa_shortcode,
        initiator_name: partner.mpesa_initiator_name,
        initiator_password: partner.mpesa_initiator_password ? 'SET' : 'MISSING'
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error in M-Pesa detailed test:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
