import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({
        error: 'Email and new password are required'
      }, { status: 400 })
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.log('❌ User not found:', email, userError?.message)
      return NextResponse.json({
        error: 'User not found'
      }, { status: 404 })
    }

    // Hash the new password
    const passwordHash = await bcrypt.hash(newPassword, 12)
    
    console.log('🔐 Resetting password for:', email)

    // Update password in database
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)

    if (updateError) {
      console.error('❌ Error updating password:', updateError)
      return NextResponse.json({
        error: 'Failed to update password',
        details: updateError.message
      }, { status: 500 })
    }

    console.log('✅ Password reset successful for:', email)

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })

  } catch (error) {
    console.error('❌ Password reset error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}