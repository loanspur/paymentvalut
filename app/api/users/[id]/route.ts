import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get user by ID with permissions and shortcode access
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

    // Check if user has permission to view users (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to view users'
      }, { status: 403 })
    }

    // Get user from database with partner info
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone_number,
        department,
        role,
        partner_id,
        is_active,
        email_verified,
        last_login_at,
        last_activity_at,
        notes,
        created_at,
        updated_at,
        partners!users_partner_id_fkey (
          id,
          name,
          short_code
        )
      `)
      .eq('id', params.id)
      .single()

    if (error || !user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if current user can view this specific user
    if (currentUser.role !== 'super_admin' && currentUser.partner_id !== user.partner_id) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You can only view users from your own partner'
      }, { status: 403 })
    }

    // Get user's shortcode access (simplified)
    const shortcodeAccess = []

    // Get user's specific permissions (simplified)
    const userPermissions = []

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        shortcode_access: shortcodeAccess || [],
        permissions: userPermissions || []
      }
    })

  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    )
  }
}

// Update user with permissions and shortcode access
export async function PUT(
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

    // Check if user has permission to update users (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to update users'
      }, { status: 403 })
    }

    const {
      email,
      password,
      first_name,
      last_name,
      phone_number,
      department,
      role,
      partner_id,
      shortcode_access = [],
      notes,
      is_active
    } = await request.json()

    // Get existing user to check permissions
    const { data: existingUser, error: existingError } = await supabase
      .from('users')
      .select('partner_id, role, email')
      .eq('id', params.id)
      .single()

    if (existingError || !existingUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if current user can update this specific user
    if (currentUser.role !== 'super_admin' && currentUser.partner_id !== existingUser.partner_id) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You can only update users from your own partner'
      }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      first_name,
      last_name,
      phone_number,
      department,
      notes,
      is_active
    }

    // Only update email if provided and different
    if (email && email !== existingUser.email) {
      // Check if new email already exists
      const { data: emailExists } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', params.id)
        .single()

      if (emailExists) {
        return NextResponse.json({
          error: 'Email already exists',
          message: 'A user with this email already exists'
        }, { status: 400 })
      }
      updateData.email = email
    }

    // Only update password if provided
    if (password) {
      const saltRounds = 12
      updateData.password_hash = await bcrypt.hash(password, saltRounds)
    }

    // Only update role if current user is super_admin
    if (role && currentUser.role === 'super_admin') {
      updateData.role = role
    }

    // Only update partner_id if current user is super_admin
    if (partner_id && currentUser.role === 'super_admin') {
      updateData.partner_id = partner_id
    }

    // Remove sensitive fields
    delete updateData.id
    delete updateData.created_at
    delete updateData.updated_at

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone_number,
        department,
        role,
        partner_id,
        is_active,
        email_verified,
        last_login_at,
        last_activity_at,
        notes,
        created_at,
        updated_at
      `)
      .single()
    
    if (error || !updatedUser) {
      console.error('User update error:', error)
      return NextResponse.json(
        { error: 'Failed to update user', message: error?.message },
        { status: 500 }
      )
    }

    // Update shortcode access if provided (simplified - skip for now)
    if (shortcode_access.length >= 0) {
      console.log('Shortcode access update skipped - feature not fully implemented')
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: 'Failed to update user', message: error.message },
      { status: 500 }
    )
  }
}

// Delete user with permission checks
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

    // Check if user has permission to delete users (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to delete users'
      }, { status: 403 })
    }

    // Get user to check permissions
    const { data: userToDelete, error: userToDeleteError } = await supabase
      .from('users')
      .select('id, role, partner_id, email')
      .eq('id', params.id)
      .single()

    if (userToDeleteError || !userToDelete) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if current user can delete this specific user
    if (currentUser.role !== 'super_admin' && currentUser.partner_id !== userToDelete.partner_id) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You can only delete users from your own partner'
      }, { status: 403 })
    }

    // Prevent self-deletion
    if (currentUser.id === userToDelete.id) {
      return NextResponse.json({
        error: 'Cannot delete yourself',
        message: 'You cannot delete your own account'
      }, { status: 400 })
    }

    // Prevent deletion of super_admin users (unless current user is also super_admin)
    if (userToDelete.role === 'super_admin' && currentUser.role !== 'super_admin') {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Only super admins can delete other super admins'
      }, { status: 403 })
    }

    // Delete user (this will cascade to related tables due to foreign key constraints)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', params.id)
    
    if (deleteError) {
      console.error('User deletion error:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete user', message: deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: 'Failed to delete user', message: error.message },
      { status: 500 }
    )
  }
}
