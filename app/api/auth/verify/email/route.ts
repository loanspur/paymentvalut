import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Send email verification code
export async function POST(request: NextRequest) {
  try {
    // Get the JWT token from the request
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication token required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('id', payload.userId || payload.sub || payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if email is already verified
    if (user.email_verified) {
      return NextResponse.json(
        { success: false, error: 'Email is already verified' },
        { status: 400 }
      )
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Create email verification record
    const { data: verificationRecord, error: verificationError } = await supabase
      .from('email_verifications')
      .insert({
        user_id: user.id,
        email: user.email,
        verification_code: verificationCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      })
      .select()
      .single()

    if (verificationError) {
      console.error('Error creating email verification record:', verificationError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate verification code' },
        { status: 500 }
      )
    }

    // Send verification email
    try {
      const emailSent = await sendVerificationEmail({
        email: user.email,
        verificationCode: verificationCode
      })

      if (emailSent) {
        // Update verification record
        await supabase
          .from('email_verifications')
          .update({ email_sent: true })
          .eq('id', verificationRecord.id)
      }
    } catch (emailError) {
      console.error('Error sending verification email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'Email verification code sent successfully',
      data: {
        verification_id: verificationRecord.id,
        expires_at: verificationRecord.expires_at,
        // In development, include verification code for testing
        ...(process.env.NODE_ENV === 'development' && { verification_code: verificationCode })
      }
    })

  } catch (error) {
    console.error('Send Email Verification Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Verify email with code
export async function PUT(request: NextRequest) {
  try {
    // Get the JWT token from the request
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication token required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { verification_code } = body

    if (!verification_code || verification_code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Valid 6-digit verification code is required' },
        { status: 400 }
      )
    }

    // Find the most recent pending verification for the user
    const { data: verificationRecord, error: verificationError } = await supabase
      .from('email_verifications')
      .select('*')
      .eq('user_id', payload.userId || payload.sub || payload.id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (verificationError || !verificationRecord) {
      return NextResponse.json(
        { success: false, error: 'No valid verification code found or code has expired' },
        { status: 400 }
      )
    }

    // Check if max attempts exceeded
    if (verificationRecord.attempts >= verificationRecord.max_attempts) {
      await supabase
        .from('email_verifications')
        .update({ status: 'expired' })
        .eq('id', verificationRecord.id)

      return NextResponse.json(
        { success: false, error: 'Maximum attempts exceeded' },
        { status: 400 }
      )
    }

    // Check if verification code matches
    if (verificationRecord.verification_code === verification_code) {
      // Mark verification as verified
      await supabase
        .from('email_verifications')
        .update({ 
          status: 'verified', 
          verified_at: new Date().toISOString() 
        })
        .eq('id', verificationRecord.id)

      // Update user email verification status
      await supabase
        .from('users')
        .update({ 
          email_verified: true,
          email_verified_at: new Date().toISOString()
        })
        .eq('id', verificationRecord.user_id)

      return NextResponse.json({
        success: true,
        message: 'Email verified successfully'
      })
    } else {
      // Increment attempts
      await supabase
        .from('email_verifications')
        .update({ attempts: verificationRecord.attempts + 1 })
        .eq('id', verificationRecord.id)

      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid verification code',
          attempts_remaining: verificationRecord.max_attempts - verificationRecord.attempts - 1
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Verify Email Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Function to send verification email
async function sendVerificationEmail({
  email,
  verificationCode
}: {
  email: string
  verificationCode: string
}) {
  try {
    const { sendEmail } = await import('../../../../../lib/email-utils')
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Vault</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Verify Your Email Address</h2>
          
          <p style="color: #666; margin: 20px 0; line-height: 1.6;">
            Thank you for registering with Payment Vault. To complete your account setup, 
            please verify your email address using the code below:
          </p>
          
          <div style="background: white; border: 2px dashed #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
            <h1 style="color: #667eea; font-size: 36px; margin: 10px 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${verificationCode}</h1>
          </div>
          
          <p style="color: #666; margin: 20px 0; line-height: 1.6;">
            This code will expire in <strong>15 minutes</strong>. 
            Please enter this code in the verification form to complete your email verification.
          </p>
          
          <div style="background: #d1ecf1; border: 1px solid #bee5eb; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #0c5460; font-size: 14px;">
              <strong>Note:</strong> This is a one-time verification. Once verified, 
              you won't need to verify this email address again.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin: 30px 0 0 0;">
            If you didn't request this verification, please ignore this email or contact support.
          </p>
        </div>
      </div>
    `

    const result = await sendEmail({
      to: email,
      subject: 'Payment Vault - Email Verification Code',
      html: emailHtml,
      text: `Your Payment Vault email verification code is: ${verificationCode}. Valid for 15 minutes.`
    })

    if (result.success) {
      console.log(`✅ Email verification sent successfully to ${email}`)
      return true
    } else {
      console.error(`❌ Failed to send email verification to ${email}:`, result.error)
      return false
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return false
  }
}
