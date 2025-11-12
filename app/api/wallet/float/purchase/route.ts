import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'
import { generateAndSendOTP } from '../../../../../lib/otp-utils'

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
    // Also check JWT payload for role as fallback (in case database is stale)
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
      
      // Use JWT role as fallback if database role is missing (shouldn't happen, but safety check)
      if (!currentUserData.role && payload.role) {
        currentUserData.role = payload.role
      }

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
    
    // Normalize role (handle case sensitivity and whitespace)
    const userRole = (currentUserData.role || '').trim().toLowerCase()
    
    if (userRole === 'super_admin') {
      // For super_admin, use provided partner_id
      if (!partner_id) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Partner ID is required for super admin',
            details: 'Please select a partner from the dropdown before purchasing float'
          },
          { status: 400 }
        )
      }
      targetPartnerId = partner_id
    } else {
      // For regular users (including partner_admin), use their assigned partner_id
      if (!currentUserData.partner_id) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'No partner assigned to your account. Please contact your administrator to assign a partner.',
            details: `User role: ${userRole}, User ID: ${currentUserData.id}`
          },
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
      .select('id, name, mpesa_shortcode, short_code')
      .eq('id', targetPartnerId)
      .single()

    if (partnersError) {
      console.error('Error fetching partner:', partnersError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Partner not found',
          details: partnersError.message || partnersError.code || 'Database error'
        },
        { status: 404 }
      )
    }
    
    if (!partners) {
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
      .maybeSingle()

    if (walletError) {
      console.error('Error fetching wallet:', walletError)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch wallet data',
          details: walletError.message || walletError.code || 'Database error'
        },
        { status: 500 }
      )
    }

    if (!wallet) {
      // Wallet doesn't exist, create it
      const now = new Date().toISOString()
      const { data: newWallet, error: createError } = await supabase
        .from('partner_wallets')
        .insert({
          partner_id: partners.id,
          current_balance: 0,
          currency: 'KES',
          low_balance_threshold: 1000,
          sms_notifications_enabled: true,
          is_active: true,
          created_at: now,
          updated_at: now
        })
        .select()
        .single()

      if (createError) {
        console.error('Wallet creation error:', createError)
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to create wallet',
            details: createError.message || createError.code || 'Database error'
          },
          { status: 500 }
        )
      }
      
      if (!newWallet) {
        return NextResponse.json(
          { success: false, error: 'Failed to create wallet - no data returned' },
          { status: 500 }
        )
      }

      wallet = newWallet
    }

    // Get partner charges for float purchase
    // Use maybeSingle() to handle cases where no charge config exists (returns null instead of error)
    const { data: chargeConfig, error: chargeError } = await supabase
      .from('partner_charges_config')
      .select('*')
      .eq('partner_id', partners.id)
      .eq('charge_type', 'float_purchase')
      .eq('is_active', true)
      .maybeSingle()
    
    // Only log error if it's not a "not found" error (PGRST116)
    if (chargeError && chargeError.code !== 'PGRST116') {
      console.error('Error fetching charge config:', chargeError)
    }

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
    const otpReference = `FLOAT_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`

    // Create wallet transaction record first
    const now = new Date().toISOString()
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
        created_at: now,
        updated_at: now,
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
      console.error('Error creating wallet transaction:', {
        message: transactionError.message,
        code: transactionError.code,
        details: transactionError.details,
        hint: transactionError.hint
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create transaction record',
          details: transactionError.message || transactionError.code || 'Database error',
          hint: transactionError.hint || undefined
        },
        { status: 500 }
      )
    }

    if (!walletTransaction || !walletTransaction.id) {
      console.error('Transaction creation returned no data:', walletTransaction)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create transaction record - no data returned'
        },
        { status: 500 }
      )
    }

    // Generate and send OTP directly (no HTTP call - more reliable in production)
    let otpData: any = null
    try {
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

      console.log('Generating OTP directly:', { formattedPhone, email: currentUser.email, amount: totalCost })

      // Call OTP generation function directly (no HTTP call)
      const otpResult = await generateAndSendOTP({
        userId: payload.userId,
        partnerId: targetPartnerId!,
        phoneNumber: formattedPhone,
        emailAddress: currentUser.email,
        purpose: 'float_purchase',
        amount: totalCost
      })

      if (!otpResult.success || !otpResult.reference) {
        console.error('OTP generation failed:', otpResult)
        
        // Clean up transaction if OTP generation fails
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', walletTransaction.id)

        return NextResponse.json(
          { 
            success: false, 
            error: otpResult.error || 'Failed to generate OTP',
            details: otpResult.details || 'OTP generation returned invalid response'
          },
          { status: 500 }
        )
      }

      // Store OTP data for response
      otpData = {
        success: true,
        reference: otpResult.reference,
        expiresAt: otpResult.expiresAt,
        smsSent: otpResult.smsSent || false,
        emailSent: otpResult.emailSent || false
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
        .eq('reference', otpResult.reference)

      // Update wallet transaction with OTP reference
      await supabase
        .from('wallet_transactions')
        .update({
          otp_reference: otpResult.reference,
          metadata: {
            ...walletTransaction.metadata,
            otp_reference: otpResult.reference
          }
        })
        .eq('id', walletTransaction.id)

    } catch (otpError) {
      console.error('OTP generation exception:', {
        message: otpError instanceof Error ? otpError.message : 'Unknown error',
        stack: otpError instanceof Error ? otpError.stack : undefined,
        error: otpError
      })
      
      // Clean up transaction if OTP generation fails
      try {
        await supabase
          .from('wallet_transactions')
          .delete()
          .eq('id', walletTransaction.id)
      } catch (cleanupError) {
        console.error('Failed to cleanup transaction:', cleanupError)
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to generate and send OTP. Please try again.',
          details: otpError instanceof Error ? otpError.message : 'Unknown error occurred'
        },
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
    console.error('Float purchase error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred',
        code: error?.code || undefined
      },
      { status: 500 }
    )
  }
}