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

    // Build query for partners based on user role
    let partnersQuery = supabase.from('partners').select(`
      id,
      name,
      short_code,
      mpesa_shortcode,
      is_active,
      is_mpesa_configured,
      created_at
    `).eq('is_active', true)

    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      partnersQuery = partnersQuery.eq('id', currentUser.partner_id)
    }

    // Get active partners with their transaction counts and amounts
    const { data: partners, error: partnersError } = await partnersQuery

    if (partnersError) {
      return NextResponse.json(
        { error: 'Failed to fetch partners', details: partnersError.message },
        { status: 500 }
      )
    }

    // Get transaction statistics for each partner
    const partnerStats = await Promise.all(
      partners.map(async (partner) => {
        // Build base query for disbursement requests - already filtered by user's partner
        const partnerId = currentUser.role !== 'super_admin' && currentUser.partner_id 
          ? currentUser.partner_id 
          : partner.id

        // Get total transactions for this partner
        const { count: totalTransactions, error: totalError } = await supabase
          .from('disbursement_requests')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', partnerId)

        // Get successful transactions for this partner
        const { count: successfulTransactions, error: successError } = await supabase
          .from('disbursement_requests')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', partnerId)
          .eq('status', 'success')

        // Get total amount for this partner
        const { data: amountData, error: amountError } = await supabase
          .from('disbursement_requests')
          .select('amount')
          .eq('partner_id', partnerId)
          .eq('status', 'success')

        const totalAmount = amountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

        // Get today's transactions for this partner
        const today = new Date().toISOString().split('T')[0]
        const { count: todayTransactions, error: todayError } = await supabase
          .from('disbursement_requests')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', partnerId)
          .gte('created_at', `${today}T00:00:00.000Z`)

        // Get today's amount for this partner
        const { data: todayAmountData, error: todayAmountError } = await supabase
          .from('disbursement_requests')
          .select('amount')
          .eq('partner_id', partnerId)
          .eq('status', 'success')
          .gte('created_at', `${today}T00:00:00.000Z`)

        const todayAmount = todayAmountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

        // Calculate success rate
        const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0


        return {
          id: partner.id,
          name: partner.name,
          shortCode: partner.short_code || partner.mpesa_shortcode || 'N/A',
          isActive: partner.is_active,
          isMpesaConfigured: partner.is_mpesa_configured,
          totalTransactions: totalTransactions || 0,
          successfulTransactions: successfulTransactions || 0,
          totalAmount: totalAmount,
          todayTransactions: todayTransactions || 0,
          todayAmount: todayAmount,
          successRate: Math.round(successRate * 100) / 100,
          createdAt: partner.created_at
        }
      })
    )

    // Sort partners by total amount (descending)
    partnerStats.sort((a, b) => b.totalAmount - a.totalAmount)


    return NextResponse.json({
      success: true,
      data: partnerStats
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
