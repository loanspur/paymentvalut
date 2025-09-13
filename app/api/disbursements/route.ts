import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

// Get all disbursements (public endpoint for original M-Pesa B2C system)
export async function GET(request: NextRequest) {
  try {
    const { data: disbursements, error } = await supabase
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
        { error: 'Failed to fetch disbursements' },
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
    console.error('Error in disbursements API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch disbursements' },
      { status: 500 }
    )
  }
}
