import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select(`
        id,
        name,
        is_active,
        created_at
      `)

    if (partnersError) {
      console.error('Error fetching partners:', partnersError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch partners' },
        { status: 500 }
      )
    }

    // Force fresh data by ordering by updated_at desc to get latest changes first
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select(`
        id,
        partner_id,
        current_balance,
        currency,
        last_topup_date,
        last_topup_amount,
        low_balance_threshold,
        sms_notifications_enabled,
        created_at,
        updated_at
      `)
      .order('updated_at', { ascending: false })

    if (walletsError) {
      console.error('Error fetching wallets:', walletsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallets' },
        { status: 500 }
      )
    }

    // Create a map of partner_id to wallet
    const walletMap = new Map()
    wallets?.forEach(wallet => {
      walletMap.set(wallet.partner_id, wallet)
    })

    // Get transaction summaries for each partner
    const partnerIds = partners?.map(p => p.id) || []
    let transactionSummaries: Record<string, any> = {}

    if (partnerIds.length > 0) {
      const walletIds = wallets?.map(w => w.id) || []
      
      if (walletIds.length > 0) {
        // Get transaction counts by type for each wallet
        // Order by created_at desc to ensure we get the latest transactions first
        // Use a timestamp query parameter to prevent caching
        const { data: transactions, error: transactionsError } = await supabase
          .from('wallet_transactions')
          .select('wallet_id, transaction_type, status, created_at')
          .in('wallet_id', walletIds)
          .order('created_at', { ascending: false })

        if (!transactionsError && transactions) {
          // Group transactions by wallet_id
          const walletTransactionMap: Record<string, any[]> = {}
          transactions.forEach(t => {
            if (!walletTransactionMap[t.wallet_id]) {
              walletTransactionMap[t.wallet_id] = []
            }
            walletTransactionMap[t.wallet_id].push(t)
          })

          // Create summaries for each partner
          wallets?.forEach(wallet => {
            const walletTransactions = walletTransactionMap[wallet.id] || []
            transactionSummaries[wallet.partner_id] = {
              total_transactions: walletTransactions.length,
              // Include both top_up and manual_credit in topups count (both are credits to wallet)
              total_topups: walletTransactions.filter(t => 
                t.transaction_type === 'top_up' || t.transaction_type === 'manual_credit'
              ).length,
              total_disbursements: walletTransactions.filter(t => 
                t.transaction_type === 'disbursement' || 
                (t.transaction_type === 'charge' && 
                 (t.description?.includes('Disbursement charge') || 
                  t.metadata?.disbursement_id))
              ).length,
              total_float_purchases: walletTransactions.filter(t => t.transaction_type === 'b2c_float_purchase').length,
              total_charges: walletTransactions.filter(t => t.transaction_type === 'charge').length,
              total_manual_credits: walletTransactions.filter(t => t.transaction_type === 'manual_credit').length,
              total_manual_debits: walletTransactions.filter(t => t.transaction_type === 'manual_debit').length,
              completed_transactions: walletTransactions.filter(t => t.status === 'completed').length,
              pending_transactions: walletTransactions.filter(t => t.status === 'pending').length,
              failed_transactions: walletTransactions.filter(t => t.status === 'failed').length
            }
          })
        }
      }
    }

    // Transform the data to include wallet and transaction information
    const transformedPartners = partners?.map(partner => {
      const wallet = walletMap.get(partner.id) || null
      const transactionSummary = transactionSummaries[partner.id] || {
        total_transactions: 0,
        total_topups: 0,
        total_disbursements: 0,
        total_float_purchases: 0,
        total_charges: 0,
        total_manual_credits: 0,
        total_manual_debits: 0,
        completed_transactions: 0,
        pending_transactions: 0,
        failed_transactions: 0
      }

      return {
        id: wallet?.id || `wallet-${partner.id}`,
        partner_id: partner.id,
        partner_name: partner.name,
        current_balance: wallet?.current_balance || 0,
        currency: wallet?.currency || 'KES',
        last_topup_date: wallet?.last_topup_date,
        last_topup_amount: wallet?.last_topup_amount,
        low_balance_threshold: wallet?.low_balance_threshold || 1000,
        sms_notifications_enabled: wallet?.sms_notifications_enabled || false,
        is_active: partner.is_active,
        created_at: wallet?.created_at || partner.created_at,
        updated_at: wallet?.updated_at,
        ...transactionSummary
      }
    }) || []

    return NextResponse.json({
      success: true,
      data: transformedPartners,
      summary: {
        total_partners: transformedPartners.length,
        active_partners: transformedPartners.filter(p => p.is_active).length,
        total_balance: transformedPartners.reduce((sum, p) => sum + p.current_balance, 0),
        low_balance_partners: transformedPartners.filter(p => p.current_balance < p.low_balance_threshold).length,
        total_transactions: transformedPartners.reduce((sum, p) => sum + p.total_transactions, 0)
      }
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    console.error('Admin Partners GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
