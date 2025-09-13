import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    const result = await AuthService.login({ email, password })

    if (!result) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Return user data and session token
    return NextResponse.json({
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        role: result.user.role,
        partner_id: result.user.partner_id,
        is_active: result.user.is_active,
        last_login_at: result.user.last_login_at
      },
      session_token: result.session.session_token,
      expires_at: result.session.expires_at
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
