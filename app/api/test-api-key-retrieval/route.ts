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
    console.log('🔍 Testing API key retrieval...')
    
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

    // Test the same logic as the UI
    const apiKey = partner.api_key
    
    if (!apiKey) {
      return NextResponse.json({
        error: 'API key missing from partner record',
        partner: {
          id: partner.id,
          name: partner.name,
          has_api_key: false
        }
      })
    }

    // Test the same logic as the Supabase function
    const encoder = new TextEncoder()
    const data = encoder.encode(apiKey)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    // Find partner by API key hash (same logic as Supabase function)
    const { data: partnerByHash, error: hashError } = await supabase
      .from('partners')
      .select('*')
      .eq('api_key_hash', hashHex)
      .eq('is_active', true)
      .single()

    return NextResponse.json({
      message: 'API key retrieval test',
      partner: {
        id: partner.id,
        name: partner.name,
        has_api_key: !!partner.api_key,
        api_key_preview: partner.api_key ? partner.api_key.substring(0, 20) + '...' : 'MISSING',
        has_api_key_hash: !!partner.api_key_hash,
        api_key_hash_preview: partner.api_key_hash ? partner.api_key_hash.substring(0, 20) + '...' : 'MISSING',
        is_active: partner.is_active
      },
      hash_calculation: {
        api_key: apiKey,
        calculated_hash: hashHex,
        stored_hash: partner.api_key_hash,
        hashes_match: hashHex === partner.api_key_hash
      },
      hash_lookup_result: {
        found_by_hash: !!partnerByHash,
        error: hashError,
        partner_found: partnerByHash ? {
          id: partnerByHash.id,
          name: partnerByHash.name
        } : null
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error testing API key retrieval:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
