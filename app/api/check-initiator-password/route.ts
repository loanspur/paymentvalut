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
    console.log('🔍 Checking initiator password configuration...')
    
    const { data: partner, error } = await supabase
      .from('partners')
      .select('mpesa_initiator_name, mpesa_initiator_password, mpesa_shortcode')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single()
    
    if (error || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }
    
    const response = {
      initiator_name: partner.mpesa_initiator_name,
      short_code: partner.mpesa_shortcode,
      has_initiator_password: !!partner.mpesa_initiator_password,
      initiator_password_length: partner.mpesa_initiator_password ? partner.mpesa_initiator_password.length : 0,
      initiator_password_preview: partner.mpesa_initiator_password ? 
        partner.mpesa_initiator_password.substring(0, 4) + '...' + partner.mpesa_initiator_password.substring(partner.mpesa_initiator_password.length - 4) : 
        null,
      is_placeholder: partner.mpesa_initiator_password ? 
        partner.mpesa_initiator_password.includes('YOUR_') || 
        partner.mpesa_initiator_password.includes('PLACEHOLDER') ||
        partner.mpesa_initiator_password.includes('ACTUAL') : 
        false
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to check initiator password',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
