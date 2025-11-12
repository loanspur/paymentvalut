import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user is super_admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Normalize role for comparison (handle case sensitivity)
    const userRole = (currentUser.role || '').trim().toLowerCase()
    if (userRole !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      )
    }

    // Get all shortcodes with partner information
    // Use left join to handle orphaned shortcodes gracefully
    const { data: shortcodes, error } = await supabase
      .from('partner_shortcodes')
      .select(`
        id,
        shortcode,
        shortcode_name,
        is_active,
        partner_id,
        partners(
          id,
          name,
          short_code
        )
      `)
      .order('shortcode_name', { ascending: true })

    if (error) {
      console.error('Error fetching all shortcodes:', error)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch shortcodes',
          details: error.message || error.code || 'Database query error'
        },
        { status: 500 }
      )
    }
    
    // Filter active shortcodes (is_active = true or null/undefined, which we treat as active)
    const activeShortcodes = (shortcodes || []).filter((sc: any) => sc.is_active !== false)

    // Transform data to include partner name
    // Handle both single partner object and array (Supabase can return either)
    const transformedShortcodes = activeShortcodes.map((sc: any) => {
      const partner = Array.isArray(sc.partners) ? sc.partners[0] : sc.partners
      return {
        id: sc.id,
        shortcode: sc.shortcode,
        shortcode_name: sc.shortcode_name,
        is_active: sc.is_active !== false, // Normalize to boolean
        partner_id: sc.partner_id,
        partner_name: partner?.name || 'Unknown Partner',
        partner_short_code: partner?.short_code || ''
      }
    })

    return NextResponse.json({
      success: true,
      shortcodes: transformedShortcodes
    })

  } catch (error) {
    console.error('Get all shortcodes error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

