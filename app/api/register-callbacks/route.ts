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
    console.log('🔧 Registering B2C callback URLs with Safaricom...')
    
    // Get partner credentials
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_environment')
      .eq('is_mpesa_configured', true)
      .eq('is_active', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({
        error: 'No configured partner found',
        details: partnerError?.message
      }, { status: 400 })
    }

    const environment = partner.mpesa_environment || 'sandbox'
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    // Get access token
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
        details: tokenData
      }, { status: 500 })
    }

    // Prepare callback URLs
    const validationUrl = `https://paymentvalut-ju.vercel.app/api/mpesa-callback/validation`
    const confirmationUrl = `https://paymentvalut-ju.vercel.app/api/mpesa-callback/result`

    // Register callback URLs with Safaricom
    const registerUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke/mpesa/c2b/v2/registerurl'
      : 'https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl'

    const registerData = {
      ShortCode: partner.mpesa_shortcode,
      ResponseType: 'Completed',
      ConfirmationURL: confirmationUrl,
      ValidationURL: validationUrl
    }

    console.log('📡 Registering callbacks with Safaricom:', {
      url: registerUrl,
      shortcode: partner.mpesa_shortcode,
      validation_url: validationUrl,
      confirmation_url: confirmationUrl
    })

    const registerResponse = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    })

    const registerResult = await registerResponse.json()

    console.log('📊 Safaricom registration response:', registerResult)

    return NextResponse.json({
      message: 'Callback registration completed',
      environment: environment,
      shortcode: partner.mpesa_shortcode,
      validation_url: validationUrl,
      confirmation_url: confirmationUrl,
      registration_response: registerResult,
      success: registerResponse.ok
    })

  } catch (error) {
    console.error('❌ Callback registration failed:', error)
    return NextResponse.json({
      error: 'Callback registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      message: 'B2C Callback Registration Tool',
      instructions: {
        step1: 'Get access token from Safaricom OAuth',
        step2: 'Register validation and confirmation URLs',
        step3: 'Handle callbacks for real-time reconciliation',
        endpoints: {
          validation: 'https://paymentvalut-ju.vercel.app/api/mpesa-callback/validation',
          confirmation: 'https://paymentvalut-ju.vercel.app/api/mpesa-callback/result'
        }
      }
    })
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get instructions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
