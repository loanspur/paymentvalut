import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update the user's password
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password_hash: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('email', email)
      .select()

    if (error) {
      console.error('Error updating password:', error)
      return NextResponse.json(
        { error: 'Failed to update password' },
        { status: 500 }
      )
    }

    if (data && data.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Password updated successfully',
        user: {
          email: data[0].email,
          role: data[0].role
        }
      })
    } else {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}



