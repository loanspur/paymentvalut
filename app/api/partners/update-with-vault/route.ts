import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { CredentialManager } from '../../../../supabase/functions/_shared/credential-manager.ts'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Update existing partner with vault credentials
export async function PUT(request: NextRequest) {
  try {
    const {
      partner_id,
      // Basic partner info
      name,
      mpesa_shortcode,
      mpesa_environment,
      mpesa_initiator_name,
      contact_email,
      contact_phone,
      description,
      // Security settings
      allowed_ips,
      ip_whitelist_enabled,
      // M-Pesa credentials (will be encrypted)
      mpesa_consumer_key,
      mpesa_consumer_secret,
      mpesa_passkey,
      mpesa_initiator_password,
      mpesa_security_credential,
      // Vault settings
      vault_passphrase,
      update_credentials = false
    } = await request.json()

    if (!partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Check if partner exists
    const { data: existingPartner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partner_id)
      .single()

    if (partnerError || !existingPartner) {
      return NextResponse.json(
        { error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // Update basic info if provided
    if (name) updateData.name = name
    if (mpesa_shortcode) updateData.mpesa_shortcode = mpesa_shortcode
    if (mpesa_environment) updateData.mpesa_environment = mpesa_environment
    if (mpesa_initiator_name) updateData.mpesa_initiator_name = mpesa_initiator_name
    if (contact_email) updateData.contact_email = contact_email
    if (contact_phone) updateData.contact_phone = contact_phone
    if (description) updateData.description = description

    // Update security settings
    if (allowed_ips !== undefined) updateData.allowed_ips = allowed_ips
    if (ip_whitelist_enabled !== undefined) updateData.ip_whitelist_enabled = ip_whitelist_enabled

    // Update M-Pesa configuration status
    if (update_credentials && mpesa_consumer_key && mpesa_consumer_secret && mpesa_initiator_password) {
      updateData.is_mpesa_configured = true
    }

    // Update partner record
    const { data: updatedPartner, error: updateError } = await supabase
      .from('partners')
      .update(updateData)
      .eq('id', partner_id)
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update partner:', updateError)
      return NextResponse.json(
        { error: 'Failed to update partner' },
        { status: 500 }
      )
    }

    // Update vault credentials if requested
    if (update_credentials && mpesa_consumer_key && mpesa_consumer_secret && mpesa_initiator_password) {
      try {
        await CredentialManager.storePartnerCredentials(
          partner_id,
          {
            consumer_key: mpesa_consumer_key,
            consumer_secret: mpesa_consumer_secret,
            initiator_password: mpesa_initiator_password,
            security_credential: mpesa_security_credential,
            shortcode: existingPartner.mpesa_shortcode || '',
            environment: mpesa_environment || existingPartner.mpesa_environment
          },
          vault_passphrase
        )
      } catch (vaultError) {
        console.error('Failed to update vault credentials:', vaultError)
        return NextResponse.json(
          { error: 'Failed to update M-Pesa credentials securely' },
          { status: 500 }
        )
      }
    }

    // Return success response (without sensitive data)
    return NextResponse.json({
      success: true,
      partner: {
        id: updatedPartner.id,
        name: updatedPartner.name,
        mpesa_shortcode: updatedPartner.mpesa_shortcode,
        mpesa_environment: updatedPartner.mpesa_environment,
        mpesa_initiator_name: updatedPartner.mpesa_initiator_name,
        contact_email: updatedPartner.contact_email,
        contact_phone: updatedPartner.contact_phone,
        description: updatedPartner.description,
        allowed_ips: updatedPartner.allowed_ips,
        ip_whitelist_enabled: updatedPartner.ip_whitelist_enabled,
        is_mpesa_configured: updatedPartner.is_mpesa_configured,
        is_active: updatedPartner.is_active,
        has_vault_credentials: false, // Simplified - vault status can be checked separately
        updated_at: updatedPartner.updated_at
      }
    })

  } catch (error) {
    console.error('Update partner error:', error)
    return NextResponse.json(
      { error: 'Failed to update partner' },
      { status: 500 }
    )
  }
}
