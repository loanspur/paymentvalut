import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

// Get all partners (public endpoint for original M-Pesa B2C system)
export async function GET(request: NextRequest) {
  try {
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching partners:', error)
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
    console.error('Error in partners API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch partners' },
      { status: 500 }
    )
  }
}
