import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

// Demo users (in production, this would be in a database)
const USERS = [
  {
    id: '1',
    username: 'admin',
    password: 'admin123', // In production, this would be hashed
    role: 'admin',
    name: 'System Administrator'
  },
  {
    id: '2',
    username: 'operator',
    password: 'operator123',
    role: 'operator',
    name: 'System Operator'
  }
]

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({
        error: 'Username and password are required'
      }, { status: 400 })
    }

    // Find user
    const user = USERS.find(u => u.username === username && u.password === password)

    if (!user) {
      return NextResponse.json({
        error: 'Invalid credentials'
      }, { status: 401 })
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    // Return user data and token
    return NextResponse.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('❌ Login error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}