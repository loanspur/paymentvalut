import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      partner_id, 
      phone_number, 
      amount, 
      account_reference, 
      transaction_desc = 'Wallet Top-up',
      callback_url 
    } = body

    // Validate required fields
    if (!partner_id || !phone_number || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: partner_id, phone_number, amount' },
        { status: 400 }
      )
    }

    // Validate amount
    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate phone number format (254XXXXXXXXX)
    const phoneRegex = /^254\d{9}$/
    if (!phoneRegex.test(phone_number)) {
      return NextResponse.json(
        { success: false, error: 'Phone number must be in format 254XXXXXXXXX' },
        { status: 400 }
      )
    }

    // Get partner details
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', partner_id)
      .eq('is_active', true)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found or inactive' },
        { status: 404 }
      )
    }

    // Check if partner has NCBA credentials
    if (!partner.ncba_consumer_key || !partner.ncba_consumer_secret || !partner.ncba_passkey) {
      return NextResponse.json(
        { success: false, error: 'Partner NCBA credentials not configured' },
        { status: 400 }
      )
    }

    // Generate transaction reference
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)
    const business_short_code = partner.ncba_business_short_code || '174379'
    const transaction_reference = `STK${timestamp}${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Create password (Base64 encoded)
    const password = Buffer.from(`${business_short_code}${partner.ncba_passkey}${timestamp}`).toString('base64')

    // Prepare STK Push request
    const stkPushRequest = {
      BusinessShortCode: business_short_code,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount), // Amount in cents
      PartyA: phone_number,
      PartyB: business_short_code,
      PhoneNumber: phone_number,
      CallBackURL: callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/ncba/stk-callback`,
      AccountReference: account_reference || `WALLET_${partner_id}`,
      TransactionDesc: transaction_desc
    }

    // Get NCBA access token
    const authResponse = await fetch('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${partner.ncba_consumer_key}:${partner.ncba_consumer_secret}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    if (!authResponse.ok) {
      console.error('NCBA Auth Error:', authResponse.status, await authResponse.text())
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with NCBA' },
        { status: 500 }
      )
    }

    const authData = await authResponse.json()
    const access_token = authData.access_token

    // Initiate STK Push
    const stkPushResponse = await fetch('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushRequest)
    })

    const stkPushData = await stkPushResponse.json()

    if (!stkPushResponse.ok) {
      console.error('STK Push Error:', stkPushResponse.status, stkPushData)
      return NextResponse.json(
        { success: false, error: 'STK Push failed', details: stkPushData },
        { status: 500 }
      )
    }

    // Log the STK Push request
    const { data: logData, error: logError } = await supabase
      .from('ncb_stk_push_logs')
      .insert({
        partner_id,
        phone_number,
        amount: Math.round(amount),
        transaction_reference,
        business_short_code,
        account_reference: account_reference || `WALLET_${partner_id}`,
        transaction_desc,
        callback_url: callback_url || `${process.env.NEXT_PUBLIC_APP_URL}/api/ncba/stk-callback`,
        request_payload: stkPushRequest,
        response_payload: stkPushData,
        status: 'initiated',
        checkout_request_id: stkPushData.CheckoutRequestID || null,
        merchant_request_id: stkPushData.MerchantRequestID || null
      })
      .select()
      .single()

    if (logError) {
      console.error('Error logging STK Push:', logError)
    }

    return NextResponse.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        checkout_request_id: stkPushData.CheckoutRequestID,
        merchant_request_id: stkPushData.MerchantRequestID,
        transaction_reference,
        phone_number,
        amount,
        status: 'initiated'
      }
    })

  } catch (error) {
    console.error('STK Push API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const partner_id = searchParams.get('partner_id')
    const checkout_request_id = searchParams.get('checkout_request_id')

    if (!partner_id) {
      return NextResponse.json(
        { success: false, error: 'partner_id is required' },
        { status: 400 }
      )
    }

    let query = supabase
      .from('ncb_stk_push_logs')
      .select('*')
      .eq('partner_id', partner_id)
      .order('created_at', { ascending: false })

    if (checkout_request_id) {
      query = query.eq('checkout_request_id', checkout_request_id)
    }

    const { data, error } = await query.limit(50)

    if (error) {
      console.error('Error fetching STK Push logs:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch STK Push logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('STK Push GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}






