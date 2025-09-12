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
    console.log('🔍 Verifying Kulman API key hash...')
    
    // Get Kulman partner record
    const { data: kulmanPartner, error } = await supabase
      .from('partners')
      .select('*')
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .single()

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch Kulman partner', 
        details: error 
      }, { status: 500 })
    }

    if (!kulmanPartner) {
      return NextResponse.json({ 
        error: 'Kulman partner not found' 
      }, { status: 404 })
    }

    // Check API key and hash status
    const apiKeyStatus = {
      has_api_key: !!kulmanPartner.api_key,
      api_key_length: kulmanPartner.api_key ? kulmanPartner.api_key.length : 0,
      api_key_preview: kulmanPartner.api_key ? kulmanPartner.api_key.substring(0, 20) + '...' : 'MISSING',
      has_api_key_hash: !!kulmanPartner.api_key_hash,
      api_key_hash_preview: kulmanPartner.api_key_hash ? kulmanPartner.api_key_hash.substring(0, 20) + '...' : 'MISSING',
      is_mpesa_configured: kulmanPartner.is_mpesa_configured,
      is_active: kulmanPartner.is_active
    }

    return NextResponse.json({
      message: 'Kulman API key hash verification',
      partner: {
        id: kulmanPartner.id,
        name: kulmanPartner.name,
        ...apiKeyStatus
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error verifying Kulman API key hash:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
