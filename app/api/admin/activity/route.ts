import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Get recent activities from various tables
    const [disbursements, loanTracking, partners] = await Promise.all([
      supabase
        .from('disbursement_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('loan_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    const activities = []

    // Add disbursement activities
    if (disbursements.data) {
      disbursements.data.forEach(disbursement => {
        activities.push({
          id: disbursement.id,
          type: 'disbursement',
          description: `Disbursement of ${disbursement.amount} to ${disbursement.phone_number}`,
          status: disbursement.status,
          created_at: disbursement.created_at
        })
      })
    }

    // Add loan tracking activities
    if (loanTracking.data) {
      loanTracking.data.forEach(loan => {
        activities.push({
          id: loan.id,
          type: 'loan_approval',
          description: `Loan ${loan.loan_id} approved for ${loan.client_name}`,
          status: loan.status,
          created_at: loan.created_at
        })
      })
    }

    // Add partner activities
    if (partners.data) {
      partners.data.forEach(partner => {
        activities.push({
          id: partner.id,
          type: 'partner',
          description: `Partner ${partner.name} ${partner.is_active ? 'activated' : 'deactivated'}`,
          status: partner.is_active ? 'active' : 'inactive',
          created_at: partner.created_at
        })
      })
    }

    // Sort by creation date
    activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    return NextResponse.json({
      success: true,
      activities: activities.slice(0, 20) // Return top 20 activities
    })

  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch activities'
    }, { status: 500 })
  }
}