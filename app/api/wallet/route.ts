import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
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
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get current user from database to get partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // For super_admin or admin, allow query param to specify partner_id
    const { searchParams } = new URL(request.url)
    const requestedPartnerId = searchParams.get('partner_id')
    
    let partnerId: string | null = null
    
    if (user.role === 'super_admin' || user.role === 'admin') {
      // Admins can query any partner
      partnerId = requestedPartnerId || user.partner_id || null
    } else {
      // Regular users can only access their own partner
      partnerId = user.partner_id
    }

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'No partner assigned' },
        { status: 400 }
      )
    }

    // Get or create wallet for the partner
    let { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partnerId)
      .single()

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
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
        console.error('Error creating wallet:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create wallet' },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (walletError) {
      console.error('Error fetching wallet:', walletError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: wallet
    })

  } catch (error) {
    console.error('Wallet GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { partner_id, balance, currency = 'KES', low_balance_threshold = 1000 } = await request.json()

    if (!partner_id) {
      return NextResponse.json(
        { success: false, error: 'partner_id is required' },
        { status: 400 }
      )
    }

    // Create or update wallet
    const { data: wallet, error } = await supabase
      .from('partner_wallets')
      .upsert({
        partner_id,
        current_balance: balance || 0,
        currency,
        low_balance_threshold,
        sms_notifications_enabled: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating/updating wallet:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create/update wallet' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: wallet
    })

  } catch (error) {
    console.error('Wallet POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}