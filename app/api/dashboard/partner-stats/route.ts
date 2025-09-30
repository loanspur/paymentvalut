import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🏢 Fetching partner statistics...')

    // Get all active partners with their transaction counts and amounts
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select(`
        id,
        name,
        short_code,
        is_active,
        is_mpesa_configured,
        created_at
      `)
      .eq('is_active', true)

    if (partnersError) {
      console.error('Error fetching partners:', partnersError)
      return NextResponse.json(
        { error: 'Failed to fetch partners', details: partnersError.message },
        { status: 500 }
      )
    }

    // Get transaction statistics for each partner
    const partnerStats = await Promise.all(
      partners.map(async (partner) => {
        // Get total transactions for this partner
        const { count: totalTransactions, error: totalError } = await supabase
          .from('disbursement_requests')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', partner.id)

        // Get successful transactions for this partner
        const { count: successfulTransactions, error: successError } = await supabase
          .from('disbursement_requests')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', partner.id)
          .eq('status', 'success')

        // Get total amount for this partner
        const { data: amountData, error: amountError } = await supabase
          .from('disbursement_requests')
          .select('amount')
          .eq('partner_id', partner.id)
          .eq('status', 'success')

        const totalAmount = amountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

        // Get today's transactions for this partner
        const today = new Date().toISOString().split('T')[0]
        const { count: todayTransactions, error: todayError } = await supabase
          .from('disbursement_requests')
          .select('*', { count: 'exact', head: true })
          .eq('partner_id', partner.id)
          .gte('created_at', `${today}T00:00:00.000Z`)

        // Get today's amount for this partner
        const { data: todayAmountData, error: todayAmountError } = await supabase
          .from('disbursement_requests')
          .select('amount')
          .eq('partner_id', partner.id)
          .eq('status', 'success')
          .gte('created_at', `${today}T00:00:00.000Z`)

        const todayAmount = todayAmountData?.reduce((sum, transaction) => sum + (transaction.amount || 0), 0) || 0

        // Calculate success rate
        const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0


        return {
          id: partner.id,
          name: partner.name,
          shortCode: partner.short_code,
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

    console.log(`✅ Fetched statistics for ${partnerStats.length} partners`)

    return NextResponse.json({
      success: true,
      data: partnerStats
    })

  } catch (error) {
    console.error('❌ Error fetching partner statistics:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
