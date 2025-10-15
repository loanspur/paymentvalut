import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../lib/jwt-utils'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get partners based on user access
export async function GET(request: NextRequest) {
  try {
    // Try to get authentication token
    const token = request.cookies.get('auth_token')?.value
    
    if (token) {
      try {
        // Verify the JWT token
        const payload = await verifyJWTToken(token)
        
        if (payload && payload.userId) {
          // Get current user from database
          const { data: currentUser, error: userError } = await supabase
            .from('users')
            .select('id, role, partner_id, is_active')
            .eq('id', payload.userId)
            .single()

          if (!userError && currentUser && currentUser.is_active) {
            // Filter partners based on user role
            let query = supabase
              .from('partners')
              .select('*')
              .order('created_at', { ascending: false })

            // If user is not super_admin, limit to their partner
            if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
              query = query.eq('id', currentUser.partner_id)
            }

            const { data: partners, error } = await query

            if (error) {
              return NextResponse.json(
                { error: 'Failed to fetch partners' },
                { status: 500 }
              )
            }

            return NextResponse.json({
              success: true,
              partners: partners || []
            })
          }
        }
      } catch (authError) {
        // If authentication fails, continue to public access
      }
    }

    // Fallback: Return all partners for unauthenticated requests (backward compatibility)
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch partners' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      partners: partners || []
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}
