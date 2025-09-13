import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../lib/auth'

// Get all users (public endpoint for settings page)
export async function GET(request: NextRequest) {
  try {
    const users = await AuthService.getAllUsers()

    return NextResponse.json({
      success: true,
      users: users.map(u => ({
        id: u.id,
        email: u.email,
        role: u.role,
        partner_id: u.partner_id,
        is_active: u.is_active,
        last_login_at: u.last_login_at,
        created_at: u.created_at,
        updated_at: u.updated_at
      }))
    })

  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// Create new user (public endpoint for settings page)
export async function POST(request: NextRequest) {
  try {
    const { email, password, role, partner_id } = await request.json()

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'partner'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be admin or partner' },
        { status: 400 }
      )
    }

    if (role === 'partner' && !partner_id) {
      return NextResponse.json(
        { error: 'Partner ID is required for partner users' },
        { status: 400 }
      )
    }

    // For now, we'll use a default admin ID for user creation
    // In a real app, you'd want to get this from the authenticated user
    const defaultAdminId = '00000000-0000-0000-0000-000000000000'
    
    const newUser = await AuthService.register(
      { email, password, role, partner_id },
      defaultAdminId
    )

    if (!newUser) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        partner_id: newUser.partner_id,
        is_active: newUser.is_active,
        created_at: newUser.created_at
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
