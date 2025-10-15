import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        user: null
      })
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)

    if (!payload) {
      return NextResponse.json({
        authenticated: false,
        user: null
      })
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
        isActive: payload.isActive
      }
    })

  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({
      authenticated: false,
      user: null
    })
  }
}