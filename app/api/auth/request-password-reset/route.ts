import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { sendEmail } from '../../../../lib/email-utils'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({
        error: 'Email is required',
        message: 'Please provide a valid email address'
      }, { status: 400 })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, is_active')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      })
    }

    // Generate password reset token
    const { data: token, error: tokenError } = await supabase
      .rpc('generate_password_reset_token', { p_user_id: user.id })

    if (tokenError || !token) {
      console.error('Error generating password reset token:', tokenError)
      return NextResponse.json({
        error: 'Failed to generate reset token',
        message: 'Please try again later'
      }, { status: 500 })
    }

    // Send password reset email
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`
    
    try {
      await sendEmail({
        to: user.email,
        subject: 'Password Reset Request - M-Pesa Vault',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Password Reset Request</h2>
            <p>Hello ${user.first_name || 'User'},</p>
            <p>You have requested to reset your password for your M-Pesa Vault account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <p>If you didn't request this password reset, please ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #6b7280; font-size: 14px;">
              M-Pesa Vault System<br>
              This is an automated message, please do not reply.
            </p>
          </div>
        `
      })

      return NextResponse.json({
        success: true,
        message: 'Password reset link has been sent to your email'
      })

    } catch (emailError) {
      console.error('Error sending password reset email:', emailError)
      
      // Still return success to user for security, but log the error
      return NextResponse.json({
        success: true,
        message: 'If the email exists, a password reset link has been sent'
      })
    }

  } catch (error: any) {
    console.error('Password reset request error:', error)
    return NextResponse.json(
      { error: 'Failed to process password reset request', message: error.message },
      { status: 500 }
    )
  }
}

