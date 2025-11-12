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

      // Check if user is partner or partner_admin
      if (payload.role !== 'partner' && payload.role !== 'partner_admin') {
        return NextResponse.json(
          { error: 'Access denied', message: 'Partner privileges required' },
          { status: 403 }
        )
      }

      // Always fetch user data from database to get latest partner_id and is_active status
      // This ensures we have the most up-to-date information
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('partner_id, is_active, role')
        .eq('id', payload.userId)
        .single()
      
      if (userError || !userData) {
        return NextResponse.json(
          { error: 'Access denied', message: 'User not found' },
          { status: 403 }
        )
      }
      
      // Check if user is active (use database value, not JWT payload)
      if (!userData.is_active) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Account is inactive' },
          { status: 403 }
        )
      }
      
      // Get partner_id from database (prefer database value over JWT payload)
      const partnerId = userData.partner_id || undefined

      // Check if user has partner_id
      if (!partnerId) {
        return NextResponse.json(
          { error: 'Access denied', message: 'Partner ID required. Please contact your administrator to assign a partner to your account.' },
          { status: 403 }
        )
      }

      // Create user object (use database values for is_active and role)
      const user: User = {
        id: payload.userId as string,
        email: payload.email as string,
        role: userData.role || (payload.role as string),
        partner_id: partnerId,
        is_active: userData.is_active
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
