import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Fetching dashboard statistics...')

    // Get total transactions count
    const { count: totalTransactions, error: transactionsError } = await supabase
      .from('disbursement_requests')
      .select('*', { count: 'exact', head: true })

    if (transactionsError) {
      console.error('Error fetching transactions count:', transactionsError)
    }

    // Get total amount disbursed
    const { data: amountData, error: amountError } = await supabase
      .from('disbursement_requests')
      .select('amount, status')
      .eq('status', 'success')

    if (amountError) {
      console.error('Error fetching amount data:', amountError)
    }

    const totalAmount = amountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

    // Get active partners count
    const { count: activePartners, error: partnersError } = await supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)

    if (partnersError) {
      console.error('Error fetching partners count:', partnersError)
    }

    // Calculate success rate
    const { data: statusData, error: statusError } = await supabase
      .from('disbursement_requests')
      .select('status')

    if (statusError) {
      console.error('Error fetching status data:', statusError)
    }

    const totalWithStatus = statusData?.length || 0
    const successfulTransactions = statusData?.filter(t => t.status === 'success').length || 0
    const successRate = totalWithStatus > 0 ? (successfulTransactions / totalWithStatus) * 100 : 0

    // Get today's transactions
    const today = new Date().toISOString().split('T')[0]
    const { count: todayTransactions, error: todayError } = await supabase
      .from('disbursement_requests')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${today}T00:00:00.000Z`)

    if (todayError) {
      console.error('Error fetching today transactions:', todayError)
    }

    // Get today's amount
    const { data: todayAmountData, error: todayAmountError } = await supabase
      .from('disbursement_requests')
      .select('amount, status')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .eq('status', 'success')

    if (todayAmountError) {
      console.error('Error fetching today amount:', todayAmountError)
    }

    const todayAmount = todayAmountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

    const stats = {
      totalTransactions: totalTransactions || 0,
      totalAmount: totalAmount,
      activePartners: activePartners || 0,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
      todayTransactions: todayTransactions || 0,
      todayAmount: todayAmount
    }

    console.log('✅ Dashboard stats fetched:', stats)

    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
