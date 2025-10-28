import { NextRequest, NextResponse } from 'next/server'
import { UserService } from '../../../../lib/user-service'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

// GET - Get current user's profile
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
    const payload = await verifyJWTToken(token)
    
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
    const user = await UserService.getCurrentUser(authContext.userId)
    if (!user) {
      return NextResponse.json({
        error: 'User not found',
        message: 'User profile not found in database'
      }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: user
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Update current user's profile
export async function PUT(request: NextRequest) {
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
    const payload = await verifyJWTToken(token)
    
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

    const profileData = await request.json()
    console.log('🔍 [DEBUG] Profile update request data:', profileData)

    // Remove fields that users shouldn't be able to update directly
    const allowedFields = [
      'first_name',
      'last_name', 
      'phone_number',
      'department',
      'notes',
      'profile_picture_url',
      'two_factor_enabled'
    ]

    const filteredProfileData: any = {}
    for (const field of allowedFields) {
      if (profileData[field] !== undefined) {
        filteredProfileData[field] = profileData[field]
      }
    }

    console.log('🔍 [DEBUG] Filtered profile data:', filteredProfileData)
    console.log('🔍 [DEBUG] User ID:', authContext.userId)

    // Update profile
    const updatedUser = await UserService.updateProfile(authContext.userId, filteredProfileData)
    if (!updatedUser) {
      return NextResponse.json({
        error: 'Failed to update profile',
        message: 'Profile update failed'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to update profile',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
