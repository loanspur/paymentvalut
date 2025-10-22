import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import { v4 as uuidv4 } from 'uuid'

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

    const { phone_number, email_address, purpose, amount } = await request.json()

    // Validate required fields
    if (!phone_number || !email_address || !purpose) {
      return NextResponse.json({
        error: 'phone_number, email_address, and purpose are required'
      }, { status: 400 })
    }

    // Validate purpose
    const validPurposes = ['float_purchase', 'disbursement', 'wallet_topup']
    if (!validPurposes.includes(purpose)) {
      return NextResponse.json({
        error: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}`
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

    // Validate phone number format
    const formattedPhone = phone_number.replace(/\D/g, '')
    if (!/^254\d{9}$/.test(formattedPhone)) {
      return NextResponse.json({
        error: 'Invalid phone number format. Use format: 254XXXXXXXXX'
      }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email_address)) {
      return NextResponse.json({
        error: 'Invalid email format'
      }, { status: 400 })
    }

    // Validate amount for financial transactions
    if (purpose !== 'wallet_topup' && (!amount || amount <= 0)) {
      return NextResponse.json({
        error: 'Amount is required for financial transactions'
      }, { status: 400 })
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString() // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    const otpReference = uuidv4()

    // Create OTP record
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_validations')
      .insert({
        reference: otpReference,
        user_id: payload.userId,
        partner_id: user.partner_id,
        phone_number: formattedPhone,
        email_address: email_address,
        otp_code: otpCode,
        purpose: purpose,
        amount: amount,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        attempts: 0,
        max_attempts: 3
      })
      .select()
      .single()

    if (otpError) {
      console.error('OTP creation error:', otpError)
      return NextResponse.json({
        error: 'Failed to create OTP'
      }, { status: 500 })
    }

    // TODO: Send OTP via SMS and Email
    // For now, we'll just log it (in production, integrate with SMS/Email service)
    console.log(`OTP for ${formattedPhone} / ${email_address} (${purpose}): ${otpCode}. Reference: ${otpReference}`)

    return NextResponse.json({
      success: true,
      message: 'OTP generated successfully',
      reference: otpReference,
      expiresAt: expiresAt.toISOString(),
      purpose: purpose,
      amount: amount,
      phoneNumber: formattedPhone,
      emailAddress: email_address,
      maxAttempts: 3,
      expiryMinutes: 10
    })

  } catch (error) {
    console.error('OTP generation error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

