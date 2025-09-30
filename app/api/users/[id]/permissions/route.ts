import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../../lib/supabase'

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

    // Get current user to check permissions
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id')
      .eq('id', token)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Check if user has permission to view user permissions
    const { data: hasPermission } = await supabase
      .rpc('check_user_permission', {
        p_user_id: currentUser.id,
        p_permission_type: 'read',
        p_resource_type: 'users'
      })

    if (!hasPermission) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to view user permissions'
      }, { status: 403 })
    }

    // Get user's specific permissions
    const { data: userPermissions, error: permissionsError } = await supabase
      .from('user_permissions')
      .select(`
        id,
        permission_type,
        resource_type,
        resource_id,
        granted_by,
        granted_at,
        expires_at,
        is_active,
        created_at,
        updated_at
      `)
      .eq('user_id', params.id)
      .eq('is_active', true)

    if (permissionsError) {
      console.error('Permissions fetch error:', permissionsError)
      return NextResponse.json({
        error: 'Failed to fetch user permissions',
        message: permissionsError.message
      }, { status: 500 })
    }

    // Get user's shortcode access
    const { data: shortcodeAccess, error: shortcodeError } = await supabase
      .from('user_shortcode_access')
      .select(`
        id,
        shortcode_id,
        access_level,
        granted_by,
        granted_at,
        expires_at,
        is_active,
        created_at,
        updated_at,
        partners!user_shortcode_access_shortcode_id_fkey (
          id,
          name,
          short_code
        )
      `)
      .eq('user_id', params.id)
      .eq('is_active', true)

    if (shortcodeError) {
      console.error('Shortcode access fetch error:', shortcodeError)
      return NextResponse.json({
        error: 'Failed to fetch shortcode access',
        message: shortcodeError.message
      }, { status: 500 })
    }

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

    // Get current user to check permissions
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id')
      .eq('id', token)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Check if user has permission to manage user permissions
    const { data: hasPermission } = await supabase
      .rpc('check_user_permission', {
        p_user_id: currentUser.id,
        p_permission_type: 'admin',
        p_resource_type: 'users'
      })

    if (!hasPermission) {
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

      const { data: newPermission, error: permissionError } = await supabase
        .from('user_permissions')
        .insert({
          user_id: params.id,
          permission_type,
          resource_type,
          resource_id: resource_id || null,
          granted_by: currentUser.id,
          expires_at: expires_at || null
        })
        .select()
        .single()

      if (permissionError) {
        console.error('Permission grant error:', permissionError)
        return NextResponse.json({
          error: 'Failed to grant permission',
          message: permissionError.message
        }, { status: 500 })
      }

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

      const { data: newAccess, error: accessError } = await supabase
        .from('user_shortcode_access')
        .insert({
          user_id: params.id,
          shortcode_id,
          access_level,
          granted_by: currentUser.id,
          expires_at: expires_at || null
        })
        .select(`
          id,
          shortcode_id,
          access_level,
          granted_by,
          granted_at,
          expires_at,
          is_active,
          partners!user_shortcode_access_shortcode_id_fkey (
            id,
            name,
            short_code
          )
        `)
        .single()

      if (accessError) {
        console.error('Shortcode access grant error:', accessError)
        return NextResponse.json({
          error: 'Failed to grant shortcode access',
          message: accessError.message
        }, { status: 500 })
      }

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

    // Get current user to check permissions
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id')
      .eq('id', token)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Check if user has permission to manage user permissions
    const { data: hasPermission } = await supabase
      .rpc('check_user_permission', {
        p_user_id: currentUser.id,
        p_permission_type: 'admin',
        p_resource_type: 'users'
      })

    if (!hasPermission) {
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
      // Revoke specific permission
      const { error: revokeError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', permissionId)
        .eq('user_id', params.id)

      if (revokeError) {
        console.error('Permission revoke error:', revokeError)
        return NextResponse.json({
          error: 'Failed to revoke permission',
          message: revokeError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: 'Permission revoked successfully'
      })

    } else if (type === 'shortcode_access' && accessId) {
      // Revoke shortcode access
      const { error: revokeError } = await supabase
        .from('user_shortcode_access')
        .delete()
        .eq('id', accessId)
        .eq('user_id', params.id)

      if (revokeError) {
        console.error('Shortcode access revoke error:', revokeError)
        return NextResponse.json({
          error: 'Failed to revoke shortcode access',
          message: revokeError.message
        }, { status: 500 })
      }

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
