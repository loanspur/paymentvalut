import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

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

    // Get current user with all profile information
    const { data: user, error: userError } = await supabase
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
        updated_at,
        partners (
          id,
          name,
          short_code
        )
      `)
      .eq('id', token)
      .eq('is_active', true)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found'
      }, { status: 401 })
    }

    // Get user's accessible shortcodes
    const { data: shortcodes, error: shortcodeError } = await supabase
      .rpc('get_user_accessible_shortcodes_enhanced', { p_user_id: user.id })

    if (shortcodeError) {
      console.error('Error fetching user shortcodes:', shortcodeError)
    }

    return NextResponse.json({
      success: true,
      user: {
        ...user,
        accessible_shortcodes: shortcodes || []
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
      .eq('id', token)
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
        updated_at,
        partners (
          id,
          name,
          short_code
        )
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

