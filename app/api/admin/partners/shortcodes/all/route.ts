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

    if (currentUser.role !== 'super_admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Super admin access required' },
        { status: 403 }
      )
    }

    // Get all shortcodes with partner information
    // We'll filter is_active in the application layer to handle null values
    const { data: shortcodes, error } = await supabase
      .from('partner_shortcodes')
      .select(`
        id,
        shortcode,
        shortcode_name,
        is_active,
        partner_id,
        partners!inner(
          id,
          name,
          short_code
        )
      `)
      .order('partners.name', { ascending: true })
      .order('shortcode_name', { ascending: true })

    console.log('Fetched shortcodes from database (before filtering):', shortcodes?.length || 0, shortcodes)
    
    // Filter active shortcodes (is_active = true or null/undefined, which we treat as active)
    const activeShortcodes = (shortcodes || []).filter((sc: any) => sc.is_active !== false)
    console.log('Active shortcodes (after filtering):', activeShortcodes.length, activeShortcodes)

    if (error) {
      console.error('Error fetching all shortcodes:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch shortcodes' },
        { status: 500 }
      )
    }

    // Transform data to include partner name
    const transformedShortcodes = activeShortcodes.map((sc: any) => ({
      id: sc.id,
      shortcode: sc.shortcode,
      shortcode_name: sc.shortcode_name,
      is_active: sc.is_active !== false, // Normalize to boolean
      partner_id: sc.partner_id,
      partner_name: sc.partners?.name || 'Unknown Partner',
      partner_short_code: sc.partners?.short_code || ''
    }))
    
    console.log('Transformed shortcodes:', transformedShortcodes.length, transformedShortcodes)

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

