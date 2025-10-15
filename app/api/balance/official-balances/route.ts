import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Official balance API - Single source of truth for balance data
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
    const payload = await verifyJWTToken(token)
    
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
    let partnersQuery = supabase
      .from('partners')
      .select('id, name, short_code, mpesa_shortcode')
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)

    // If user is not super_admin, limit to their partner
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

    // Get official balance data for each partner with proper priority
    const partnerBalances = await Promise.all(
      partners.map(async (partner) => {
        let officialBalanceData = null
        let dataSource = 'none'
        let dataFreshness = 'stale'
        let lastUpdated = null

        // PRIORITY 1: Get from balance_requests (explicit balance checks) - HIGHEST PRIORITY
        const { data: balanceRequest, error: balanceError } = await supabase
          .from('balance_requests')
          .select(`
            id,
            partner_id,
            status,
            utility_account_balance,
            working_account_balance,
            charges_account_balance,
            created_at,
            updated_at
          `)
          .eq('partner_id', partner.id)
          .eq('status', 'completed')
          .not('utility_account_balance', 'is', null)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single()

        if (!balanceError && balanceRequest) {
          const balanceAge = Date.now() - new Date(balanceRequest.updated_at || balanceRequest.created_at).getTime()
          const ageInHours = balanceAge / (1000 * 60 * 60)
          
          officialBalanceData = {
            utility_balance: balanceRequest.utility_account_balance,
            working_balance: balanceRequest.working_account_balance,
            charges_balance: balanceRequest.charges_account_balance,
            last_updated: balanceRequest.updated_at || balanceRequest.created_at
          }
          dataSource = 'balance_check'
          dataFreshness = ageInHours < 1 ? 'fresh' : ageInHours < 24 ? 'recent' : 'stale'
          lastUpdated = balanceRequest.updated_at || balanceRequest.created_at
        }

        // PRIORITY 2: Fallback to disbursement_requests (transaction balance data) - ONLY IF NO BALANCE CHECK DATA
        if (!officialBalanceData) {
          const { data: latestDisbursement, error: disbursementError } = await supabase
            .from('disbursement_requests')
            .select(`
              id,
              partner_id,
              status,
              utility_balance_at_transaction,
              working_balance_at_transaction,
              charges_balance_at_transaction,
              balance_updated_at_transaction,
              created_at,
              updated_at
            `)
            .eq('partner_id', partner.id)
            .not('utility_balance_at_transaction', 'is', null)
            .order('balance_updated_at_transaction', { ascending: false })
            .limit(1)
            .single()

          if (!disbursementError && latestDisbursement) {
            const balanceAge = Date.now() - new Date(latestDisbursement.balance_updated_at_transaction || latestDisbursement.updated_at).getTime()
            const ageInHours = balanceAge / (1000 * 60 * 60)
            
            officialBalanceData = {
              utility_balance: latestDisbursement.utility_balance_at_transaction,
              working_balance: latestDisbursement.working_balance_at_transaction,
              charges_balance: latestDisbursement.charges_balance_at_transaction,
              last_updated: latestDisbursement.balance_updated_at_transaction || latestDisbursement.updated_at
            }
            dataSource = 'transaction'
            dataFreshness = ageInHours < 1 ? 'fresh' : ageInHours < 24 ? 'recent' : 'stale'
            lastUpdated = latestDisbursement.balance_updated_at_transaction || latestDisbursement.updated_at
          }
        }

        // Calculate balance status based on utility balance
        let balanceStatus = 'healthy'
        if (officialBalanceData && officialBalanceData.utility_balance !== null) {
          if (officialBalanceData.utility_balance < 1000) {
            balanceStatus = 'critical'
          } else if (officialBalanceData.utility_balance < 5000) {
            balanceStatus = 'warning'
          }
        }

        return {
          id: partner.id,
          name: partner.name,
          short_code: partner.short_code,
          mpesa_shortcode: partner.mpesa_shortcode,
          // Standardized balance data structure
          balance_data: officialBalanceData ? {
            // Primary balance fields (standardized)
            utility_balance: officialBalanceData.utility_balance,
            working_balance: officialBalanceData.working_balance,
            charges_balance: officialBalanceData.charges_balance,
            last_updated: officialBalanceData.last_updated,
            
            // Metadata
            data_source: dataSource,
            data_freshness: dataFreshness,
            balance_status: balanceStatus,
            
            // Legacy field mapping for backward compatibility
            currentBalance: officialBalanceData.utility_balance,
            lastChecked: officialBalanceData.last_updated,
            source: dataSource
          } : null,
          
          // Partner metadata
          has_balance_data: !!officialBalanceData,
          balance_status: balanceStatus,
          data_freshness: dataFreshness,
          last_balance_update: lastUpdated
        }
      })
    )

    return NextResponse.json({
      success: true,
      partners: partnerBalances,
      metadata: {
        total_partners: partners.length,
        partners_with_balance: partnerBalances.filter(p => p.has_balance_data).length,
        fresh_data_count: partnerBalances.filter(p => p.data_freshness === 'fresh').length,
        recent_data_count: partnerBalances.filter(p => p.data_freshness === 'recent').length,
        stale_data_count: partnerBalances.filter(p => p.data_freshness === 'stale').length
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    // Error fetching official balance data
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

// Trigger balance refresh for all partners
export async function POST(request: NextRequest) {
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
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json({
        error: 'Invalid authentication',
        message: 'Invalid token'
      }, { status: 401 })
    }

    const body = await request.json()
    const { force_refresh = true, partner_id } = body

    // Call the balance trigger API to refresh balance data
    const triggerResponse = await fetch(`${request.nextUrl.origin}/api/balance/trigger-check`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `auth_token=${token}`
      },
      body: JSON.stringify({
        partner_id,
        all_tenants: !partner_id,
        force_check: force_refresh
      })
    })

    if (!triggerResponse.ok) {
      const errorData = await triggerResponse.json()
      return NextResponse.json(
        { 
          error: 'Failed to trigger balance refresh',
          details: errorData.error || 'Unknown error'
        },
        { status: 500 }
      )
    }

    const triggerResult = await triggerResponse.json()

    return NextResponse.json({
      success: true,
      message: 'Balance refresh triggered successfully',
      trigger_result: triggerResult,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    // Error triggering balance refresh
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
