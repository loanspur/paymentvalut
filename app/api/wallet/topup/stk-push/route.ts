import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '@/lib/jwt-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
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

    const { amount, phone_number, description } = await request.json()

    // Validate required fields
    if (!amount || !phone_number) {
      return NextResponse.json({
        error: 'amount and phone_number are required'
      }, { status: 400 })
    }

    // Validate amount
    if (amount <= 0 || amount > 1000000) {
      return NextResponse.json({
        error: 'Invalid amount. Must be between 1 and 1,000,000 KES'
      }, { status: 400 })
    }

    // Validate phone number
    const formattedPhone = phone_number.replace(/\D/g, '')
    if (!/^254\d{9}$/.test(formattedPhone)) {
      return NextResponse.json({
        error: 'Invalid phone number format. Use format: 254XXXXXXXXX'
      }, { status: 400 })
    }

    // Get user's partner ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.partner_id) {
      return NextResponse.json({ error: 'No partner associated with user' }, { status: 400 })
    }

    // Call the wallet-manager Edge Function
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/wallet-manager/topup/stk-push`
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        partner_id: user.partner_id,
        amount: amount,
        phone_number: formattedPhone,
        description: description || 'Wallet top-up via STK Push'
      })
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: data.message || 'STK Push initiated successfully',
        transactionId: data.transactionId,
        reference: data.reference,
        stkPushTransactionId: data.stkPushTransactionId,
        ncbReferenceId: data.ncbReferenceId
      })
    } else {
      return NextResponse.json({
        error: data.error || 'Failed to initiate STK Push',
        details: data.details
      }, { status: response.status })
    }

  } catch (error) {
    console.error('STK Push top-up error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

