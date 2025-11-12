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

    // Send OTP via SMS and Email using existing functions
    let smsSent = false
    let emailSent = false

    // Send SMS
    try {
      // Get SMS settings
      const { data: smsSettings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('category', 'sms')
        .in('setting_key', ['damza_username', 'damza_api_key', 'damza_sender_id'])

      const settings = smsSettings?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value
        return acc
      }, {} as Record<string, string>) || {}

      if (settings.damza_username && settings.damza_api_key) {
        // Use SMS send API
        const smsResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/sms/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            phone_number: formattedPhone,
            message: `Your OTP for ${purpose === 'float_purchase' ? 'B2C Float Purchase' : purpose} is ${otpCode}. Valid for 10 minutes. Amount: KES ${amount || 0}. Do not share this code.`
          })
        })
        
        if (smsResponse.ok) {
          const smsResult = await smsResponse.json()
          smsSent = smsResult.success || false
          
          // Update OTP record with SMS status
          await supabase
            .from('otp_validations')
            .update({ sms_sent: smsSent })
            .eq('reference', otpReference)
        }
      }
    } catch (smsError) {
      console.error('Error sending OTP SMS:', smsError)
    }

    // Send Email
    try {
      const { sendEmail } = await import('../../../../lib/email-utils')
      const emailSubject = `OTP for ${purpose === 'float_purchase' ? 'B2C Float Purchase' : purpose}`
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Payment Vault - OTP Verification</h2>
          <p>Your OTP code for ${purpose === 'float_purchase' ? 'B2C Float Purchase' : purpose} is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">${otpCode}</h1>
          </div>
          <p><strong>Amount:</strong> KES ${amount || 0}</p>
          <p><strong>Valid for:</strong> 10 minutes</p>
          <p style="color: #dc2626;"><strong>⚠️ Do not share this code with anyone.</strong></p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
        </div>
      `

      const emailResult = await sendEmail({
        to: email_address,
        subject: emailSubject,
        html: emailBody
      })

      emailSent = emailResult.success || false

      // Update OTP record with Email status
      await supabase
        .from('otp_validations')
        .update({ email_sent: emailSent })
        .eq('reference', otpReference)
    } catch (emailError) {
      console.error('Error sending OTP Email:', emailError)
    }

    // Log OTP for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`OTP for ${formattedPhone} / ${email_address} (${purpose}): ${otpCode}. Reference: ${otpReference}`)
    }

    return NextResponse.json({
      success: true,
      message: 'OTP generated and sent successfully',
      reference: otpReference,
      expiresAt: expiresAt.toISOString(),
      purpose: purpose,
      amount: amount,
      phoneNumber: formattedPhone,
      emailAddress: email_address,
      maxAttempts: 3,
      expiryMinutes: 10,
      smsSent,
      emailSent,
      // In development, include OTP code for testing
      ...(process.env.NODE_ENV === 'development' && { otp_code: otpCode })
    })

  } catch (error) {
    console.error('OTP generation error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

