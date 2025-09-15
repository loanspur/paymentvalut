import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '../../../../../lib/auth-utils'
import { supabase } from '../../../../../lib/supabase'



// Get specific user (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAdmin(async (req, user) => {
    try {
      const userId = params.id
      
      const { data: targetUser, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !targetUser) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({
        success: true,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          role: targetUser.role,
          partner_id: targetUser.partner_id,
          is_active: targetUser.is_active,
          last_login_at: targetUser.last_login_at,
          created_at: targetUser.created_at,
          updated_at: targetUser.updated_at
        }
      })

    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to fetch user' },
        { status: 500 }
      )
    }
  })(request)
}

// Update user (admin only)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAdmin(async (req, user) => {
    try {
      const userId = params.id
      const updates = await request.json()

      // Remove sensitive fields that shouldn't be updated directly
      delete updates.password_hash
      delete updates.id
      delete updates.created_at

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error || !updatedUser) {
        return NextResponse.json(
          { error: 'Failed to update user' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          partner_id: updatedUser.partner_id,
          is_active: updatedUser.is_active,
          last_login_at: updatedUser.last_login_at,
          created_at: updatedUser.created_at,
          updated_at: updatedUser.updated_at
        }
      })

    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }
  })(request)
}

// Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return requireAdmin(async (req, user) => {
    try {
      const userId = params.id

      // Prevent admin from deleting themselves
      if (userId === user.id) {
        return NextResponse.json(
          { error: 'Cannot delete your own account' },
          { status: 400 }
        )
      }

      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        return NextResponse.json(
          { error: 'Failed to delete user' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'User deleted successfully'
      })

    } catch (error) {
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }
  })(request)
}
