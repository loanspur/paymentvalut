import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // For now, filter by Kulman Group Limited partner ID directly
    // This will be replaced with proper authentication after server restart
    const kulmanPartnerId = '550e8400-e29b-41d4-a716-446655440000'
    
    // Get total transactions count
    const { count: totalTransactions, error: transactionsError } = await supabase
      .from('disbursement_requests')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', kulmanPartnerId)

    if (transactionsError) {
      // Handle error silently
    }

    // Get total amount disbursed
    const { data: amountData, error: amountError } = await supabase
      .from('disbursement_requests')
      .select('amount, status')
      .eq('partner_id', kulmanPartnerId)
      .eq('status', 'success')

    if (amountError) {
      // Handle error silently
    }

    const totalAmount = amountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

    // Get active partners count (should be 1 for Kulman)
    const { count: activePartners, error: partnersError } = await supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .eq('is_mpesa_configured', true)
      .eq('id', kulmanPartnerId)

    if (partnersError) {
      // Handle error silently
    }

    // Calculate success rate
    const { data: statusData, error: statusError } = await supabase
      .from('disbursement_requests')
      .select('status')
      .eq('partner_id', kulmanPartnerId)

    if (statusError) {
      // Handle error silently
    }

    const totalWithStatus = statusData?.length || 0
    const successfulTransactions = statusData?.filter(t => t.status === 'success').length || 0
    const successRate = totalWithStatus > 0 ? (successfulTransactions / totalWithStatus) * 100 : 0

    // Get today's transactions
    const today = new Date().toISOString().split('T')[0]
    const { count: todayTransactions, error: todayError } = await supabase
      .from('disbursement_requests')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', kulmanPartnerId)
      .gte('created_at', `${today}T00:00:00.000Z`)

    if (todayError) {
      // Handle error silently
    }

    // Get today's amount
    const { data: todayAmountData, error: todayAmountError } = await supabase
      .from('disbursement_requests')
      .select('amount, status')
      .eq('partner_id', kulmanPartnerId)
      .eq('status', 'success')
      .gte('created_at', `${today}T00:00:00.000Z`)

    if (todayAmountError) {
      // Handle error silently
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


    return NextResponse.json({
      success: true,
      data: stats
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
