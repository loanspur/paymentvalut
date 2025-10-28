import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 [Cron] Starting balance monitoring process...')
    
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

    // Get balance monitoring data
    const balanceData = await getBalanceMonitoringData()
    
    console.log('✅ [Cron] Balance monitoring completed successfully')
    console.log(`   Partners monitored: ${balanceData.partners_monitored}`)
    console.log(`   Low balance alerts: ${balanceData.low_balance_alerts}`)
    console.log(`   Total system balance: KSh ${balanceData.total_system_balance.toLocaleString()}`)
    
    return NextResponse.json({
      success: true,
      message: 'Balance monitoring completed',
      timestamp: new Date().toISOString(),
      data: balanceData
    })

  } catch (error) {
    console.error('❌ [Cron] Critical error in balance monitoring:', error)
    return NextResponse.json({
      success: false,
      error: 'Critical error in balance monitoring',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}

// Support POST requests as well for cron-job.org compatibility
export async function POST(request: NextRequest) {
  return GET(request)
}

async function getBalanceMonitoringData() {
  const { createClient } = await import('@supabase/supabase-js')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all partner wallets with partner information
  const { data: wallets, error: walletsError } = await supabase
    .from('partner_wallets')
    .select(`
      id,
      current_balance,
      last_topup_date,
      last_topup_amount,
      low_balance_threshold,
      partners (
        id,
        name,
        short_code,
        is_active
      )
    `)

  if (walletsError) {
    console.error('Error fetching wallets:', walletsError)
    throw new Error('Failed to fetch wallet data')
  }

  // Get system settings for low balance threshold
  const { data: lowBalanceSetting, error: settingError } = await supabase
    .from('system_settings')
    .select('setting_value')
    .eq('setting_key', 'low_balance_threshold')
    .single()

  const defaultLowBalanceThreshold = parseFloat(lowBalanceSetting?.setting_value || '1000')

  let lowBalanceAlerts = 0
  let totalSystemBalance = 0
  const balanceAlerts = []

  // Process each wallet
  for (const wallet of wallets || []) {
    const balance = wallet.current_balance || 0
    const partner = wallet.partners as any // Type assertion to fix TypeScript issue
    const threshold = wallet.low_balance_threshold || defaultLowBalanceThreshold
    
    totalSystemBalance += balance

    // Check for low balance
    if (balance < threshold && partner?.is_active) {
      lowBalanceAlerts++
      balanceAlerts.push({
        partner_id: partner.id,
        partner_name: partner.name,
        partner_short_code: partner.short_code,
        current_balance: balance,
        threshold: threshold,
        deficit: threshold - balance,
        last_topup_date: wallet.last_topup_date,
        last_topup_amount: wallet.last_topup_amount
      })
    }
  }

  return {
    partners_monitored: wallets?.length || 0,
    active_partners: wallets?.filter(w => (w.partners as any)?.is_active).length || 0,
    total_system_balance: totalSystemBalance,
    low_balance_alerts: lowBalanceAlerts,
    balance_alerts: balanceAlerts,
    average_balance: wallets?.length > 0 ? totalSystemBalance / wallets.length : 0,
    monitoring_threshold: defaultLowBalanceThreshold,
    
    // Balance distribution
    balance_distribution: {
      high_balance: wallets?.filter(w => (w.current_balance || 0) >= defaultLowBalanceThreshold * 5).length || 0,
      medium_balance: wallets?.filter(w => {
        const balance = w.current_balance || 0
        return balance >= defaultLowBalanceThreshold && balance < defaultLowBalanceThreshold * 5
      }).length || 0,
      low_balance: wallets?.filter(w => (w.current_balance || 0) < defaultLowBalanceThreshold).length || 0,
      zero_balance: wallets?.filter(w => (w.current_balance || 0) === 0).length || 0
    }
  }
}
