import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create admin client for bypassing RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Get all disbursements for admin
export async function GET(request: NextRequest) {
  try {
    const { data: disbursements, error } = await supabaseAdmin
      .from('disbursement_requests')
      .select(`
        *,
        partners:partner_id (
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching disbursements:', error)
      return NextResponse.json(
        { error: 'Failed to fetch disbursements', details: error.message },
        { status: 500 }
      )
    }

    // Transform data to include partner name
    const transformedDisbursements = disbursements?.map(item => ({
      ...item,
      partner_name: item.partners?.name || 'Unknown Partner'
    })) || []

    return NextResponse.json({
      success: true,
      disbursements: transformedDisbursements
    })
  } catch (error) {
    console.error('Error in admin disbursements API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
