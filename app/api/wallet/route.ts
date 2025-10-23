import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get the current user from the request (you'll need to implement auth)
    // For now, we'll get the first partner as a demo
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id')
      .limit(1)
      .single()

    if (partnersError || !partners) {
      return NextResponse.json(
        { success: false, error: 'No partner found' },
        { status: 404 }
      )
    }

    // Get or create wallet for the partner
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