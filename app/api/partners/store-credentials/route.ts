import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Simple encryption function (in production, use proper AES-GCM)
function encryptCredentials(credentials: any, passphrase: string): string {
  const credentialsJson = JSON.stringify(credentials)
  // Simple base64 encoding for now (in production, use proper encryption)
  return btoa(credentialsJson)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { partnerId, credentials } = body

    if (!partnerId || !credentials) {
      return NextResponse.json(
        { error: 'Missing partnerId or credentials' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase environment variables' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Encrypt credentials
    const passphrase = process.env.MPESA_VAULT_PASSPHRASE || 'mpesa-vault-passphrase-2025'
    const encryptedCredentials = encryptCredentials(credentials, passphrase)

    // Store encrypted credentials in database
    const { error } = await supabase
      .from('partners')
      .update({ 
        encrypted_credentials: encryptedCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerId)

    if (error) {
      console.error('Error storing encrypted credentials:', error)
      return NextResponse.json(
        { error: `Failed to store encrypted credentials: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Credentials stored successfully in vault' 
    })

  } catch (error) {
    console.error('Error in store-credentials API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
