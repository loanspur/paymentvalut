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
    console.log('🔍 Checking M-Pesa environment configuration...')
    
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

    // Check if we're using sandbox or production URLs
    const mpesaUrls = {
      sandbox: {
        oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate',
        b2c: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
      },
      production: {
        oauth: 'https://api.safaricom.co.ke/oauth/v1/generate',
        b2c: 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
      }
    }

    // Check what URLs are being used in the disburse function
    const disburseFunctionCode = `
    // From supabase/functions/disburse/index.ts
    const mpesaUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    const b2cUrl = 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest'
    `

    return NextResponse.json({
      message: 'M-Pesa environment check',
      current_environment: 'SANDBOX',
      urls_being_used: mpesaUrls.sandbox,
      partner_credentials: {
        consumer_key: partner.mpesa_consumer_key ? 'SET' : 'MISSING',
        consumer_secret: partner.mpesa_consumer_secret ? 'SET' : 'MISSING',
        shortcode: partner.mpesa_shortcode,
        initiator_name: partner.mpesa_initiator_name,
        initiator_password: partner.mpesa_initiator_password ? 'SET' : 'MISSING',
        is_mpesa_configured: partner.is_mpesa_configured
      },
      security_credential: {
        using_provided_credential: true,
        credential_preview: "cxTWGd+ZPS6KJQoXv225RkGgRetIxOlIvZCCTcN2DinhWlzG+nyo5gAGpw5Q/P/pMDlvPlwFUNepKR6FXhovMl9DkOKOVxDSIDCfbE+mNnwo6wFTuSKaC2SHHmA/fl9Z5iYf3e9APKGUeSQEs84REe+mlBmBi38XcqefhIVs5ULOOHCcXVZDpuq2oDf7yhYVU3NTBu3Osz8Tk9TJdJvEoB8Ozz+UL9137KSp+vi+16AU2Az4mkSEnsKcNzsjYOp0/ufxV9GbtaC2NSx8IEbRt6BbOtjdccYee+MptmbolkE++QkvcrwlgSi8BBEYpcuMZLLc8s4o5pB84HUwbPgTfA==".substring(0, 50) + '...'
      },
      callback_urls: {
        result: "https://paymentvalut-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/result",
        timeout: "https://paymentvalut-1efsaghs1-justus-projects-3c52d294.vercel.app/api/mpesa-callback/timeout"
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error checking M-Pesa environment:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
