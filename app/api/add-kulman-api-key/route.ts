import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// Generate API key using crypto web API

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🔑 Adding API key for Kulman partner...')
    
    // Generate a secure API key using crypto web API
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    const apiKey = 'kulman_' + Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
    
    console.log('Generated API key:', apiKey.substring(0, 20) + '...')
    
    // Update Kulman partner with the API key
    const { data: updatedPartner, error } = await supabase
      .from('partners')
      .update({ 
        api_key: apiKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', '550e8400-e29b-41d4-a716-446655440000')
      .select()
      .single()

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to update Kulman partner', 
        details: error 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'API key added successfully for Kulman',
      partner: {
        id: updatedPartner.id,
        name: updatedPartner.name,
        has_api_key: !!updatedPartner.api_key,
        api_key_preview: updatedPartner.api_key ? updatedPartner.api_key.substring(0, 20) + '...' : 'MISSING',
        is_mpesa_configured: updatedPartner.is_mpesa_configured
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error adding API key:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
