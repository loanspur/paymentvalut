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
    console.log('🔍 Testing M-Pesa balance API directly...')

    const kulmanId = '550e8400-e29b-41d4-a716-446655440000'

    // Get Kulman partner details
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', kulmanId)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({ 
        error: 'Failed to fetch Kulman partner', 
        details: partnerError 
      }, { status: 500 })
    }

    console.log('📋 Partner details:', {
      name: partner.name,
      shortcode: partner.mpesa_shortcode,
      environment: partner.mpesa_environment,
      has_credentials: !!(partner.mpesa_consumer_key && partner.mpesa_consumer_secret)
    })

    // Call the Supabase Edge Function to check balance
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/balance-monitor`
    
    console.log('🔄 Calling balance-monitor Edge Function...')
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        partner_id: kulmanId,
        test_mode: true
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Balance monitor error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'Balance monitor failed', 
        status: response.status,
        details: errorText
      }, { status: 500 })
    }

    const balanceData = await response.json()
    console.log('✅ Balance monitor response:', balanceData)
    
    return NextResponse.json({
      message: 'M-Pesa balance API test completed',
      partner: {
        id: partner.id,
        name: partner.name,
        shortcode: partner.mpesa_shortcode,
        environment: partner.mpesa_environment
      },
      balance_response: balanceData,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error testing M-Pesa balance API:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
