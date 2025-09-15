import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

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
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Invalid token' },
          { status: 401 }
        )
      }

      // Check if user is admin
      if (decoded.role !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied', message: 'Admin privileges required' },
          { status: 403 }
        )
      }

      // Check if user is active
      if (!decoded.is_active) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Account is inactive' },
          { status: 403 }
        )
      }

      // Create user object
      const user: User = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        partner_id: decoded.partner_id,
        is_active: decoded.is_active
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
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any
      
      if (!decoded) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Invalid token' },
          { status: 401 }
        )
      }

      // Check if user is partner
      if (decoded.role !== 'partner') {
        return NextResponse.json(
          { error: 'Access denied', message: 'Partner privileges required' },
          { status: 403 }
        )
      }

      // Check if user is active
      if (!decoded.is_active) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Account is inactive' },
          { status: 403 }
        )
      }

      // Check if user has partner_id
      if (!decoded.partner_id) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Partner ID required' },
          { status: 403 }
        )
      }

      // Create user object
      const user: User = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        partner_id: decoded.partner_id,
        is_active: decoded.is_active
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
