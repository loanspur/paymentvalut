import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Ensuring admin user exists with correct password...')

    // Check if admin user exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('id, email, role, is_active, password_hash')
      .eq('email', 'admin@mpesavault.com')
      .single()

    const password = 'admin123'
    const passwordHash = await bcrypt.hash(password, 10)

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({
        error: 'Failed to check existing admin user',
        details: checkError.message
      }, { status: 500 })
    }

    if (existingAdmin) {
      // Update existing admin user with correct password
      const { data: updatedAdmin, error: updateError } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('email', 'admin@mpesavault.com')
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({
          error: 'Failed to update admin user',
          details: updateError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        message: 'Admin user password updated successfully',
        credentials: {
          email: 'admin@mpesavault.com',
          password: 'admin123'
        },
        user: {
          id: updatedAdmin.id,
          email: updatedAdmin.email,
          role: updatedAdmin.role,
          is_active: updatedAdmin.is_active
        }
      })
    } else {
      // Create new admin user
      const { data: newAdmin, error: createError } = await supabase
        .from('users')
        .insert({
          email: 'admin@mpesavault.com',
          password_hash: passwordHash,
          role: 'admin',
          is_active: true
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({
          error: 'Failed to create admin user',
          details: createError.message
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        action: 'created',
        message: 'Admin user created successfully',
        credentials: {
          email: 'admin@mpesavault.com',
          password: 'admin123'
        },
        user: {
          id: newAdmin.id,
          email: newAdmin.email,
          role: newAdmin.role,
          is_active: newAdmin.is_active
        }
      })
    }

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
