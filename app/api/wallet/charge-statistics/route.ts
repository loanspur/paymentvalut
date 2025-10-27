import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get all wallets
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select('id, partner_id')

    if (walletsError || !wallets || wallets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No wallets found' },
        { status: 404 }
      )
    }

    const walletIds = wallets.map(w => w.id)
    const now = new Date()
    
    // Calculate date ranges
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)

    // Get charge transactions for different periods
    const { data: todayCharges, error: todayError } = await supabase
      .from('wallet_transactions')
      .select('amount, metadata')
      .in('wallet_id', walletIds)
      .eq('transaction_type', 'charge')
      .gte('created_at', today.toISOString())

    const { data: weekCharges, error: weekError } = await supabase
      .from('wallet_transactions')
      .select('amount, metadata')
      .in('wallet_id', walletIds)
      .eq('transaction_type', 'charge')
      .gte('created_at', sevenDaysAgo.toISOString())

    const { data: monthCharges, error: monthError } = await supabase
      .from('wallet_transactions')
      .select('amount, metadata')
      .in('wallet_id', walletIds)
      .eq('transaction_type', 'charge')
      .gte('created_at', thirtyDaysAgo.toISOString())

    const { data: quarterCharges, error: quarterError } = await supabase
      .from('wallet_transactions')
      .select('amount, metadata')
      .in('wallet_id', walletIds)
      .eq('transaction_type', 'charge')
      .gte('created_at', ninetyDaysAgo.toISOString())

    // Calculate statistics
    const calculateStats = (charges: any[]) => {
      const totalAmount = charges.reduce((sum, charge) => sum + Math.abs(charge.amount), 0)
      const chargeTypes: Record<string, { count: number, amount: number }> = {}
      
      charges.forEach(charge => {
        const chargeName = charge.metadata?.charge_name || 'Unknown Charge'
        if (!chargeTypes[chargeName]) {
          chargeTypes[chargeName] = { count: 0, amount: 0 }
        }
        chargeTypes[chargeName].count += 1
        chargeTypes[chargeName].amount += Math.abs(charge.amount)
      })

      return {
        totalTransactions: charges.length,
        totalAmount,
        chargeTypes
      }
    }

    const stats = {
      today: calculateStats(todayCharges || []),
      week: calculateStats(weekCharges || []),
      month: calculateStats(monthCharges || []),
      quarter: calculateStats(quarterCharges || [])
    }

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('Charge Statistics GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
