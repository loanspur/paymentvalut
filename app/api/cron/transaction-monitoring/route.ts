import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting transaction monitoring process...')
    
    // Verify this is a legitimate cron request from cron-job.org
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    
    if (!cronSecret) {
      console.error('❌ [Cron] CRON_SECRET not configured')
      return NextResponse.json({ error: 'Cron secret not configured' }, { status: 500 })
    }
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('❌ [Cron] Unauthorized cron request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get transaction monitoring data
    const monitoringData = await getTransactionMonitoringData()
    
    console.log('✅ [Cron] Transaction monitoring completed successfully')
    console.log(`   Total transactions today: ${monitoringData.today_transactions}`)
    console.log(`   Total amount today: KSh ${monitoringData.today_amount.toLocaleString()}`)
    console.log(`   Failed transactions: ${monitoringData.failed_transactions}`)
    console.log(`   Pending transactions: ${monitoringData.pending_transactions}`)
    
    return NextResponse.json({
      success: true,
      message: 'Transaction monitoring completed',
      timestamp: new Date().toISOString(),
      data: monitoringData
    })

  } catch (error) {
    console.error('❌ [Cron] Critical error in transaction monitoring:', error)
    return NextResponse.json({
      success: false,
      error: 'Critical error in transaction monitoring',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support POST requests as well for cron-job.org compatibility
export async function POST(request: NextRequest) {
  return GET(request)
}

async function getTransactionMonitoringData() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // Get C2B transactions summary
  const { data: c2bTransactions, error: c2bError } = await supabase
    .from('c2b_transactions')
    .select('amount, status, created_at, partner_id')

  if (c2bError) {
    console.error('Error fetching C2B transactions:', c2bError)
  }

  // Get wallet transactions summary
  const { data: walletTransactions, error: walletError } = await supabase
    .from('wallet_transactions')
    .select('amount, status, transaction_type, created_at')

  if (walletError) {
    console.error('Error fetching wallet transactions:', walletError)
  }

  // Get disbursement requests summary
  const { data: disbursements, error: disbursementError } = await supabase
    .from('disbursement_requests')
    .select('amount, status, created_at')

  if (disbursementError) {
    console.error('Error fetching disbursements:', disbursementError)
  }

  // Calculate monitoring metrics
  const allTransactions = [
    ...(c2bTransactions || []).map(t => ({ ...t, type: 'c2b' })),
    ...(walletTransactions || []).map(t => ({ ...t, type: 'wallet' })),
    ...(disbursements || []).map(t => ({ ...t, type: 'disbursement' }))
  ]

  const todayTransactions = allTransactions.filter(t => 
    new Date(t.created_at) >= today
  )

  const yesterdayTransactions = allTransactions.filter(t => 
    new Date(t.created_at) >= yesterday && new Date(t.created_at) < today
  )

  const weekTransactions = allTransactions.filter(t => 
    new Date(t.created_at) >= weekAgo
  )

  return {
    // Today's metrics
    today_transactions: todayTransactions.length,
    today_amount: todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    
    // Yesterday's metrics
    yesterday_transactions: yesterdayTransactions.length,
    yesterday_amount: yesterdayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    
    // Week's metrics
    week_transactions: weekTransactions.length,
    week_amount: weekTransactions.reduce((sum, t) => sum + (t.amount || 0), 0),
    
    // Status breakdown
    failed_transactions: allTransactions.filter(t => t.status === 'failed').length,
    pending_transactions: allTransactions.filter(t => t.status === 'pending').length,
    completed_transactions: allTransactions.filter(t => t.status === 'completed' || t.status === 'success').length,
    
    // Transaction type breakdown
    c2b_transactions: (c2bTransactions || []).length,
    wallet_transactions: (walletTransactions || []).length,
    disbursement_transactions: (disbursements || []).length,
    
    // Partner allocation
    allocated_transactions: (c2bTransactions || []).filter(t => t.partner_id).length,
    unallocated_transactions: (c2bTransactions || []).filter(t => !t.partner_id).length,
    
    // System health indicators
    system_health: {
      failed_rate: allTransactions.length > 0 ? 
        (allTransactions.filter(t => t.status === 'failed').length / allTransactions.length * 100).toFixed(2) : '0',
      pending_rate: allTransactions.length > 0 ? 
        (allTransactions.filter(t => t.status === 'pending').length / allTransactions.length * 100).toFixed(2) : '0',
      success_rate: allTransactions.length > 0 ? 
        (allTransactions.filter(t => t.status === 'completed' || t.status === 'success').length / allTransactions.length * 100).toFixed(2) : '0'
    }
  }
}
