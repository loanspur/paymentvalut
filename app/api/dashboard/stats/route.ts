import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    // Verify the JWT token
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')
    const { payload } = await jwtVerify(token, secret)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !currentUser || !currentUser.is_active) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'User not found or inactive'
      }, { status: 401 })
    }

    // Get partner filter from query parameters or user role
    const { searchParams } = new URL(request.url)
    const requestedPartnerId = searchParams.get('partnerId')
    
    // Determine partner filter based on user role and request
    let partnerFilter = null
    console.log('🔍 Stats API - User role:', currentUser.role, 'Requested partner:', requestedPartnerId, 'User partner:', currentUser.partner_id)
    
    if (currentUser.role === 'super_admin') {
      // Super admin can filter by any partner or see all data
      if (requestedPartnerId && requestedPartnerId !== 'all') {
        partnerFilter = requestedPartnerId
      }
    } else if (currentUser.partner_id) {
      // Non-super admin users are limited to their own partner
      partnerFilter = currentUser.partner_id
    }
    
    console.log('🔍 Stats API - Final partner filter:', partnerFilter)
    
    // Validate partner exists if filtering by specific partner
    if (partnerFilter && partnerFilter !== 'all') {
      const { data: partnerExists, error: partnerError } = await supabase
        .from('partners')
        .select('id, name')
        .eq('id', partnerFilter)
        .single()
      
      if (partnerError || !partnerExists) {
        console.error('❌ Partner not found:', partnerFilter, partnerError)
        return NextResponse.json(
          { error: 'Partner not found', details: `Partner with ID ${partnerFilter} does not exist` },
          { status: 404 }
        )
      }
      console.log('✅ Partner found:', partnerExists)
    }
    
    // Build base query for disbursement requests
    let disbursementQuery = supabase.from('disbursement_requests').select('*', { count: 'exact', head: true })
    if (partnerFilter) {
      disbursementQuery = disbursementQuery.eq('partner_id', partnerFilter)
    }

    // Get total transactions count
    console.log('🔍 Executing disbursement query for partner:', partnerFilter)
    const { count: totalTransactions, error: transactionsError } = await disbursementQuery

    if (transactionsError) {
      console.error('❌ Error fetching total transactions:', transactionsError)
    } else {
      console.log('✅ Total transactions count:', totalTransactions)
    }

    // Get total amount disbursed
    let amountQuery = supabase.from('disbursement_requests').select('amount, status').eq('status', 'success')
    if (partnerFilter) {
      amountQuery = amountQuery.eq('partner_id', partnerFilter)
    }
    const { data: amountData, error: amountError } = await amountQuery

    if (amountError) {
      console.error('Error fetching amount data:', amountError)
    }

    const totalAmount = amountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

    // Get active partners count
    let partnersQuery = supabase.from('partners').select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)
    if (partnerFilter) {
      partnersQuery = partnersQuery.eq('id', partnerFilter)
    }
    const { count: activePartners, error: partnersError } = await partnersQuery

    if (partnersError) {
      console.error('Error fetching active partners:', partnersError)
    }

    // Calculate success rate
    let statusQuery = supabase.from('disbursement_requests').select('status')
    if (partnerFilter) {
      statusQuery = statusQuery.eq('partner_id', partnerFilter)
    }
    const { data: statusData, error: statusError } = await statusQuery

    if (statusError) {
      console.error('Error fetching status data:', statusError)
    }

    const totalWithStatus = statusData?.length || 0
    const successfulTransactions = statusData?.filter(t => t.status === 'success').length || 0
    const successRate = totalWithStatus > 0 ? (successfulTransactions / totalWithStatus) * 100 : 0

    // Get today's transactions
    const today = new Date().toISOString().split('T')[0]
    let todayQuery = supabase.from('disbursement_requests').select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)
    if (partnerFilter) {
      todayQuery = todayQuery.eq('partner_id', partnerFilter)
    }
    const { count: todayTransactions, error: todayError } = await todayQuery

    if (todayError) {
      console.error('Error fetching today transactions:', todayError)
    }

    // Get today's amount
    let todayAmountQuery = supabase.from('disbursement_requests').select('amount, status')
      .eq('status', 'success')
      .gte('created_at', `${today}T00:00:00.000Z`)
    if (partnerFilter) {
      todayAmountQuery = todayAmountQuery.eq('partner_id', partnerFilter)
    }
    const { data: todayAmountData, error: todayAmountError } = await todayAmountQuery

    if (todayAmountError) {
      console.error('Error fetching today amount:', todayAmountError)
    }

    const todayAmount = todayAmountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

    const stats = {
      totalTransactions: totalTransactions || 0,
      totalAmount: totalAmount || 0,
      activePartners: activePartners || 0,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
      todayTransactions: todayTransactions || 0,
      todayAmount: todayAmount || 0
    }
    
    console.log('✅ Final stats calculated:', stats)

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ Stats API Error:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}