import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '../../../../../lib/user-service'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// POST - Change user password
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

    const { currentPassword, newPassword } = await request.json()

    if (!currentPassword || !newPassword) {
      return NextResponse.json({
        error: 'Current and new passwords are required',
        message: 'Please provide both current and new passwords'
      }, { status: 400 })
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return NextResponse.json({
        error: 'Password too weak',
        message: 'New password must be at least 8 characters long'
      }, { status: 400 })
    }

    // Change password
    const success = await UserService.changePassword(authContext.userId, currentPassword, newPassword)
    if (!success) {
      return NextResponse.json({
        error: 'Failed to change password',
        message: 'Current password is incorrect or password change failed'
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Password has been changed successfully'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to change password',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
