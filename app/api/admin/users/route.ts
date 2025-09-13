import { NextRequest, NextResponse } from 'next/server'
import { AuthService } from '../../../../lib/auth'
import { requireAdmin } from '../../../../lib/auth'

// Get all users (admin only)
export const GET = requireAdmin(async (request: NextRequest, user) => {
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
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
})

// Create new user (admin only)
export const POST = requireAdmin(async (request: NextRequest, user) => {
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

    const newUser = await AuthService.register(
      { email, password, role, partner_id },
      user.id
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
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
})
