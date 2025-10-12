import { NextRequest, NextResponse } from 'next/server'
import { UserService, CreateUserData } from '../../../lib/user-service'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// GET - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    // Authentication check - using same approach as /api/auth/check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token directly (same as auth check endpoint)
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database (always use database role, not JWT role)
    const currentUser = await UserService.getCurrentUser(payload.userId as string)
    if (!currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found in database'
      }, { status: 401 })
    }

    // Check if user is active
    if (!currentUser.is_active) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Account is inactive'
      }, { status: 403 })
    }

    // Check if user has permission to view users
    // Super admins can see all users, admins and partner admins can see their partner's users
    if (!['super_admin', 'admin', 'partner_admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to view users'
      }, { status: 403 })
    }

    // Get users based on role
    let users
    if (currentUser.role === 'super_admin') {
      // Super admin can see all users
      users = await UserService.getAllUsers()
    } else {
      // Admin and partner admin can only see users from their partner
      users = await UserService.getUsersByPartner(currentUser.partner_id || '')
    }
    
    // Update last activity for the admin user
    await UserService.updateLastActivity(currentUser.id)

    return NextResponse.json({
      success: true,
      users: users
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    // Authentication check - using same approach as /api/auth/check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token directly (same as auth check endpoint)
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Create auth context from payload
    const authContext = {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      isActive: payload.isActive as boolean
    }

    // Get current user from database
    const currentUser = await UserService.getCurrentUser(authContext.userId)
    if (!currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found in database'
      }, { status: 401 })
    }

    // Check admin permissions
    if (!UserService.hasAdminPermission(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to create users'
      }, { status: 403 })
    }

    const userData: CreateUserData = await request.json()

    // Validation
    if (!userData.email || !userData.password || !userData.role) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Email, password, and role are required'
      }, { status: 400 })
    }

    // Create user
    const newUser = await UserService.createUser(userData)
    if (!newUser) {
      return NextResponse.json({
        error: 'Failed to create user',
        message: 'User creation failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
