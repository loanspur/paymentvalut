import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Removing plain text credentials...')

    // Get all partners to verify they have encrypted credentials
    const { data: partners, error: fetchError } = await supabase
      .from('partners')
      .select('id, name, encrypted_credentials, mpesa_consumer_key, mpesa_consumer_secret, mpesa_initiator_password, mpesa_security_credential')

    if (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch partners', 
        details: fetchError.message 
      }, { status: 500 })
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({ 
        message: 'No partners found' 
      })
    }

    const results = []

    // Remove plain text credentials for each partner
    for (const partner of partners) {
      try {
        // Check if partner has encrypted credentials
        if (!partner.encrypted_credentials) {
          results.push({
            partner_id: partner.id,
            partner_name: partner.name,
            status: 'skipped',
            reason: 'No encrypted credentials found'
          })
          continue
        }

        // Remove plain text credentials
        const { error: updateError } = await supabase
          .from('partners')
          .update({ 
            mpesa_consumer_key: null,
            mpesa_consumer_secret: null,
            mpesa_initiator_password: null,
            mpesa_security_credential: null,
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
            plaintext_removed: true
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

    // Count successful removals
    const successCount = results.filter(r => r.status === 'success').length
    const skippedCount = results.filter(r => r.status === 'skipped').length
    const failureCount = results.filter(r => r.status === 'failed').length

    return NextResponse.json({
      message: 'Plain text credential removal completed',
      summary: {
        total: partners.length,
        successful: successCount,
        skipped: skippedCount,
        failed: failureCount
      },
      results,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error removing plain text credentials:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
