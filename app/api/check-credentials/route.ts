import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id') || '660e8400-e29b-41d4-a716-446655440001'

    // Get partner data from database
    const { data: partner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partnerId)
      .single()

    if (error || !partner) {
      return NextResponse.json({
        error: 'Partner not found',
        details: error?.message
      }, { status: 404 })
    }

    // Check what credentials are available
    const credentialStatus = {
      partner_id: partner.id,
      partner_name: partner.name,
      mpesa_shortcode: partner.mpesa_shortcode,
      mpesa_environment: partner.mpesa_environment,
      mpesa_initiator_name: partner.mpesa_initiator_name,
      is_mpesa_configured: partner.is_mpesa_configured,
      
      // Check database credentials
      has_consumer_key: !!partner.consumer_key,
      has_consumer_secret: !!partner.consumer_secret,
      has_initiator_password: !!partner.initiator_password,
      has_security_credential: !!partner.security_credential,
      security_credential_length: partner.security_credential ? partner.security_credential.length : 0,
      security_credential_preview: partner.security_credential ? partner.security_credential.substring(0, 20) + '...' : 'null',
      
      // Check vault credentials
      has_encrypted_credentials: !!partner.encrypted_credentials,
      encrypted_credentials_length: partner.encrypted_credentials ? partner.encrypted_credentials.length : 0,
      
      // Check API key
      has_api_key: !!partner.api_key,
      has_api_key_hash: !!partner.api_key_hash
    }

    return NextResponse.json({
      success: true,
      data: credentialStatus
    })

  } catch (error) {
    console.error('Error checking credentials:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
