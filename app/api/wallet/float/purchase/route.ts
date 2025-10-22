import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

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

    const { 
      float_amount, 
      transfer_fee, 
      processing_fee, 
      otp_reference, 
      otp_code, 
      description 
    } = await request.json()

    // Validate required fields
    if (!float_amount || !transfer_fee || !processing_fee || !otp_reference || !otp_code) {
      return NextResponse.json({
        error: 'All fields are required: float_amount, transfer_fee, processing_fee, otp_reference, otp_code'
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
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/wallet-manager/float/purchase`
    
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        partner_id: user.partner_id,
        float_amount: float_amount,
        transfer_fee: transfer_fee,
        processing_fee: processing_fee,
        otp_reference: otp_reference,
        otp_code: otp_code,
        description: description || 'B2C float purchase'
      })
    })

    const data = await response.json()

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: data.message || 'B2C float purchased successfully',
        transactionId: data.transactionId,
        reference: data.reference,
        floatAmount: data.floatAmount,
        totalAmount: data.totalAmount,
        newWalletBalance: data.newWalletBalance
      })
    } else {
      return NextResponse.json({
        error: data.error || 'Failed to purchase B2C float',
        details: data.details
      }, { status: response.status })
    }

  } catch (error) {
    console.error('B2C float purchase error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

