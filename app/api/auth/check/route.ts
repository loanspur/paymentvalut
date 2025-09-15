import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

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
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)

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