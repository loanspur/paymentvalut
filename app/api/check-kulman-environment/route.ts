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
    console.log('🔍 Checking Kulman M-Pesa environment setting...')
    
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

    const environment = partner.mpesa_environment || 'sandbox'
    const baseUrl = environment === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke'

    return NextResponse.json({
      message: 'Kulman M-Pesa environment check',
      partner_id: partner.id,
      partner_name: partner.name,
      mpesa_environment: partner.mpesa_environment,
      effective_environment: environment,
      base_url: baseUrl,
      oauth_url: `${baseUrl}/oauth/v1/generate`,
      b2c_url: `${baseUrl}/mpesa/b2c/v1/paymentrequest`,
      recommendation: environment === 'sandbox' 
        ? 'Should be set to production for real transactions'
        : 'Correctly set to production',
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error checking Kulman environment:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
