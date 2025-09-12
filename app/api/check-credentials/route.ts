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
    console.log('🔍 Checking Kulman Group Limited credentials...')
    
    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, name, mpesa_shortcode, mpesa_consumer_key, mpesa_consumer_secret, mpesa_passkey, mpesa_environment, mpesa_initiator_name, is_mpesa_configured')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }
    
    // Check if credentials are placeholders
    const hasPlaceholders = 
      partner.mpesa_consumer_key?.includes('YOUR_') ||
      partner.mpesa_consumer_key?.includes('PLACEHOLDER') ||
      partner.mpesa_consumer_secret?.includes('YOUR_') ||
      partner.mpesa_consumer_secret?.includes('PLACEHOLDER') ||
      partner.mpesa_passkey?.includes('YOUR_') ||
      partner.mpesa_passkey?.includes('PLACEHOLDER')
    
    // Check balance monitoring configuration
    const { data: balanceConfig, error: configError } = await supabase
      .from('balance_monitoring_config')
      .select('*')
      .eq('partner_id', '550e8400-e29b-41d4-a716-446655440000')
      .single()
    
    const response = {
      partner: {
        id: partner.id,
        name: partner.name,
        mpesa_shortcode: partner.mpesa_shortcode,
        mpesa_environment: partner.mpesa_environment,
        is_mpesa_configured: partner.is_mpesa_configured,
        consumer_key: partner.mpesa_consumer_key,
        consumer_secret: partner.mpesa_consumer_secret,
        passkey: partner.mpesa_passkey,
        initiator_name: partner.mpesa_initiator_name
      },
      analysis: {
        has_placeholders: hasPlaceholders,
        status: hasPlaceholders ? 'PLACEHOLDER_CREDENTIALS' : 'REAL_CREDENTIALS'
      },
      balance_monitoring: {
        configured: !configError && balanceConfig ? true : false,
        config: balanceConfig || null
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to check credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
