import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'
import { createJWTToken } from '../../../../lib/jwt-utils'

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const jwtSecret = process.env.JWT_SECRET

    if (!supabaseUrl) {
      console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL')
      return NextResponse.json({
        error: 'Server configuration error: Missing Supabase URL'
      }, { status: 500 })
    }

    if (!supabaseServiceKey) {
      console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({
        error: 'Server configuration error: Missing Supabase service key'
      }, { status: 500 })
    }

    if (!jwtSecret) {
      console.error('❌ Missing JWT_SECRET')
      return NextResponse.json({
        error: 'Server configuration error: Missing JWT secret'
      }, { status: 500 })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 })
    }

    console.log('🔍 Attempting login for:', email)

    // Test database connection first
    try {
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('count')
        .limit(1)

      if (testError) {
        console.error('❌ Database connection error:', testError)
        return NextResponse.json({
          error: 'Database connection failed',
          details: testError.message
        }, { status: 500 })
      }
    } catch (dbError) {
      console.error('❌ Database connection exception:', dbError)
      return NextResponse.json({
        error: 'Database connection failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown database error'
      }, { status: 500 })
    }

    // Find user in database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id, 
        email, 
        password_hash, 
        role, 
        is_active, 
        created_at,
        phone_number,
        phone_verified,
        email_verified,
        phone_verified_at,
        email_verified_at,
        partner_id
      `)
      .eq('email', email)
      .single()

    if (userError) {
      console.log('❌ User lookup error:', userError.message)
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    if (!user) {
      console.log('❌ User not found for email:', email)
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    console.log('✅ User found:', user.email, 'Role:', user.role)

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      console.log('❌ Invalid password for user:', email)
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    // Check if user is active
    if (!user.is_active) {
      console.log('❌ Account deactivated for user:', email)
      return NextResponse.json({
        error: 'Account is deactivated'
      }, { status: 403 })
    }

    // Check if OTP validation is required (only after email and phone verification)
    // Get OTP settings from system_settings
    const { data: otpSettings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'login_otp_enabled')
      .single()

    // Default to false if OTP settings are not configured
    const otpEnabled = otpSettings?.setting_value === 'true'
    const requiresEmailVerification = !user.email_verified
    const requiresPhoneVerification = user.email_verified && !user.phone_verified
    // Only require OTP if email and phone are verified AND OTP is enabled globally
    const requiresOTP = otpEnabled && user.email_verified && user.phone_verified

    // Generate JWT token with expiration using secure utility
    // If OTP is required, create a temporary token that doesn't allow full access
    const token = await createJWTToken({ 
      userId: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
      otpValidated: !requiresOTP, // Only set to true if OTP is not required
      requiresOTP: requiresOTP
    })

    console.log('✅ Login successful for user:', user.email, 'Role:', user.role)

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
        isActive: user.is_active,
        phone_number: user.phone_number,
        phone_verified: user.phone_verified,
        email_verified: user.email_verified,
        phone_verified_at: user.phone_verified_at,
        email_verified_at: user.email_verified_at,
        partner_id: user.partner_id
      },
      requires_otp: requiresOTP,
      requires_email_verification: requiresEmailVerification,
      requires_phone_verification: requiresPhoneVerification
    })

    // Set secure HTTP-only cookie
    console.log('🔍 [DEBUG] Setting auth_token cookie:', {
      token: token ? 'SET' : 'NOT SET',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60,
      path: '/'
    })
    
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax', // More permissive for development
      maxAge: 8 * 60 * 60, // 8 hours
      path: '/' // Explicitly set path
    })
    
    console.log('🔍 [DEBUG] Cookie set successfully')

    return response

  } catch (error) {
    console.error('❌ Secure login error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : 'No stack trace') : undefined
    }, { status: 500 })
  }
}