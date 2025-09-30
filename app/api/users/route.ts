import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'
import bcrypt from 'bcryptjs'

// GET - List all users with permissions and shortcode access
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

    // Get current user to check permissions
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id')
      .eq('id', token) // Assuming token contains user ID
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Check if user has permission to view users
    const { data: hasPermission } = await supabase
      .rpc('check_user_permission', {
        p_user_id: currentUser.id,
        p_permission_type: 'read',
        p_resource_type: 'users'
      })

    if (!hasPermission) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to view users'
      }, { status: 403 })
    }

    // Build query based on user role
    let query = supabase
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
        created_at,
        updated_at,
        partners!users_partner_id_fkey (
          id,
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })

    // If user is not super_admin, limit to their partner's users
    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      query = query.eq('partner_id', currentUser.partner_id)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({
        error: 'Failed to fetch users',
        message: error.message
      }, { status: 500 })
    }

    // Get shortcode access for each user
    const usersWithAccess = await Promise.all(
      users.map(async (user) => {
        const { data: shortcodeAccess } = await supabase
          .rpc('get_user_accessible_shortcodes', { p_user_id: user.id })
        
        return {
          ...user,
          shortcode_access: shortcodeAccess || []
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithAccess,
      total: usersWithAccess.length
    })

  } catch (error) {
    console.error('List users error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}

// POST - Create new user with permissions and shortcode access
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

    // Check if user has permission to create users
    const { data: hasPermission } = await supabase
      .rpc('check_user_permission', {
        p_user_id: currentUser.id,
        p_permission_type: 'write',
        p_resource_type: 'users'
      })

    if (!hasPermission) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Insufficient permissions to create users'
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
      notes
    } = await request.json()

    // Validation
    if (!email || !password || !role) {
      return NextResponse.json({
        error: 'Missing required fields',
        message: 'Email, password, and role are required'
      }, { status: 400 })
    }

    // Check if email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({
        error: 'Email already exists',
        message: 'A user with this email already exists'
      }, { status: 400 })
    }

    // Hash password
    const saltRounds = 12
    const password_hash = await bcrypt.hash(password, saltRounds)

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        password_hash,
        first_name,
        last_name,
        phone_number,
        department,
        role,
        partner_id: partner_id || currentUser.partner_id, // Default to current user's partner
        notes,
        is_active: true,
        email_verified: false
      })
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
        created_at,
        updated_at
      `)
      .single()

    if (createError) {
      console.error('User creation error:', createError)
      return NextResponse.json({
        error: 'Failed to create user',
        message: createError.message
      }, { status: 500 })
    }

    // Add shortcode access if provided
    if (shortcode_access.length > 0) {
      const shortcodeAccessData = shortcode_access.map((access: any) => ({
        user_id: newUser.id,
        shortcode_id: access.shortcode_id,
        access_level: access.access_level || 'read',
        granted_by: currentUser.id
      }))

      const { error: accessError } = await supabase
        .from('user_shortcode_access')
        .insert(shortcodeAccessData)

      if (accessError) {
        console.error('Shortcode access error:', accessError)
        // Don't fail the user creation, just log the error
      }
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}