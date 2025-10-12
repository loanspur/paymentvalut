import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - List all users with permissions and shortcode access
// DEPRECATED: Use /api/user-management instead
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
      .select('id, email, role, is_active, created_at, updated_at, partner_id')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found in database'
      }, { status: 401 })
    }

    // Check if user has permission to view users (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
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
      return NextResponse.json({
        error: 'Failed to fetch users',
        message: error.message
      }, { status: 500 })
    }

    // Get shortcode access for each user (simplified)
    const usersWithAccess = await Promise.all(
      users.map(async (user) => {
        // For now, return empty shortcode access array
        // This can be enhanced later with proper shortcode access logic
        return {
          ...user,
          shortcode_access: []
        }
      })
    )

    return NextResponse.json({
      success: true,
      users: usersWithAccess,
      total: usersWithAccess.length
    })

  } catch (error) {
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

    // Check if user has permission to create users (simplified check)
    if (!['super_admin', 'admin'].includes(currentUser.role)) {
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
      return NextResponse.json({
        error: 'Failed to create user',
        message: createError.message
      }, { status: 500 })
    }

    // Add shortcode access if provided (simplified - skip for now)
    // This can be enhanced later with proper shortcode access logic

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: newUser
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Internal server error',
      message: error.message
    }, { status: 500 })
  }
}