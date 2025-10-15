import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get user permissions
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found in database'
      }, { status: 401 })
    }

    // Check admin permissions
    if (!['super_admin', 'admin', 'partner_admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      }, { status: 403 })
    }

    const userId = request.nextUrl.searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({
        error: 'Missing parameter',
        message: 'userId is required'
      }, { status: 400 })
    }

    // If user is not super_admin, check if they can access this user's permissions
    if (currentUser.role !== 'super_admin') {
      const { data: targetUser, error: targetUserError } = await supabase
        .from('users')
        .select('partner_id')
        .eq('id', userId)
        .single()

      if (targetUserError || !targetUser) {
        return NextResponse.json({
          error: 'User not found',
          message: 'Target user does not exist'
        }, { status: 404 })
      }

      // Check if current user can access this user's permissions
      if (currentUser.partner_id !== targetUser.partner_id) {
        return NextResponse.json({
          error: 'Access denied',
          message: 'You can only view permissions for users from your own partner'
        }, { status: 403 })
      }
    }

    // Get user permissions
    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select(`
        *,
        granted_by_user:users!user_permissions_granted_by_fkey(email, first_name, last_name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('granted_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch permissions',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      permissions: permissions || []
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch permissions',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Grant permission
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found in database'
      }, { status: 401 })
    }

    // Check admin permissions
    if (!['super_admin', 'admin', 'partner_admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      }, { status: 403 })
    }

    const permissionData = await request.json()
    const { userId, permission_type, resource_type, resource_id, expires_at } = permissionData

    if (!userId || !permission_type || !resource_type) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'userId, permission_type, and resource_type are required'
      }, { status: 400 })
    }

    // Check if permission already exists
    const { data: existingPermission } = await supabase
      .from('user_permissions')
      .select('id')
      .eq('user_id', userId)
      .eq('permission_type', permission_type)
      .eq('resource_type', resource_type)
      .eq('resource_id', resource_id || null)
      .eq('is_active', true)
      .single()

    if (existingPermission) {
      return NextResponse.json({
        error: 'Permission already exists',
        message: 'This permission is already granted to the user'
      }, { status: 400 })
    }

    // Create permission
    const { data: newPermission, error } = await supabase
      .from('user_permissions')
      .insert({
        user_id: userId,
        permission_type,
        resource_type,
        resource_id: resource_id || null,
        granted_by: currentUser.id,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to grant permission',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Permission granted successfully',
      permission: newPermission
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to grant permission',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Revoke permission
export async function DELETE(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found in database'
      }, { status: 401 })
    }

    // Check admin permissions
    if (!['super_admin', 'admin', 'partner_admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions'
      }, { status: 403 })
    }

    const permissionId = request.nextUrl.searchParams.get('permissionId')
    if (!permissionId) {
      return NextResponse.json({
        error: 'Missing parameter',
        message: 'permissionId is required'
      }, { status: 400 })
    }

    // Revoke permission (soft delete)
    const { error } = await supabase
      .from('user_permissions')
      .update({ is_active: false })
      .eq('id', permissionId)

    if (error) {
      return NextResponse.json({
        error: 'Failed to revoke permission',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Permission revoked successfully'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to revoke permission',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
