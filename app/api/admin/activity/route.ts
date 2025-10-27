import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Get recent activities from various tables
    const [disbursements, loanTracking, partners, users, otpValidations] = await Promise.all([
      supabase
        .from('disbursement_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15),
      
      supabase
        .from('loan_tracking')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(15),
      
      supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('users')
        .select('*')
        .order('last_activity_at', { ascending: false })
        .limit(10),
      
      supabase
        .from('login_otp_validations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    const activities = []

    // Add disbursement activities
    if (disbursements.data) {
      disbursements.data.forEach(disbursement => {
        activities.push({
          id: `disbursement-${disbursement.id}`,
          action: disbursement.status === 'success' ? 'Disbursement Completed' : 'Disbursement Failed',
          resource: `Amount: ${disbursement.amount} to ${disbursement.phone_number}`,
          ip_address: disbursement.ip_address || 'N/A',
          created_at: disbursement.created_at,
          type: 'disbursement',
          status: disbursement.status
        })
      })
    }

    // Add loan tracking activities
    if (loanTracking.data) {
      loanTracking.data.forEach(loan => {
        activities.push({
          id: `loan-${loan.id}`,
          action: 'Loan Request',
          resource: `Loan ID: ${loan.loan_id} for ${loan.client_name}`,
          ip_address: 'N/A',
          created_at: loan.created_at,
          type: 'loan',
          status: loan.status
        })
      })
    }

    // Add user login activities
    if (users.data) {
      users.data.forEach(user => {
        if (user.last_activity_at) {
          activities.push({
            id: `user-${user.id}`,
            action: 'User Login',
            resource: `User: ${user.email} (${user.role})`,
            ip_address: 'N/A',
            created_at: user.last_activity_at,
            type: 'user_login',
            status: 'success'
          })
        }
      })
    }

    // Add OTP validation activities
    if (otpValidations.data) {
      otpValidations.data.forEach(otp => {
        activities.push({
          id: `otp-${otp.id}`,
          action: 'OTP Validation',
          resource: `User: ${otp.user_id}`,
          ip_address: 'N/A',
          created_at: otp.created_at,
          type: 'otp_validation',
          status: otp.status
        })
      })
    }

    // Add partner activities
    if (partners.data) {
      partners.data.forEach(partner => {
        activities.push({
          id: `partner-${partner.id}`,
          action: 'Partner Management',
          resource: `Partner: ${partner.name} (${partner.is_active ? 'Active' : 'Inactive'})`,
          ip_address: 'N/A',
          created_at: partner.created_at,
          type: 'partner',
          status: partner.is_active ? 'active' : 'inactive'
        })
      })
    }

    // Sort by creation date (most recent first)
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