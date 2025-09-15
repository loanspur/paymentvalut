import { NextRequest, NextResponse } from 'next/server'

// Get all users (public endpoint for settings page)
export async function GET(request: NextRequest) {
  try {
    // Mock users data for now
    const users = [
      {
        id: '1',
        email: 'admin@mpesavault.com',
        role: 'admin',
        partner_id: null,
        is_active: true,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]

    return NextResponse.json({
      success: true,
      users
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

    // Mock user creation for now
    const newUser = {
      id: Date.now().toString(),
      email,
      role,
      partner_id,
      is_active: true,
      created_at: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      user: newUser
    }, { status: 201 })

  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
