import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get user shortcode access
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

    // If user is not super_admin, check if they can access this user's shortcode access
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

      // Check if current user can access this user's shortcode access
      if (currentUser.partner_id !== targetUser.partner_id) {
        return NextResponse.json({
          error: 'Access denied',
          message: 'You can only view shortcode access for users from your own partner'
        }, { status: 403 })
      }
    }

    // Get user shortcode access
    const { data: shortcodeAccess, error } = await supabase
      .from('user_shortcode_access')
      .select(`
        *,
        partners:partners!user_shortcode_access_shortcode_id_fkey(id, name, short_code),
        granted_by_user:users!user_shortcode_access_granted_by_fkey(email, first_name, last_name)
      `)
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('granted_at', { ascending: false })

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch shortcode access',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      shortcodeAccess: shortcodeAccess || []
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch shortcode access',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Grant shortcode access
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

    const accessData = await request.json()
    const { userId, shortcode_id, access_type, expires_at } = accessData

    if (!userId || !shortcode_id || !access_type) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'userId, shortcode_id, and access_type are required'
      }, { status: 400 })
    }

    // Check if access already exists
    const { data: existingAccess } = await supabase
      .from('user_shortcode_access')
      .select('id')
      .eq('user_id', userId)
      .eq('shortcode_id', shortcode_id)
      .eq('is_active', true)
      .single()

    if (existingAccess) {
      return NextResponse.json({
        error: 'Access already exists',
        message: 'This shortcode access is already granted to the user'
      }, { status: 400 })
    }

    // Create shortcode access
    const { data: newAccess, error } = await supabase
      .from('user_shortcode_access')
      .insert({
        user_id: userId,
        shortcode_id,
        access_type,
        granted_by: currentUser.id,
        expires_at: expires_at ? new Date(expires_at).toISOString() : null,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({
        error: 'Failed to grant shortcode access',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Shortcode access granted successfully',
      access: newAccess
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to grant shortcode access',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE - Revoke shortcode access
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

    const accessId = request.nextUrl.searchParams.get('accessId')
    if (!accessId) {
      return NextResponse.json({
        error: 'Missing parameter',
        message: 'accessId is required'
      }, { status: 400 })
    }

    // Revoke shortcode access (soft delete)
    const { error } = await supabase
      .from('user_shortcode_access')
      .update({ is_active: false })
      .eq('id', accessId)

    if (error) {
      return NextResponse.json({
        error: 'Failed to revoke shortcode access',
        message: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Shortcode access revoked successfully'
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to revoke shortcode access',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
