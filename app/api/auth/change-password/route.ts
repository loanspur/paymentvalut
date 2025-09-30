import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function verifyToken(token: string): Promise<any> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Decode the JWT token to get user ID
    const decoded = await verifyToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        error: 'Current and new passwords are required',
        message: 'Please provide both current and new passwords'
      }, { status: 400 })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({
        error: 'Password too weak',
        message: 'New password must be at least 8 characters long'
      }, { status: 400 })
    }

    // Get current user
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, password_hash, email')
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, currentUser.password_hash)
    if (!isCurrentPasswordValid) {
      return NextResponse.json({
        error: 'Invalid current password',
        message: 'The current password you entered is incorrect'
      }, { status: 400 })
    }

    // Check if new password is different from current
    const isSamePassword = await bcrypt.compare(newPassword, currentUser.password_hash)
    if (isSamePassword) {
      return NextResponse.json({
        error: 'Password unchanged',
        message: 'New password must be different from current password'
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
      .eq('id', currentUser.id)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({
        error: 'Failed to update password',
        message: 'Please try again later'
      }, { status: 500 })
    }

    // Invalidate all existing sessions except current one
    const { error: sessionError } = await supabase
      .from('user_sessions')
      .update({ is_active: false })
      .eq('user_id', currentUser.id)
      .neq('session_token', token)

    if (sessionError) {
      console.error('Error invalidating other sessions:', sessionError)
      // Don't fail the request since password was updated successfully
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been changed successfully'
    })

  } catch (error: any) {
    console.error('Change password error:', error)
    return NextResponse.json(
      { error: 'Failed to change password', message: error.message },
      { status: 500 }
    )
  }
}

