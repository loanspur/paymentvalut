import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user's partner ID and role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !user) {
      console.error('Wallet balance - User not found:', { userId: payload.userId, error: userError })
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.is_active) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 })
    }

    // Determine which partner's wallet to query - SECURITY: Enforce partner isolation
    let partnerId: string | null = null
    
    if (user.role === 'super_admin') {
      // Super admin can query any partner via query param, but for balance endpoint, 
      // we'll use their own partner_id if available, or return an error
      const { searchParams } = new URL(request.url)
      const requestedPartnerId = searchParams.get('partner_id')
      partnerId = requestedPartnerId || user.partner_id || null
    } else {
      // All other users (including admin, partner_admin, etc.) can only access their own partner
      partnerId = user.partner_id
    }

    if (!partnerId) {
      console.error('Wallet balance - No partner assigned:', { 
        userId: user.id, 
        email: user.email, 
        role: user.role, 
        partner_id: user.partner_id 
      })
      return NextResponse.json({ 
        success: false,
        error: 'No partner assigned',
        message: `User ${user.email} (${user.role}) does not have a partner assigned. Please contact your administrator to assign a partner (e.g., UMOJA) to your account.`
      }, { status: 400 })
    }

    // Get wallet data
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partnerId)
      .single()

    if (walletError && walletError.code !== 'PGRST116') {
      console.error('Wallet fetch error:', walletError)
      return NextResponse.json({ error: 'Failed to fetch wallet data' }, { status: 500 })
    }

    // Get B2C float balance
    const { data: b2cFloat, error: b2cError } = await supabase
      .from('b2c_float_balance')
      .select('*')
      .eq('partner_id', partnerId)
      .single()

    if (b2cError && b2cError.code !== 'PGRST116') {
      console.error('B2C float fetch error:', b2cError)
      return NextResponse.json({ error: 'Failed to fetch B2C float data' }, { status: 500 })
    }

    // Create wallet if it doesn't exist
    let walletData = wallet
    if (!wallet) {
      const { data: newWallet, error: createError } = await supabase
        .from('partner_wallets')
        .insert({
          partner_id: partnerId,
          current_balance: 0,
          currency: 'KES',
          low_balance_threshold: 1000,
          sms_notifications_enabled: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Wallet creation error:', createError)
        return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
      }

      walletData = newWallet
    }

    // Create B2C float balance if it doesn't exist
    let b2cFloatData = b2cFloat
    if (!b2cFloat) {
      const { data: newB2cFloat, error: createB2cError } = await supabase
        .from('b2c_float_balance')
        .insert({
          partner_id: partnerId,
          current_float_balance: 0,
          total_purchased: 0,
          total_used: 0
        })
        .select()
        .single()

      if (createB2cError) {
        console.error('B2C float creation error:', createB2cError)
        return NextResponse.json({ error: 'Failed to create B2C float balance' }, { status: 500 })
      }

      b2cFloatData = newB2cFloat
    }

    return NextResponse.json({
      success: true,
      wallet: {
        id: walletData.id,
        partnerId: walletData.partner_id,
        currentBalance: parseFloat(walletData.current_balance),
        currency: walletData.currency,
        lastTopupDate: walletData.last_topup_date,
        lastTopupAmount: walletData.last_topup_amount ? parseFloat(walletData.last_topup_amount) : undefined,
        lowBalanceThreshold: parseFloat(walletData.low_balance_threshold),
        smsNotificationsEnabled: walletData.sms_notifications_enabled,
        isLowBalance: parseFloat(walletData.current_balance) < parseFloat(walletData.low_balance_threshold)
      },
      b2cFloat: b2cFloatData ? {
        currentFloatBalance: parseFloat(b2cFloatData.current_float_balance),
        lastPurchaseDate: b2cFloatData.last_purchase_date,
        lastPurchaseAmount: b2cFloatData.last_purchase_amount ? parseFloat(b2cFloatData.last_purchase_amount) : undefined,
        totalPurchased: parseFloat(b2cFloatData.total_purchased),
        totalUsed: parseFloat(b2cFloatData.total_used)
      } : null
    })

  } catch (error) {
    console.error('Wallet balance error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

