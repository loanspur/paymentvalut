import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

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

    let partnersQuery = supabase
      .from('partners')
      .select('id, name, short_code, mpesa_shortcode')
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)

    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      partnersQuery = partnersQuery.eq('id', currentUser.partner_id)
    }

    const { data: partners, error: partnersError } = await partnersQuery

    if (partnersError) {
      return NextResponse.json(
        { error: 'Failed to fetch partners' },
        { status: 500 }
      )
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({
        success: true,
        partners: [],
        timestamp: new Date().toISOString()
      })
    }

    const partnerStatuses = await Promise.all(
      partners.map(async (partner) => {
        const { data: latestRequest, error: requestError } = await supabase
          .from('balance_requests')
          .select(`
            id,
            status,
            utility_account_balance,
            working_account_balance,
            charges_account_balance,
            created_at,
            updated_at,
            callback_received_at
          `)
          .eq('partner_id', partner.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const { data: latestCompleted, error: completedError } = await supabase
          .from('balance_requests')
          .select(`
            id,
            status,
            utility_account_balance,
            working_account_balance,
            charges_account_balance,
            created_at,
            updated_at,
            callback_received_at
          `)
          .eq('partner_id', partner.id)
          .eq('status', 'completed')
          .not('utility_account_balance', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        let dataFreshness = 'stale'
        let lastUpdated = null
        let currentBalance = null

        if (latestCompleted && !completedError) {
          const ageInMinutes = (Date.now() - new Date(latestCompleted.updated_at).getTime()) / (1000 * 60)
          dataFreshness = ageInMinutes < 5 ? 'fresh' : ageInMinutes < 60 ? 'recent' : 'stale'
          lastUpdated = latestCompleted.updated_at
          currentBalance = latestCompleted.utility_account_balance
        }

        let currentStatus = 'idle'
        let statusMessage = 'No recent balance checks'
        let progressPercentage = 0

        if (latestRequest && !requestError) {
          const requestAge = (Date.now() - new Date(latestRequest.created_at).getTime()) / 1000
          
          switch (latestRequest.status) {
            case 'pending':
              if (requestAge < 35) {
                currentStatus = 'checking'
                statusMessage = `Balance check in progress... (${Math.round(requestAge)}s)`
                progressPercentage = Math.min((requestAge / 35) * 100, 95)
              } else {
                currentStatus = 'timeout'
                statusMessage = 'Balance check timed out - no callback received'
                progressPercentage = 100
              }
              break
            case 'completed':
              currentStatus = 'completed'
              statusMessage = 'Balance check completed successfully'
              progressPercentage = 100
              break
            case 'failed':
              currentStatus = 'failed'
              statusMessage = 'Balance check failed'
              progressPercentage = 100
              break
            case 'timeout':
              currentStatus = 'timeout'
              statusMessage = 'Balance check timed out'
              progressPercentage = 100
              break
          }
        }

        return {
          partner_id: partner.id,
          partner_name: partner.name,
          short_code: partner.short_code,
          mpesa_shortcode: partner.mpesa_shortcode,
          current_status: currentStatus,
          status_message: statusMessage,
          progress_percentage: progressPercentage,
          current_balance: currentBalance,
          data_freshness: dataFreshness,
          last_updated: lastUpdated,
          latest_request: latestRequest ? {
            id: latestRequest.id,
            status: latestRequest.status,
            created_at: latestRequest.created_at,
            updated_at: latestRequest.updated_at,
            callback_received_at: latestRequest.callback_received_at
          } : null
        }
      })
    )

    const stats = {
      total_partners: partners.length,
      checking: partnerStatuses.filter(p => p.current_status === 'checking').length,
      completed: partnerStatuses.filter(p => p.current_status === 'completed').length,
      failed: partnerStatuses.filter(p => p.current_status === 'failed').length,
      timeout: partnerStatuses.filter(p => p.current_status === 'timeout').length,
      idle: partnerStatuses.filter(p => p.current_status === 'idle').length,
      fresh_data: partnerStatuses.filter(p => p.data_freshness === 'fresh').length,
      recent_data: partnerStatuses.filter(p => p.data_freshness === 'recent').length,
      stale_data: partnerStatuses.filter(p => p.data_freshness === 'stale').length
    }

    return NextResponse.json({
      success: true,
      partners: partnerStatuses,
      statistics: stats,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}