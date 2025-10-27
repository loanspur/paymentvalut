import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken, createJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Validate OTP for login
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

    const body = await request.json()
    const { otp_code } = body

    if (!otp_code || otp_code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Valid 6-digit OTP code is required' },
        { status: 400 }
      )
    }

    // Validate OTP using the database function
    const { data: validationResult, error: validationError } = await supabase
      .rpc('validate_login_otp', {
        p_user_id: payload.userId || payload.sub || payload.id,
        p_otp_code: otp_code
      })

    if (validationError) {
      console.error('OTP validation error:', validationError)
      return NextResponse.json(
        { success: false, error: 'Failed to validate OTP' },
        { status: 500 }
      )
    }

    const result = validationResult as any

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          attempts_remaining: result.attempts_remaining || 0
        },
        { status: 400 }
      )
    }

    // OTP is valid, get user details
    const userId = payload.userId || payload.sub || payload.id
    console.log('🔍 Looking up user with ID:', userId)
    
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        role,
        partner_id,
        phone_number,
        phone_verified,
        email_verified,
        is_active
      `)
      .eq('id', userId)
      .single()

    if (userError || !user) {
      console.log('❌ User lookup error:', userError?.message || 'User not found')
      console.log('❌ JWT payload:', payload)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { success: false, error: 'Account is deactivated' },
        { status: 403 }
      )
    }

    // Check if partner is active (if user has a partner)
    if (user.partner_id) {
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('id, name, is_active')
        .eq('id', user.partner_id)
        .single()
      
      if (partner && !partner.is_active) {
        return NextResponse.json(
          { success: false, error: 'Partner account is deactivated' },
          { status: 403 }
        )
      }
    }

    // Create new JWT token with OTP validation flag
    const newToken = await createJWTToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      partnerId: user.partner_id,
      otpValidated: true,
      validatedAt: new Date().toISOString()
    })

    // Set the new token in cookies
    const response = NextResponse.json({
      success: true,
      message: 'OTP validated successfully',
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          partner_id: user.partner_id,
          phone_number: user.phone_number,
          phone_verified: user.phone_verified,
          email_verified: user.email_verified
        },
        otp_validated: true
      }
    })

    // Set secure HTTP-only cookie
    response.cookies.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 hours
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Validate OTP Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
