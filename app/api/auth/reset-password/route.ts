import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json()

    if (!token || !newPassword) {
      return NextResponse.json({
        error: 'Token and new password are required',
        message: 'Please provide both the reset token and new password'
      }, { status: 400 })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({
        error: 'Password too weak',
        message: 'Password must be at least 8 characters long'
      }, { status: 400 })
    }

    // Validate the reset token
    const { data: tokenValidation, error: tokenError } = await supabase
      .rpc('validate_password_reset_token', { p_token: token })

    if (tokenError || !tokenValidation || tokenValidation.length === 0) {
      return NextResponse.json({
        error: 'Invalid or expired token',
        message: 'The password reset token is invalid or has expired'
      }, { status: 400 })
    }

    const { user_id, is_valid } = tokenValidation[0]

    if (!is_valid) {
      return NextResponse.json({
        error: 'Invalid or expired token',
        message: 'The password reset token is invalid or has expired'
      }, { status: 400 })
    }

    // Hash the new password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(newPassword, saltRounds)

    // Update the user's password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        last_password_change: new Date().toISOString(),
        password_change_required: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({
        error: 'Failed to update password',
        message: 'Please try again later'
      }, { status: 500 })
    }

    // Mark the token as used
    const { error: tokenUseError } = await supabase
      .rpc('use_password_reset_token', { p_token: token })

    if (tokenUseError) {
      console.error('Error marking token as used:', tokenUseError)
      // Don't fail the request since password was updated successfully
    }

    // Invalidate all existing sessions for this user
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', user_id)

    if (sessionError) {
      console.error('Error invalidating sessions:', sessionError)
      // Don't fail the request since password was updated successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    })

  } catch (error: any) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password', message: error.message },
      { status: 500 }
    )
  }
}

