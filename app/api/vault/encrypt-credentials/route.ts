import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Simple encryption function (in production, use a proper encryption library)
function encryptCredentials(credentials: any, passphrase: string): string {
  const algorithm = 'aes-256-gcm'
  const key = crypto.scryptSync(passphrase, 'mpesa-vault-salt', 32)
  const iv = crypto.randomBytes(16)
  
  const cipher = crypto.createCipher(algorithm, key)
  cipher.setAAD(Buffer.from('mpesa-vault'))
  
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  const authTag = cipher.getAuthTag()
  
  // Combine IV, authTag, and encrypted data
  const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'hex')])
  return combined.toString('base64')
}

function decryptCredentials(encryptedData: string, passphrase: string): any {
  const algorithm = 'aes-256-gcm'
  const key = crypto.scryptSync(passphrase, 'mpesa-vault-salt', 32)
  
  const combined = Buffer.from(encryptedData, 'base64')
  const iv = combined.slice(0, 16)
  const authTag = combined.slice(16, 32)
  const encrypted = combined.slice(32)
  
  const decipher = crypto.createDecipher(algorithm, key)
  decipher.setAAD(Buffer.from('mpesa-vault'))
  decipher.setAuthTag(authTag)
  
  let decrypted = decipher.update(encrypted, null, 'utf8')
  decrypted += decipher.final('utf8')
  
  return JSON.parse(decrypted)
}

export async function POST(request: NextRequest) {
  try {
    const { partner_id, credentials, passphrase } = await request.json()
    
    if (!partner_id || !credentials || !passphrase) {
      return NextResponse.json({ 
        error: 'Missing required fields: partner_id, credentials, passphrase' 
      }, { status: 400 })
    }

    // Validate credentials structure
    const requiredFields = ['consumer_key', 'consumer_secret', 'initiator_password', 'security_credential', 'shortcode']
    for (const field of requiredFields) {
      if (!credentials[field]) {
        return NextResponse.json({ 
          error: `Missing required credential field: ${field}` 
        }, { status: 400 })
      }
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials, passphrase)
    
    // Hash the passphrase for storage
    const passphraseHash = crypto.createHash('sha256').update(passphrase).digest('hex')

    // Store encrypted credentials in database
    const { error } = await supabase
      .from('partners')
      .update({ 
        encrypted_credentials: encryptedCredentials,
        vault_passphrase_hash: passphraseHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', partner_id)

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to store encrypted credentials', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Credentials encrypted and stored successfully',
      partner_id,
      encrypted: true,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error encrypting credentials:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partner_id = searchParams.get('partner_id')
    const passphrase = searchParams.get('passphrase')
    
    if (!partner_id || !passphrase) {
      return NextResponse.json({ 
        error: 'Missing required parameters: partner_id, passphrase' 
      }, { status: 400 })
    }

    // Get encrypted credentials from database
    const { data: partner, error } = await supabase
      .from('partners')
      .select('encrypted_credentials, vault_passphrase_hash')
      .eq('id', partner_id)
      .single()

    if (error || !partner) {
      return NextResponse.json({ 
        error: 'Partner not found' 
      }, { status: 404 })
    }

    if (!partner.encrypted_credentials) {
      return NextResponse.json({ 
        error: 'No encrypted credentials found for this partner' 
      }, { status: 404 })
    }

    // Verify passphrase hash
    const providedHash = crypto.createHash('sha256').update(passphrase).digest('hex')
    if (partner.vault_passphrase_hash !== providedHash) {
      return NextResponse.json({ 
        error: 'Invalid passphrase' 
      }, { status: 401 })
    }

    // Decrypt credentials
    const decryptedCredentials = decryptCredentials(partner.encrypted_credentials, passphrase)

    return NextResponse.json({
      message: 'Credentials decrypted successfully',
      partner_id,
      credentials: decryptedCredentials,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error decrypting credentials:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
