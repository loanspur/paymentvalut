import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const { 
      amount, 
      b2c_shortcode_id, 
      b2c_shortcode, 
      b2c_shortcode_name, 
      partner_id // For super_admin to specify which partner
    } = await request.json()

    if (!amount || amount < 1) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // Get the current user's role and partner first (with full details for later use)
    let currentUserData: any = null
    try {
      const { data, error: userError } = await supabase
        .from('users')
        .select('id, email, phone_number, first_name, last_name, partner_id, role, is_active')
        .eq('id', payload.userId)
        .single()

      if (userError) {
        // If user not found in database, return detailed error
        if (userError.code === 'PGRST116') {
          return NextResponse.json(
            { 
              success: false, 
              error: 'User account not found in database. Please contact your administrator.',
              details: `User ID ${payload.userId} does not exist`
            },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to fetch user data',
            details: userError.message || 'Database error'
          },
          { status: 500 }
        )
      }

      if (!data) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'User account not found',
            details: `No user data returned for ID ${payload.userId}`
          },
          { status: 404 }
        )
      }

      currentUserData = data

      if (!currentUserData.is_active) {
        return NextResponse.json(
          { success: false, error: 'User account is inactive' },
          { status: 403 }
        )
      }
    } catch (userFetchError: any) {
      console.error('Error fetching user:', userFetchError?.message || 'Unknown error')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch user data',
          details: userFetchError?.message || 'Unexpected error occurred while fetching user'
        },
        { status: 500 }
      )
    }

    // Ensure currentUserData is available (should never be null at this point, but safety check)
    if (!currentUserData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'User data not available',
          details: 'Failed to retrieve user information'
        },
        { status: 500 }
      )
    }

    // Determine which partner to use
    let targetPartnerId: string | null = null
    
    if (currentUserData.role === 'super_admin') {
      // For super_admin, use provided partner_id
      if (!partner_id) {
        return NextResponse.json(
          { success: false, error: 'Partner ID is required for super admin' },
          { status: 400 }
        )
      }
      targetPartnerId = partner_id
    } else {
      // For regular users (including partner_admin), use their assigned partner_id
      if (!currentUserData.partner_id) {
        return NextResponse.json(
          { success: false, error: 'No partner assigned to your account. Please contact your administrator to assign a partner.' },
          { status: 400 }
        )
      }
      targetPartnerId = currentUserData.partner_id
      
      // If partner_id was provided but user is not super_admin, ignore it for security
      if (partner_id && partner_id !== currentUserData.partner_id) {
        // Silently use user's own partner_id for security
      }
    }

    // Validate B2C short code selection
    if (!b2c_shortcode_id && !b2c_shortcode) {
      return NextResponse.json(
        { success: false, error: 'B2C short code is required. Please ensure the partner has a shortcode configured in partner settings.' },
        { status: 400 }
      )
    }

    // If b2c_shortcode is provided, ensure we have a name (use partner name as fallback)
    let finalB2CShortCodeName = b2c_shortcode_name
    if (b2c_shortcode && (!finalB2CShortCodeName || finalB2CShortCodeName.trim().length < 2)) {
      // Try to get partner name as fallback
      const { data: partnerInfo } = await supabase
        .from('partners')
        .select('name')
        .eq('id', targetPartnerId)
        .single()
      
      if (partnerInfo?.name) {
        finalB2CShortCodeName = partnerInfo.name
      } else {
        return NextResponse.json(
          { success: false, error: 'Short code name is required when creating new short code' },
          { status: 400 }
        )
      }
    }

    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id')
      .eq('id', targetPartnerId)
      .single()

    if (partnersError || !partners) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Get wallet for the partner, create if it doesn't exist
    let { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partners.id)
      .single()

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('partner_wallets')
        .insert({
          partner_id: partners.id,
          current_balance: 0,
          currency: 'KES',
          low_balance_threshold: 1000,
          sms_notifications_enabled: true
        })
        .select()
        .single()

      if (createError || !newWallet) {
        console.error('Wallet creation error:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create wallet' },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet data' },
        { status: 500 }
      )
    }

    // Get partner charges for float purchase
    const { data: chargeConfig, error: chargeError } = await supabase
      .from('partner_charges_config')
      .select('*')
      .eq('partner_id', partners.id)
      .eq('charge_type', 'float_purchase')
      .eq('is_active', true)
      .single()

    // Calculate total cost including charges
    let totalCharges = 0
    if (chargeConfig && chargeConfig.is_automatic) {
      totalCharges = chargeConfig.charge_amount || 0
      
      // Apply percentage if specified
      if (chargeConfig.charge_percentage) {
        const percentageAmount = (amount * chargeConfig.charge_percentage) / 100
        totalCharges = Math.max(totalCharges, percentageAmount)
      }
      
      // Apply minimum and maximum limits
      if (chargeConfig.minimum_charge && totalCharges < chargeConfig.minimum_charge) {
        totalCharges = chargeConfig.minimum_charge
      }
      if (chargeConfig.maximum_charge && totalCharges > chargeConfig.maximum_charge) {
        totalCharges = chargeConfig.maximum_charge
      }
    }

    const totalCost = amount + totalCharges

    if (wallet.current_balance < totalCost) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient balance. Required: ${totalCost} KES, Available: ${wallet.current_balance} KES` 
        },
        { status: 400 }
      )
    }

    // Handle B2C short code - use the provided shortcode directly (no need to create in partner_shortcodes table)
    // We're using the partner's shortcode from the partners table, not from partner_shortcodes
    let finalB2CShortCodeId = b2c_shortcode_id || null
    let finalB2CShortCode = b2c_shortcode || null

    // Ensure we have a shortcode
    if (!finalB2CShortCode) {
      return NextResponse.json(
        { success: false, error: 'B2C shortcode is required' },
        { status: 400 }
      )
    }

    // Use the user data we already fetched above
    const currentUser = currentUserData

    // Check for email and phone - provide helpful error messages
    if (!currentUser.email) {
      return NextResponse.json(
        { success: false, error: 'Your account email is not set. Please contact your administrator to add an email address to your account.' },
        { status: 400 }
      )
    }

    if (!currentUser.phone_number) {
      return NextResponse.json(
        { success: false, error: 'Your account phone number is not set. Please contact your administrator to add a phone number to your account.' },
        { status: 400 }
      )
    }

    // Generate OTP reference
    const otpReference = `FLOAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Create wallet transaction record first
    const { data: walletTransaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        transaction_type: 'b2c_float_purchase',
        amount: -totalCost, // Negative amount (debit)
        currency: 'KES',
        status: 'otp_required',
        description: `B2C Float Purchase - ${amount} KES (Charges: ${totalCharges} KES)`,
        reference: otpReference,
        float_amount: amount,
        otp_reference: otpReference,
        metadata: {
          float_amount: amount,
          charges: totalCharges,
          total_cost: totalCost,
          charge_config_id: chargeConfig?.id,
          otp_required: true,
          otp_reference: otpReference,
          b2c_shortcode_id: finalB2CShortCodeId,
          b2c_shortcode: finalB2CShortCode
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating wallet transaction:', transactionError.message)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create transaction record',
          details: transactionError.message || 'Database error'
        },
        { status: 500 }
      )
    }

    // Use existing OTP generation API to create and send OTP
    let otpData: any = null
    try {
      const otpUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/otp/generate`
      
      // Format phone number to 254XXXXXXXXX format if needed
      let formattedPhone = currentUser.phone_number?.replace(/\D/g, '') || ''
      if (formattedPhone.startsWith('0')) {
        // Convert 0XXXXXXXXX to 254XXXXXXXXX
        formattedPhone = '254' + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith('254')) {
        // If it doesn't start with 254, assume it's missing country code
        if (formattedPhone.length === 9) {
          formattedPhone = '254' + formattedPhone
        }
      }

      const otpResponse = await fetch(otpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '' // Forward auth cookie
        },
        body: JSON.stringify({
          phone_number: formattedPhone,
          email_address: currentUser.email,
          purpose: 'float_purchase',
          amount: totalCost
        })
      })

      if (!otpResponse.ok) {
        const otpError = await otpResponse.json().catch(() => ({ error: 'Failed to parse error response' }))
        console.error('OTP generation failed:', otpError.error || 'Unknown error')
        
        // Clean up transaction if OTP generation fails
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', walletTransaction.id)

        return NextResponse.json(
          { success: false, error: otpError.error || 'Failed to generate OTP' },
          { status: 500 }
        )
      }

      otpData = await otpResponse.json()
      
      if (!otpData.success || !otpData.reference) {
        // Clean up transaction if OTP generation fails
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', walletTransaction.id)

        return NextResponse.json(
          { success: false, error: 'Failed to generate OTP' },
          { status: 500 }
        )
      }

      // Update OTP record with wallet transaction ID
      await supabase
        .from('otp_validations')
        .update({
          metadata: {
            wallet_transaction_id: walletTransaction.id,
            float_amount: amount,
            charges: totalCharges,
            total_cost: totalCost,
            b2c_shortcode_id: finalB2CShortCodeId,
            b2c_shortcode: finalB2CShortCode
          }
        })
        .eq('reference', otpData.reference)

      // Update wallet transaction with OTP reference
      await supabase
        .from('wallet_transactions')
        .update({
          otp_reference: otpData.reference,
          metadata: {
            ...walletTransaction.metadata,
            otp_reference: otpData.reference
          }
        })
        .eq('id', walletTransaction.id)

    } catch (otpError) {
      console.error('OTP generation exception:', otpError instanceof Error ? otpError.message : 'Unknown error')
      
      // Clean up transaction if OTP generation fails
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', walletTransaction.id)

      return NextResponse.json(
        { success: false, error: 'Failed to generate and send OTP. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Float purchase initiated. OTP sent for confirmation.',
      data: {
        wallet_transaction: {
          ...walletTransaction,
          otp_reference: otpData.reference
        },
        otp_reference: otpData.reference,
        total_cost: totalCost,
        float_amount: amount,
        charges: totalCharges,
        charge_config: chargeConfig ? {
          id: chargeConfig.id,
          name: chargeConfig.charge_name,
          amount: chargeConfig.charge_amount,
          percentage: chargeConfig.charge_percentage
        } : null,
        expires_at: otpData.expiresAt,
        smsSent: otpData.smsSent || false,
        emailSent: otpData.emailSent || false
      }
    })

  } catch (error: any) {
    console.error('Float purchase error:', error?.message || 'Unknown error')
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}