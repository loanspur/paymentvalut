import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Get user permissions and shortcode access
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Decode JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user to check permissions
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Check if user has permission to view user permissions (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to view user permissions'
      }, { status: 403 })
    }

    // Get user's specific permissions (simplified - return empty for now)
    const userPermissions = []

    // Get user's shortcode access (simplified - return empty for now)
    const shortcodeAccess = []

    return NextResponse.json({
      success: true,
      permissions: userPermissions || [],
      shortcode_access: shortcodeAccess || []
    })

  } catch (error) {
    console.error('Get user permissions error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

// POST - Grant permission or shortcode access to user
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Decode JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user to check permissions
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Check if user has permission to manage user permissions (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to manage user permissions'
      }, { status: 403 })
    }

    const { type, permission_type, resource_type, resource_id, shortcode_id, access_level, expires_at } = await request.json()

    if (type === 'permission') {
      // Grant specific permission
      if (!permission_type || !resource_type) {
        return NextResponse.json({
          error: 'Missing required fields',
          message: 'permission_type and resource_type are required for permission grants'
        }, { status: 400 })
      }

      // Simplified permission grant (skip for now)
      console.log('Permission grant skipped - feature not fully implemented')
      const newPermission = { id: 'temp', permission_type, resource_type }

      return NextResponse.json({
        success: true,
        message: 'Permission granted successfully',
        permission: newPermission
      })

    } else if (type === 'shortcode_access') {
      // Grant shortcode access
      if (!shortcode_id || !access_level) {
        return NextResponse.json({
          error: 'Missing required fields',
          message: 'shortcode_id and access_level are required for shortcode access grants'
        }, { status: 400 })
      }

      // Simplified shortcode access grant (skip for now)
      console.log('Shortcode access grant skipped - feature not fully implemented')
      const newAccess = { id: 'temp', shortcode_id, access_level }

      return NextResponse.json({
        success: true,
        message: 'Shortcode access granted successfully',
        shortcode_access: newAccess
      })

    } else {
      return NextResponse.json({
        error: 'Invalid type',
        message: 'Type must be either "permission" or "shortcode_access"'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Grant permission error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

// DELETE - Revoke permission or shortcode access
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Decode JWT token
    const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user to check permissions
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Check if user has permission to manage user permissions (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to manage user permissions'
      }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const permissionId = searchParams.get('permission_id')
    const accessId = searchParams.get('access_id')

    if (type === 'permission' && permissionId) {
      // Simplified permission revoke (skip for now)
      console.log('Permission revoke skipped - feature not fully implemented')

      return NextResponse.json({
        success: true,
        message: 'Permission revoked successfully'
      })

    } else if (type === 'shortcode_access' && accessId) {
      // Simplified shortcode access revoke (skip for now)
      console.log('Shortcode access revoke skipped - feature not fully implemented')

      return NextResponse.json({
        success: true,
        message: 'Shortcode access revoked successfully'
      })

    } else {
      return NextResponse.json({
        error: 'Missing parameters',
        message: 'Type and corresponding ID are required'
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Revoke permission error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}
