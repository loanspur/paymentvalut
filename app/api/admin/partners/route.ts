import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'
import { requireAdmin } from '../../../../lib/auth-utils'


// Get all partners (admin only)
export const GET = requireAdmin(async (request: NextRequest, user) => {
  try {
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
})
