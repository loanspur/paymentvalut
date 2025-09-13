import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import bcrypt from 'bcryptjs'

// Use service role key for setup operations to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Function to create user management tables
async function createUserManagementTables() {
  // This is a simplified version - in production, you'd want to use proper migrations
  // For now, we'll just try to create the admin user and let the database handle the rest
  console.log('Attempting to create user management tables...')
  // The actual table creation should be done via Supabase migrations
  // This is just a placeholder for the automatic setup
}

// Create admin user if it doesn't exist
export async function POST(request: NextRequest) {
  try {
    // Check if users table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (tableError) {
      // Try to create the tables if they don't exist
      try {
        await createUserManagementTables()
      } catch (createError) {
        return NextResponse.json({
          error: 'Users table does not exist and could not be created automatically.',
          details: tableError.message,
          suggestion: 'Please run the manual migration script in your Supabase SQL Editor'
        }, { status: 400 })
      }
    }

    // Check if admin user already exists
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', 'admin@mpesavault.com')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({
        error: 'Failed to check existing admin user',
        details: checkError.message
      }, { status: 500 })
    }

    if (existingAdmin) {
      return NextResponse.json({
        success: true,
        message: 'Admin user already exists',
        email: 'admin@mpesavault.com',
        password: 'admin123',
        user: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          role: existingAdmin.role
        }
      })
    }

    // Create admin user
    const password = 'admin123'
    const passwordHash = await bcrypt.hash(password, 10)

    const { data: adminUser, error: createError } = await supabase
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
      message: 'Admin user created successfully',
      credentials: {
        email: 'admin@mpesavault.com',
        password: 'admin123'
      },
      user: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role
      }
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get setup status
export async function GET(request: NextRequest) {
  try {
    // Check if users table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    if (tableError) {
      return NextResponse.json({
        status: 'migration_required',
        message: 'Database migration required. Please run: supabase db push'
      })
    }

    // Check if admin user exists
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', 'admin@mpesavault.com')
      .single()

    if (adminError) {
      console.error('Error checking admin user:', adminError)
      return NextResponse.json({
        status: 'admin_required',
        message: 'Could not check admin user status. Please create it.',
        credentials: {
          email: 'admin@mpesavault.com',
          password: 'admin123'
        }
      })
    }

    if (adminUser) {
      return NextResponse.json({
        status: 'ready',
        message: 'Admin user exists',
        admin: {
          email: adminUser.email,
          role: adminUser.role,
          is_active: adminUser.is_active
        }
      })
    } else {
      return NextResponse.json({
        status: 'admin_required',
        message: 'Admin user not found. Please create it.',
        credentials: {
          email: 'admin@mpesavault.com',
          password: 'admin123'
        }
      })
    }

  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Setup check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
