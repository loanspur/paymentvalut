import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email, password, role } = await request.json()

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required'
      }, { status: 400 })
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 12)
    
    console.log('🔐 Creating user account...')
    console.log('Email:', email)
    console.log('Role:', role || 'admin')

    // Insert user into database
    const { data, error } = await supabase
      .from('users')
      .insert({
        email: email,
        password_hash: passwordHash,
        role: role || 'admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({
          success: true,
          message: 'User already exists',
          user: { email, role: role || 'admin' }
        })
      } else {
        console.error('❌ Error creating user:', error)
        return NextResponse.json({
          error: 'Failed to create user',
          details: error.message
        }, { status: 500 })
      }
    } else {
      console.log('✅ User created successfully!')
      return NextResponse.json({
        success: true,
        message: 'User created successfully',
        user: {
          id: data.id,
          email: data.email,
          role: data.role
        }
      })
    }

  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
