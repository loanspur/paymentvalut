import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCipheriv, createDecipheriv, scryptSync, randomBytes } from 'crypto'

// Simple encryption function for Next.js (compatible with Deno version)
function encryptCredentials(credentials: any, passphrase: string): string {
  try {
    const algorithm = 'aes-256-cbc'
    const key = scryptSync(passphrase, 'salt', 32)
    const iv = randomBytes(16)
    
    const cipher = createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    // Return IV + encrypted data (same format as Deno version)
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt credentials')
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 [Store Credentials] Request received')
    const body = await request.json()
    const { partnerId, credentials } = body

    console.log('🔐 [Store Credentials] Request data:', {
      hasPartnerId: !!partnerId,
      hasCredentials: !!credentials,
      credentialKeys: credentials ? Object.keys(credentials) : []
    })

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
    console.log('🔐 [Store Credentials] Encrypting credentials...')
    const encryptedCredentials = encryptCredentials(credentials, passphrase)
    console.log('🔐 [Store Credentials] Credentials encrypted successfully')

    // Store encrypted credentials in database
    console.log('🔐 [Store Credentials] Updating database...')
    const { error } = await supabase
      .from('partners')
      .update({ 
        encrypted_credentials: encryptedCredentials,
        updated_at: new Date().toISOString()
      })
      .eq('id', partnerId)

    if (error) {
      console.error('Error storing encrypted credentials:', error)
      
      // Provide more specific error messages
      let errorMessage = error.message
      if (error.message.includes('encrypted_credentials')) {
        errorMessage = 'Database schema issue: encrypted_credentials column missing. Please contact administrator.'
      } else if (error.message.includes('Could not find')) {
        errorMessage = 'Database schema issue: Some columns are missing. Please contact administrator.'
      } else if (error.message.includes('permission denied')) {
        errorMessage = 'Permission denied: Check database permissions and RLS policies.'
      }
      
      return NextResponse.json(
        { error: `Failed to store encrypted credentials: ${errorMessage}` },
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
