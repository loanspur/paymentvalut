import { NextRequest, NextResponse } from 'next/server'
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
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
      console.log('❌ User not found:', email, userError?.message)
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      console.log('❌ Invalid password for:', email)
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    // Check if user is active
    if (!user.is_active) {
      console.log('❌ Account deactivated for:', email)
      return NextResponse.json({
        error: 'Account is deactivated'
      }, { status: 403 })
    }

    // Generate JWT token with expiration using jose
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ 
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('8h')
      .setIssuedAt()
      .sign(secret)

    console.log('✅ Login successful for:', email, 'Role:', user.role)

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
