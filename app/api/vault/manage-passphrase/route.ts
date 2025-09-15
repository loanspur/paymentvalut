import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Vault Passphrase Manager
class VaultPassphraseManager {
  // Get the global vault passphrase (shared across all partners)
  static getGlobalPassphrase(): string {
    return process.env.MPESA_VAULT_PASSPHRASE || 'mpesa-vault-passphrase-2025'
  }

  // Generate a unique passphrase for a specific partner
  static generatePartnerPassphrase(partnerId: string): string {
    const basePassphrase = this.getGlobalPassphrase()
    return `${basePassphrase}-${partnerId.slice(-8)}`
  }

  // Hash a passphrase
  static async hashPassphrase(passphrase: string): Promise<string> {
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(passphrase))
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  // Update partner's vault passphrase
  static async updatePartnerPassphrase(partnerId: string, newPassphrase?: string): Promise<void> {
    const passphrase = newPassphrase || this.generatePartnerPassphrase(partnerId)
    const passphraseHash = await this.hashPassphrase(passphrase)
    
    const { error } = await supabase
      .from('partners')
      .update({
        vault_passphrase_hash: passphraseHash
      })
      .eq('id', partnerId)
    
    if (error) {
      throw new Error(`Failed to update passphrase: ${error.message}`)
    }
  }
}

// Get vault passphrase info for a partner
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    if (!partnerId) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Get partner's vault status
    const { data: partner, error } = await supabase
      .from('partners')
      .select('id, name, vault_passphrase_hash, encrypted_credentials')
      .eq('id', partnerId)
      .single()

    if (error || !partner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        has_vault_credentials: !!partner.encrypted_credentials,
        has_passphrase_hash: !!partner.vault_passphrase_hash,
        uses_global_passphrase: !partner.vault_passphrase_hash
      }
    })

  } catch (error) {
    console.error('Get passphrase info error:', error)
    return NextResponse.json(
      { error: 'Failed to get passphrase info' },
      { status: 500 }
    )
  }
}

// Update vault passphrase for a partner
export async function POST(request: NextRequest) {
  try {
    const { partner_id, new_passphrase } = await request.json()

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    await VaultPassphraseManager.updatePartnerPassphrase(partner_id, new_passphrase)

    return NextResponse.json({
      success: true,
      message: 'Passphrase updated successfully'
    })

  } catch (error) {
    console.error('Update passphrase error:', error)
    return NextResponse.json(
      { error: 'Failed to update passphrase' },
      { status: 500 }
    )
  }
}
