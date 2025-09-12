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
    console.log('🔍 Validating M-Pesa setup...')
    
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single()
    
    if (error || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }
    
    // Validation checks
    const validation = {
      credentials: {
        has_consumer_key: !!partner.mpesa_consumer_key,
        has_consumer_secret: !!partner.mpesa_consumer_secret,
        has_short_code: !!partner.mpesa_shortcode,
        has_initiator_name: !!partner.mpesa_initiator_name,
        has_initiator_password: !!partner.mpesa_initiator_password,
        environment: partner.mpesa_environment
      },
      issues: [],
      recommendations: []
    }
    
    // Check for common issues
    if (!partner.mpesa_consumer_key || partner.mpesa_consumer_key.includes('YOUR_')) {
      validation.issues.push('Consumer Key is missing or placeholder')
    }
    
    if (!partner.mpesa_consumer_secret || partner.mpesa_consumer_secret.includes('YOUR_')) {
      validation.issues.push('Consumer Secret is missing or placeholder')
    }
    
    if (!partner.mpesa_shortcode || partner.mpesa_shortcode.includes('YOUR_')) {
      validation.issues.push('Short Code is missing or placeholder')
    }
    
    if (!partner.mpesa_initiator_name || partner.mpesa_initiator_name.includes('YOUR_')) {
      validation.issues.push('Initiator Name is missing or placeholder')
    }
    
    if (!partner.mpesa_initiator_password || partner.mpesa_initiator_password.includes('YOUR_')) {
      validation.issues.push('Initiator Password is missing or placeholder')
    }
    
    // Check short code format
    if (partner.mpesa_shortcode && !/^\d{6,7}$/.test(partner.mpesa_shortcode)) {
      validation.issues.push('Short Code format appears incorrect (should be 6-7 digits)')
    }
    
    // Check environment
    if (partner.mpesa_environment !== 'production') {
      validation.issues.push('Environment is not set to production')
    }
    
    // Add recommendations
    if (validation.issues.length === 0) {
      validation.recommendations.push('All credentials appear to be configured correctly')
      validation.recommendations.push('Verify with Safaricom that the short code and initiator credentials are correct')
      validation.recommendations.push('Check if the M-Pesa business account is active and has sufficient funds')
      validation.recommendations.push('Verify the phone number format (should be 254XXXXXXXXX)')
    } else {
      validation.recommendations.push('Fix the issues listed above')
      validation.recommendations.push('Contact Safaricom to get the correct credentials')
    }
    
    const response = {
      message: 'M-Pesa setup validation completed',
      partner_name: partner.name,
      validation: validation,
      current_config: {
        short_code: partner.mpesa_shortcode,
        initiator_name: partner.mpesa_initiator_name,
        environment: partner.mpesa_environment,
        consumer_key_preview: partner.mpesa_consumer_key ? 
          partner.mpesa_consumer_key.substring(0, 8) + '...' : 'Not set',
        consumer_secret_preview: partner.mpesa_consumer_secret ? 
          partner.mpesa_consumer_secret.substring(0, 8) + '...' : 'Not set'
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to validate M-Pesa setup',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
