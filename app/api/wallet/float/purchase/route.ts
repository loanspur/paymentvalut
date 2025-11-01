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

    const { amount } = await request.json()

    if (!amount || amount < 1) {
      return NextResponse.json(
        { success: false, error: 'Valid amount is required' },
        { status: 400 }
      )
    }

    // Get the current user's partner
    const { data: currentUserData, error: userError } = await supabase
      .from('users')
      .select('partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUserData?.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Partner not found for user' },
        { status: 404 }
      )
    }

    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id')
      .eq('id', currentUserData.partner_id)
      .single()

    if (partnersError || !partners) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Get wallet for the partner
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partners.id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet not found' },
        { status: 404 }
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

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
    const otpReference = `FLOAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Get current user for OTP delivery
    const { data: currentUser } = await supabase
      .from('users')
      .select('email, phone_number')
      .eq('id', payload.userId)
      .single()

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
          b2c_account: '4120187'
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating wallet transaction:', transactionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create transaction record' },
        { status: 500 }
      )
    }

    // Create OTP validation record with wallet_transaction_id
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_validations')
      .insert({
        reference: otpReference,
        partner_id: partners.id,
        phone_number: currentUser?.phone_number || '',
        email_address: currentUser?.email || '',
        otp_code: otpCode,
        purpose: 'float_purchase',
        amount: totalCost,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        metadata: {
          wallet_transaction_id: walletTransaction.id,
          float_amount: amount,
          charges: totalCharges,
          total_cost: totalCost
        }
      })
      .select()
      .single()

    if (otpError) {
      console.error('Error creating OTP record:', otpError)
      return NextResponse.json(
        { success: false, error: 'Failed to create OTP validation' },
        { status: 500 }
      )
    }

    // TODO: Send OTP via SMS and Email
    // For now, we'll just log it
    console.log('OTP Generated for Float Purchase:', {
      otp_code: otpCode,
      otp_reference: otpReference,
      amount: totalCost,
      expires_at: expiresAt,
      wallet_transaction_id: walletTransaction.id
    })

    return NextResponse.json({
      success: true,
      message: 'Float purchase initiated. OTP sent for confirmation.',
      data: {
        wallet_transaction: walletTransaction,
        otp_reference: otpReference,
        total_cost: totalCost,
        float_amount: amount,
        charges: totalCharges,
        charge_config: chargeConfig ? {
          id: chargeConfig.id,
          name: chargeConfig.charge_name,
          amount: chargeConfig.charge_amount,
          percentage: chargeConfig.charge_percentage
        } : null,
        expires_at: expiresAt.toISOString()
      }
    })

  } catch (error) {
    console.error('Float Purchase Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}