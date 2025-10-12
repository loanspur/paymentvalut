import { NextRequest, NextResponse } from 'next/server'
import { UserService, UpdateUserData } from '../../../../lib/user-service'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// GET - Get user by ID (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    if (!['super_admin', 'admin', 'partner_admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to view users'
      }, { status: 403 })
    }

    // Get user by ID
    const user = await UserService.getUserById(params.id)
    
    // Check if current user can view this specific user
    if (currentUser.role !== 'super_admin' && currentUser.partner_id !== user?.partner_id) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You can only view users from your own partner'
      }, { status: 403 })
    }
    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: user
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if user has permission to update users
    if (!['super_admin', 'admin', 'partner_admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to update users'
      }, { status: 403 })
    }

    // Get the user being updated to check partner access
    const targetUser = await UserService.getUserById(params.id)
    if (!targetUser) {
      return NextResponse.json({
        error: 'User not found',
        message: 'User with the specified ID does not exist'
      }, { status: 404 })
    }

    // Check if current user can update this specific user
    if (currentUser.role !== 'super_admin' && currentUser.partner_id !== targetUser.partner_id) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You can only update users from your own partner'
      }, { status: 403 })
    }

    const userData: UpdateUserData = await request.json()

    // Update user
    const updatedUser = await UserService.updateUser(params.id, userData)
    
    // Update last activity for the admin user
    await UserService.updateLastActivity(currentUser.id)
    if (!updatedUser) {
      return NextResponse.json({
        error: 'Failed to update user',
        message: 'User update failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
        message: 'Insufficient permissions to delete users'
      }, { status: 403 })
    }

    // Prevent self-deletion
    if (params.id === currentUser.id) {
      return NextResponse.json({
        error: 'Cannot delete self',
        message: 'You cannot delete your own account'
      }, { status: 400 })
    }

    // Delete user
    const success = await UserService.deleteUser(params.id)
    if (!success) {
      return NextResponse.json({
        error: 'Failed to delete user',
        message: 'User deletion failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
