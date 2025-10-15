import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { createJWTToken } from '../../../../lib/jwt-utils'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 })
    }

    // Find user in database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash, role, is_active, created_at')
      .eq('email', email)
      .single()

    if (userError || !user) {
      console.log('❌ Authentication failed: Invalid credentials')
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      console.log('❌ Authentication failed: Invalid credentials')
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    // Check if user is active
    if (!user.is_active) {
      console.log('❌ Authentication failed: Account deactivated')
      return NextResponse.json({
        error: 'Account is deactivated'
      }, { status: 403 })
    }

    // Generate JWT token with expiration using secure utility
    const token = await createJWTToken({ 
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    })

    console.log('✅ Login successful for user role:', user.role)

    // Update last login time
    await supabase
      .from('users')
      .update({ 
        last_activity_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Create response with secure cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        isActive: user.is_active
      }
    })

    // Set secure HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60 // 8 hours
    })

    return response

  } catch (error) {
    console.error('❌ Secure login error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
