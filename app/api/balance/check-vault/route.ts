import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Check vault status for all partners
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Vault Check] Checking vault status for all partners...')

    // Get all active partners
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select(`
        id,
        name,
        short_code,
        is_active,
        is_mpesa_configured,
        encrypted_credentials,
        mpesa_consumer_key,
        mpesa_consumer_secret,
        mpesa_initiator_name,
        mpesa_initiator_password,
        security_credential,
        created_at,
        updated_at
      `)
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)

    if (partnersError) {
      console.error('❌ [Vault Check] Error fetching partners:', partnersError)
      return NextResponse.json(
        { error: 'Failed to fetch partners' },
        { status: 500 }
      )
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active partners found',
        partners: []
      })
    }

    console.log(`📊 [Vault Check] Found ${partners.length} active partners`)

    // Check vault status for each partner
    const vaultStatus = partners.map(partner => {
      const hasEncryptedCredentials = !!partner.encrypted_credentials
      const hasLegacyCredentials = !!(partner.mpesa_consumer_key && partner.mpesa_consumer_secret)
      const hasSecurityCredential = !!partner.security_credential
      const hasInitiatorPassword = !!partner.mpesa_initiator_password

      let status = 'unknown'
      let issues = []

      if (hasEncryptedCredentials) {
        status = 'vault_encrypted'
        // Try to check if encrypted credentials are valid
        try {
          const encryptedData = partner.encrypted_credentials
          if (encryptedData && encryptedData.length > 0) {
            status = 'vault_encrypted_valid'
          } else {
            status = 'vault_encrypted_empty'
            issues.push('Encrypted credentials field is empty')
          }
        } catch (error) {
          status = 'vault_encrypted_invalid'
          issues.push('Encrypted credentials appear to be corrupted')
        }
      } else if (hasLegacyCredentials) {
        status = 'legacy_credentials'
        issues.push('Using legacy credential storage (not encrypted)')
      } else {
        status = 'no_credentials'
        issues.push('No credentials found')
      }

      if (!hasSecurityCredential) {
        issues.push('Missing security_credential field')
      }

      if (!hasInitiatorPassword) {
        issues.push('Missing mpesa_initiator_password field')
      }

      return {
        id: partner.id,
        name: partner.name,
        short_code: partner.short_code,
        status,
        has_encrypted_credentials: hasEncryptedCredentials,
        has_legacy_credentials: hasLegacyCredentials,
        has_security_credential: hasSecurityCredential,
        has_initiator_password: hasInitiatorPassword,
        encrypted_credentials_length: partner.encrypted_credentials?.length || 0,
        issues,
        last_updated: partner.updated_at
      }
    })

    const summary = {
      total_partners: partners.length,
      vault_encrypted_valid: vaultStatus.filter(p => p.status === 'vault_encrypted_valid').length,
      vault_encrypted_empty: vaultStatus.filter(p => p.status === 'vault_encrypted_empty').length,
      vault_encrypted_invalid: vaultStatus.filter(p => p.status === 'vault_encrypted_invalid').length,
      legacy_credentials: vaultStatus.filter(p => p.status === 'legacy_credentials').length,
      no_credentials: vaultStatus.filter(p => p.status === 'no_credentials').length
    }

    console.log('📊 [Vault Check] Summary:', summary)

    return NextResponse.json({
      success: true,
      message: 'Vault status check completed',
      summary,
      partners: vaultStatus
    })

  } catch (error: any) {
    console.error('❌ [Vault Check] Error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
