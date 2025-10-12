import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

interface User {
  id: string
  email: string
  role: string
  partner_id?: string
  is_active: boolean
}

interface AuthRequest extends NextRequest {
  user?: User
}

export function requireAdmin(handler: (request: AuthRequest, user: User) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from cookies
      const token = request.cookies.get('auth_token')?.value
      
      if (!token) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Authentication required' },
          { status: 401 }
        )
      }

      // Verify JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      const { payload } = await jwtVerify(token, secret)
      
      if (!payload) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Invalid token' },
          { status: 401 }
        )
      }

      // Check if user is admin
      if (payload.role !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied', message: 'Admin privileges required' },
          { status: 403 }
        )
      }

      // Check if user is active
      if (!payload.isActive) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Account is inactive' },
          { status: 403 }
        )
      }

      // Create user object
      const user: User = {
        id: payload.userId as string,
        email: payload.email as string,
        role: payload.role as string,
        partner_id: payload.partner_id as string,
        is_active: payload.isActive as boolean
      }

      // Add user to request object
      const authRequest = request as AuthRequest
      authRequest.user = user

      // Call the original handler
      return await handler(authRequest, user)

    } catch (error) {
      console.error('Auth error:', error)
      return NextResponse.json(
        { error: 'Access denied', message: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}

export function requirePartner(handler: (request: AuthRequest, user: User) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // Get token from cookies
      const token = request.cookies.get('auth_token')?.value
      
      if (!token) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Authentication required' },
          { status: 401 }
        )
      }

      // Verify JWT token
      const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
      const { payload } = await jwtVerify(token, secret)
      
      if (!payload) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Invalid token' },
          { status: 401 }
        )
      }

      // Check if user is partner
      if (payload.role !== 'partner') {
        return NextResponse.json(
          { error: 'Access denied', message: 'Partner privileges required' },
          { status: 403 }
        )
      }

      // Check if user is active
      if (!payload.isActive) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Account is inactive' },
          { status: 403 }
        )
      }

      // Check if user has partner_id
      if (!payload.partner_id) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Partner ID required' },
          { status: 403 }
        )
      }

      // Create user object
      const user: User = {
        id: payload.userId as string,
        email: payload.email as string,
        role: payload.role as string,
        partner_id: payload.partner_id as string,
        is_active: payload.isActive as boolean
      }

      // Add user to request object
      const authRequest = request as AuthRequest
      authRequest.user = user

      // Call the original handler
      return await handler(authRequest, user)

    } catch (error) {
      console.error('Auth error:', error)
      return NextResponse.json(
        { error: 'Access denied', message: 'Authentication failed' },
        { status: 401 }
      )
    }
  }
}
