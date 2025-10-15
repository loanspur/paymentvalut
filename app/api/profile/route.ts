import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../lib/jwt-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// GET - Get current user's profile
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

    // Decode the JWT token to get user ID
    const decoded = await verifyJWTToken(token)
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user with all profile information
    let { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone_number,
        department,
        notes,
        role,
        partner_id,
        profile_picture_url,
        is_active,
        email_verified,
        last_login_at,
        last_activity_at,
        last_password_change,
        password_change_required,
        two_factor_enabled,
        created_at,
        updated_at
      `)
      .eq('id', decoded.userId)
      .single()

    if (userError || !user) {
      console.error('Profile API - User not found in database:', {
        userId: decoded.userId,
        email: decoded.email,
        error: userError?.message
      })

      // Try to find user by email as fallback
      const { data: userByEmail, error: emailError } = await supabase
        .from('users')
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone_number,
          department,
          notes,
          role,
          partner_id,
          profile_picture_url,
          is_active,
          email_verified,
          last_login_at,
          last_activity_at,
          last_password_change,
          password_change_required,
          two_factor_enabled,
          created_at,
          updated_at
        `)
        .eq('email', decoded.email)
        .single()

      if (emailError || !userByEmail) {
        return NextResponse.json({
          error: 'User not found',
          message: 'User profile not found in database',
          details: `User ID: ${decoded.userId}, Email: ${decoded.email}`
        }, { status: 404 })
      }
      
      // Use the user found by email
      user = userByEmail
    }

    // Get user's accessible shortcodes (non-blocking)
    let shortcodes = []
    try {
      const { data: shortcodeData, error: shortcodeError } = await supabase
        .rpc('get_user_accessible_shortcodes_enhanced', { p_user_id: user.id })
      
      if (shortcodeError) {
        console.error('Error fetching user shortcodes:', shortcodeError)
      } else {
        shortcodes = shortcodeData || []
      }
    } catch (error) {
      console.error('Error fetching user shortcodes:', error)
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        accessible_shortcodes: shortcodes
      }
    })

  } catch (error: any) {
    console.error('Get profile error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile', message: error.message },
      { status: 500 }
    )
  }
}

// PUT - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Decode the JWT token to get user ID
    const decoded = await verifyJWTToken(token)
    if (!decoded || !decoded.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    const updateData = await request.json()

    // Remove fields that users shouldn't be able to update directly
    const allowedFields = [
      'first_name',
      'last_name', 
      'phone_number',
      'department',
      'notes',
      'profile_picture_url'
    ]

    const filteredUpdateData: any = {}
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        filteredUpdateData[field] = updateData[field]
      }
    }

    // Add updated_at timestamp
    filteredUpdateData.updated_at = new Date().toISOString()

    // Update the user's profile
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(filteredUpdateData)
      .eq('id', decoded.userId)
      .eq('is_active', true)
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone_number,
        department,
        notes,
        role,
        partner_id,
        profile_picture_url,
        is_active,
        email_verified,
        last_login_at,
        last_activity_at,
        last_password_change,
        password_change_required,
        two_factor_enabled,
        created_at,
        updated_at
      `)
      .single()

    if (updateError) {
      console.error('Error updating profile:', updateError)
      return NextResponse.json({
        error: 'Failed to update profile',
        message: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error: any) {
    console.error('Update profile error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile', message: error.message },
      { status: 500 }
    )
  }
}

