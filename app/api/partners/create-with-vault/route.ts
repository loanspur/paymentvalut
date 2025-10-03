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

// Create new partner with vault credentials
export async function POST(request: NextRequest) {
  try {
    const {
      name,
      mpesa_shortcode,
      mpesa_environment = 'sandbox',
      mpesa_initiator_name,
      // M-Pesa credentials (will be encrypted)
      mpesa_consumer_key,
      mpesa_consumer_secret,
      mpesa_passkey,
      mpesa_initiator_password,
      mpesa_security_credential,
      // Optional fields
      contact_email,
      contact_phone,
      description
    } = await request.json()

    // Validate required fields
    if (!name || !mpesa_shortcode) {
      return NextResponse.json(
        { error: 'Name and M-Pesa shortcode are required' },
        { status: 400 }
      )
    }

    // Validate M-Pesa credentials
    if (!mpesa_consumer_key || !mpesa_consumer_secret || !mpesa_initiator_password) {
      return NextResponse.json(
        { error: 'M-Pesa consumer key, consumer secret, and initiator password are required' },
        { status: 400 }
      )
    }

    // Check if partner with same shortcode already exists
    const { data: existingPartner } = await supabase
      .from('partners')
      .select('id, name')
      .eq('mpesa_shortcode', mpesa_shortcode)
      .eq('is_active', true)
      .single()

    if (existingPartner) {
      return NextResponse.json(
        { error: 'Partner with this shortcode already exists' },
        { status: 400 }
      )
    }

    // Create the partner record (without credentials first)
    const { data: newPartner, error: partnerError } = await supabase
      .from('partners')
      .insert({
        name,
        mpesa_shortcode,
        mpesa_environment,
        mpesa_initiator_name: mpesa_initiator_name || process.env.DEFAULT_INITIATOR_NAME || 'default_initiator',
        contact_email,
        contact_phone,
        description,
        is_mpesa_configured: true,
        is_active: true
      })
      .select()
      .single()

    if (partnerError || !newPartner) {
      console.error('Failed to create partner:', partnerError)
      return NextResponse.json(
        { error: 'Failed to create partner' },
        { status: 500 }
      )
    }

    // Encrypt and store credentials in vault
    const vaultPassphrase = process.env.MPESA_VAULT_PASSPHRASE || 'mpesa-vault-passphrase-2025'
    
    try {
      await CredentialManager.storePartnerCredentials(
        newPartner.id,
        {
          consumer_key: mpesa_consumer_key,
          consumer_secret: mpesa_consumer_secret,
          initiator_password: mpesa_initiator_password,
          security_credential: mpesa_security_credential,
          shortcode: mpesa_shortcode,
          environment: mpesa_environment
        },
        vaultPassphrase
      )
    } catch (vaultError) {
      // If vault storage fails, delete the partner record
      await supabase
        .from('partners')
        .delete()
        .eq('id', newPartner.id)
      
      console.error('Failed to store credentials in vault:', vaultError)
      return NextResponse.json(
        { error: 'Failed to store M-Pesa credentials securely' },
        { status: 500 }
      )
    }

    // Return success response (without sensitive data)
    return NextResponse.json({
      success: true,
      partner: {
        id: newPartner.id,
        name: newPartner.name,
        mpesa_shortcode: newPartner.mpesa_shortcode,
        mpesa_environment: newPartner.mpesa_environment,
        mpesa_initiator_name: newPartner.mpesa_initiator_name,
        contact_email: newPartner.contact_email,
        contact_phone: newPartner.contact_phone,
        description: newPartner.description,
        is_mpesa_configured: newPartner.is_mpesa_configured,
        is_active: newPartner.is_active,
        created_at: newPartner.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create partner error:', error)
    return NextResponse.json(
      { error: 'Failed to create partner' },
      { status: 500 }
    )
  }
}


    // Check if partner with same shortcode already exists

    const { data: existingPartner } = await supabase

      .from('partners')

      .select('id, name')

      .eq('mpesa_shortcode', mpesa_shortcode)

      .eq('is_active', true)

      .single()



    if (existingPartner) {

      return NextResponse.json(

        { error: 'Partner with this shortcode already exists' },

        { status: 400 }

      )

    }



    // Create the partner record (without credentials first)

    const { data: newPartner, error: partnerError } = await supabase

      .from('partners')

      .insert({

        name,

        mpesa_shortcode,

        mpesa_environment,

        mpesa_initiator_name: mpesa_initiator_name || process.env.DEFAULT_INITIATOR_NAME || 'default_initiator',
        contact_email,

        contact_phone,

        description,

        is_mpesa_configured: true,

        is_active: true

      })

      .select()

      .single()



    if (partnerError || !newPartner) {

      console.error('Failed to create partner:', partnerError)

      return NextResponse.json(

        { error: 'Failed to create partner' },

        { status: 500 }

      )

    }



    // Encrypt and store credentials in vault

    const vaultPassphrase = process.env.MPESA_VAULT_PASSPHRASE || 'mpesa-vault-passphrase-2025'

    

    try {

      await CredentialManager.storePartnerCredentials(

        newPartner.id,

        {

          consumer_key: mpesa_consumer_key,

          consumer_secret: mpesa_consumer_secret,

          initiator_password: mpesa_initiator_password,

          security_credential: mpesa_security_credential,

          shortcode: mpesa_shortcode,

          environment: mpesa_environment

        },

        vaultPassphrase

      )

    } catch (vaultError) {

      // If vault storage fails, delete the partner record

      await supabase

        .from('partners')

        .delete()

        .eq('id', newPartner.id)

      

      console.error('Failed to store credentials in vault:', vaultError)

      return NextResponse.json(

        { error: 'Failed to store M-Pesa credentials securely' },

        { status: 500 }

      )

    }



    // Return success response (without sensitive data)

    return NextResponse.json({

      success: true,

      partner: {

        id: newPartner.id,

        name: newPartner.name,

        mpesa_shortcode: newPartner.mpesa_shortcode,

        mpesa_environment: newPartner.mpesa_environment,

        mpesa_initiator_name: newPartner.mpesa_initiator_name,

        contact_email: newPartner.contact_email,

        contact_phone: newPartner.contact_phone,

        description: newPartner.description,

        is_mpesa_configured: newPartner.is_mpesa_configured,

        is_active: newPartner.is_active,

        created_at: newPartner.created_at

      }

    }, { status: 201 })



  } catch (error) {

    console.error('Create partner error:', error)

    return NextResponse.json(

      { error: 'Failed to create partner' },

      { status: 500 }

    )

  }

}


