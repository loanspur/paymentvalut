import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Get latest balance data for all tenants
export async function GET(request: NextRequest) {
  try {
    // Get all active partners with M-Pesa configuration
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code, mpesa_shortcode')
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)

    if (partnersError) {
      console.error('Error fetching partners:', partnersError)
      return NextResponse.json(
        { error: 'Failed to fetch partners' },
        { status: 500 }
      )
    }

    if (!partners || partners.length === 0) {
      return NextResponse.json({
        success: true,
        tenants: []
      })
    }

    // Get latest balance data for each partner from disbursement_requests
    const tenantBalances = await Promise.all(
      partners.map(async (partner) => {
        // Get the latest disbursement with balance data (any status, not just success)
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

        // Try to get balance data from both sources and use the most recent
        let balanceData = null
        let source = 'N/A'

        // First, try to get from disbursement_requests
        if (!disbursementError && latestDisbursement) {
          balanceData = {
            source: 'disbursement_requests',
            utility_balance: latestDisbursement.utility_balance_at_transaction,
            working_balance: latestDisbursement.working_balance_at_transaction,
            charges_balance: latestDisbursement.charges_balance_at_transaction,
            last_updated: latestDisbursement.balance_updated_at_transaction || latestDisbursement.updated_at
          }
          source = 'disbursement_requests'
        }

        // Also try to get from balance_requests (explicit balance checks)
        const { data: balanceRequest, error: balanceError } = await supabase
          .from('balance_requests')
          .select(`
            id,
            partner_id,
            status,
            balance_after,
            utility_account_balance,
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
          const balanceRequestTime = new Date(balanceRequest.updated_at || balanceRequest.created_at)
          const disbursementTime = balanceData ? new Date(balanceData.last_updated) : new Date(0)
          
          // Use balance_requests data if it's more recent or if no disbursement data
          if (balanceRequestTime > disbursementTime) {
            balanceData = {
              source: 'balance_requests',
              utility_balance: balanceRequest.utility_account_balance,
              working_balance: balanceRequest.balance_after,
              charges_balance: null,
              last_updated: balanceRequest.updated_at || balanceRequest.created_at
            }
            source = 'balance_requests'
          }
        }

        // If no balance data found, try to get the most recent transaction for this partner
        if (!balanceData) {
          const { data: recentTransaction, error: recentError } = await supabase
            .from('disbursement_requests')
            .select(`
              id,
              partner_id,
              status,
              created_at,
              updated_at
            `)
            .eq('partner_id', partner.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (!recentError && recentTransaction) {
            balanceData = {
              source: 'recent_transaction',
              utility_balance: null,
              working_balance: null,
              charges_balance: null,
              last_updated: recentTransaction.updated_at || recentTransaction.created_at
            }
            source = 'recent_transaction'
          }
        }

        // Debug logging
        console.log(`🔍 [Tenant Balances] Partner: ${partner.name}`, {
          hasBalanceData: !!balanceData,
          balanceData: balanceData,
          source: source,
          disbursementError: disbursementError?.message,
          balanceError: balanceError?.message
        })

        return {
          id: partner.id,
          name: partner.name,
          short_code: partner.short_code,
          mpesa_shortcode: partner.mpesa_shortcode,
          balance_data: balanceData ? { ...balanceData, source } : null
        }
      })
    )

    return NextResponse.json({
      success: true,
      tenants: tenantBalances
    })

  } catch (error: any) {
    console.error('Error fetching tenant balances:', error)
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
