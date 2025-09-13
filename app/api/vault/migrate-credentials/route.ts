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

// Encryption function
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

export async function POST(request: NextRequest) {
  try {
    const { passphrase } = await request.json()
    
    if (!passphrase) {
      return NextResponse.json({ 
        error: 'Missing required field: passphrase' 
      }, { status: 400 })
    }

    console.log('🔄 Starting credential migration to vault...')

    // Get all partners with plain text credentials
    const { data: partners, error: fetchError } = await supabase
      .from('partners')
      .select('id, name, mpesa_consumer_key, mpesa_consumer_secret, mpesa_initiator_password, mpesa_security_credential, mpesa_shortcode')
      .not('mpesa_consumer_key', 'is', null)

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch partners', 
        details: fetchError.message 
      }, { status: 500 })
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({ 
        message: 'No partners with plain text credentials found' 
      })
    }

    const results = []
    const passphraseHash = crypto.createHash('sha256').update(passphrase).digest('hex')

    // Migrate each partner's credentials
    for (const partner of partners) {
      try {
        // Prepare credentials for encryption
        const credentials = {
          consumer_key: partner.mpesa_consumer_key,
          consumer_secret: partner.mpesa_consumer_secret,
          initiator_password: partner.mpesa_initiator_password,
          security_credential: partner.mpesa_security_credential,
          shortcode: partner.mpesa_shortcode
        }

        // Encrypt credentials
        const encryptedCredentials = encryptCredentials(credentials, passphrase)

        // Update partner with encrypted credentials
        const { error: updateError } = await supabase
          .from('partners')
          .update({ 
            encrypted_credentials: encryptedCredentials,
            vault_passphrase_hash: passphraseHash,
            updated_at: new Date().toISOString()
          })
          .eq('id', partner.id)

        if (updateError) {
          results.push({
            partner_id: partner.id,
            partner_name: partner.name,
            status: 'failed',
            error: updateError.message
          })
        } else {
          results.push({
            partner_id: partner.id,
            partner_name: partner.name,
            status: 'success',
            encrypted: true
          })
        }

      } catch (error) {
        results.push({
          partner_id: partner.id,
          partner_name: partner.name,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Count successful migrations
    const successCount = results.filter(r => r.status === 'success').length
    const failureCount = results.filter(r => r.status === 'failed').length

    return NextResponse.json({
      message: 'Credential migration completed',
      summary: {
        total: partners.length,
        successful: successCount,
        failed: failureCount
      },
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error migrating credentials:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
