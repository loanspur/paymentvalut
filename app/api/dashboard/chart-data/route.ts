import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import { jwtVerify } from 'jose'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

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
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production')
    const { payload } = await jwtVerify(token, secret)
    
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

    const { searchParams } = new URL(request.url)
    const dateRange = searchParams.get('dateRange') || '7d'
    const partnerId = searchParams.get('partnerId') || 'all'
    const chartType = searchParams.get('chartType') || 'daily'

    // Override partnerId based on user permissions
    let effectivePartnerId = partnerId
    if (currentUser.role !== 'super_admin' && currentUser.partner_id) {
      effectivePartnerId = currentUser.partner_id
    }

    // Calculate date range
    let days = 7
    switch (dateRange) {
      case '1d': days = 1; break
      case '7d': days = 7; break
      case '30d': days = 30; break
      case '90d': days = 90; break
    }

    const endDate = new Date()
    const startDate = subDays(endDate, days - 1)

    if (chartType === 'daily') {
      // Generate daily transaction data
      const dailyData = []
      for (let i = days - 1; i >= 0; i--) {
        const date = subDays(new Date(), i)
        const dayStart = startOfDay(date)
        const dayEnd = endOfDay(date)

        // Build query for this day
        let query = supabase
          .from('disbursement_requests')
          .select('amount, status, created_at')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString())

        if (effectivePartnerId !== 'all') {
          query = query.eq('partner_id', effectivePartnerId)
        }

        const { data: transactions, error } = await query

        if (error) {
          // Error fetching daily transactions
          continue
        }

        const totalTransactions = transactions?.length || 0
        const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
        const successfulTransactions = transactions?.filter(t => t.status === 'success').length || 0
        const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0

        dailyData.push({
          date: format(date, 'MMM dd'),
          transactions: totalTransactions,
          amount: totalAmount,
          successRate: Math.round(successRate * 100) / 100
        })
      }

      return NextResponse.json({
        success: true,
        data: dailyData
      })
    }

    if (chartType === 'status') {
      // Get status distribution
      let query = supabase
        .from('disbursement_requests')
        .select('status')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())

      if (effectivePartnerId !== 'all') {
        query = query.eq('partner_id', effectivePartnerId)
      }

      const { data: transactions, error } = await query

      if (error) {
        // Error fetching status data
        return NextResponse.json({ error: 'Failed to fetch status data' }, { status: 500 })
      }

      const statusCounts = transactions?.reduce((acc, transaction) => {
        acc[transaction.status] = (acc[transaction.status] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      const statusData = [
        { name: 'Success', value: statusCounts.success || 0, color: '#10B981' },
        { name: 'Failed', value: statusCounts.failed || 0, color: '#EF4444' },
        { name: 'Pending', value: statusCounts.pending || 0, color: '#F59E0B' },
        { name: 'Queued', value: statusCounts.queued || 0, color: '#6B7280' },
        { name: 'Accepted', value: statusCounts.accepted || 0, color: '#3B82F6' }
      ].filter(item => item.value > 0)

      return NextResponse.json({
        success: true,
        data: statusData
      })
    }

    if (chartType === 'partner') {
      // Get comprehensive partner performance data
      let partnersQuery = supabase
        .from('partners')
        .select('id, name, short_code, mpesa_shortcode')
        .eq('is_active', true)

      // Filter partners based on user permissions and requested partner
      if (effectivePartnerId && effectivePartnerId !== 'all') {
        partnersQuery = partnersQuery.eq('id', effectivePartnerId)
      }

      const { data: partners, error: partnersError } = await partnersQuery

      if (partnersError) {
        // Error fetching partners
        return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 })
      }

      const partnerData = await Promise.all(
        partners.map(async (partner) => {
          // Get transaction count using same method as dashboard cards
          let countQuery = supabase
            .from('disbursement_requests')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partner.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())

          const { count: totalTransactions, error: countError } = await countQuery

          if (countError) {
            return null
          }

          if (!totalTransactions || totalTransactions === 0) {
            return {
              name: partner.name,
              shortCode: partner.short_code || partner.mpesa_shortcode || 'N/A',
              totalTransactions: 0,
              totalAmount: 0,
              successfulTransactions: 0,
              failedTransactions: 0,
              successRate: 0,
              averageTransactionValue: 0,
              dailyPerformance: [],
              performanceScore: 0
            }
          }

          // Get transaction data for detailed analysis
          let overallQuery = supabase
            .from('disbursement_requests')
            .select('amount, status, created_at')
            .eq('partner_id', partner.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())

          const { data: transactions, error } = await overallQuery

          if (error) {
            return null
          }

          const totalAmount = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
          const successfulTransactions = transactions?.filter(t => t.status === 'success').length || 0
          const failedTransactions = transactions?.filter(t => t.status === 'failed').length || 0
          const actualTransactionCount = transactions?.length || 0
          const successRate = actualTransactionCount > 0 ? (successfulTransactions / actualTransactionCount) * 100 : 0
          const averageTransactionValue = actualTransactionCount > 0 ? totalAmount / actualTransactionCount : 0

          // Get daily performance data for time series
          const dailyData = new Map()
          transactions?.forEach(transaction => {
            const date = format(new Date(transaction.created_at), 'MMM dd')
            const existing = dailyData.get(date) || {
              date,
              transactions: 0,
              amount: 0,
              successful: 0,
              failed: 0
            }
            
            existing.transactions += 1
            existing.amount += transaction.amount || 0
            if (transaction.status === 'success') existing.successful += 1
            if (transaction.status === 'failed') existing.failed += 1
            
            dailyData.set(date, existing)
          })

          const dailyPerformance = Array.from(dailyData.values()).sort((a, b) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          )

          return {
            name: partner.name,
            shortCode: partner.short_code || partner.mpesa_shortcode || 'N/A',
            // Overall metrics
            totalTransactions: actualTransactionCount, // Use actual count for consistency
            totalAmount,
            successfulTransactions,
            failedTransactions,
            successRate: Math.round(successRate * 100) / 100,
            averageTransactionValue: Math.round(averageTransactionValue * 100) / 100,
            // Time series data
            dailyPerformance,
            // Performance indicators
            performanceScore: Math.round((successRate * 0.4 + (actualTransactionCount > 0 ? 100 : 0) * 0.3 + (totalAmount > 0 ? 100 : 0) * 0.3) * 100) / 100
          }
        })
      )

      // Sort by performance score for better visualization
      const sortedPartnerData = partnerData
        .filter(Boolean)
        .sort((a, b) => b.performanceScore - a.performanceScore)

      return NextResponse.json({
        success: true,
        data: sortedPartnerData
      })
    }

    if (chartType === 'balance') {
      // Get balance trends from balance_requests table
      const { data: balanceData, error } = await supabase
        .from('balance_requests')
        .select('utility_account_balance, working_account_balance, charges_account_balance, created_at')
        .eq('status', 'completed')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: true })

      if (error) {
        // Error fetching balance data
        return NextResponse.json({ error: 'Failed to fetch balance data' }, { status: 500 })
      }

      // Group by date and get latest balance for each day
      const dailyBalances = new Map()
      
      balanceData?.forEach(record => {
        const date = format(new Date(record.created_at), 'MMM dd')
        const existing = dailyBalances.get(date)
        
        if (!existing || new Date(record.created_at) > new Date(existing.created_at)) {
          dailyBalances.set(date, {
            date,
            utility: record.utility_account_balance || 0,
            working: record.working_account_balance || 0,
            charges: record.charges_account_balance || 0,
            created_at: record.created_at
          })
        }
      })

      const balanceTrends = Array.from(dailyBalances.values()).sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

      return NextResponse.json({
        success: true,
        data: balanceTrends
      })
    }

    // Helper: fetch all transactions for a partner within range (avoids 1k row cap)
    const fetchAllTransactions = async (partnerId: string) => {
      const pageSize = 1000
      let from = 0
      let all: any[] = []
      while (true) {
        let pageQuery = supabase
          .from('disbursement_requests')
          .select('amount, status, created_at')
          .eq('partner_id', partnerId)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: true })
          .range(from, from + pageSize - 1)

        const { data: page, error: pageError } = await pageQuery
        if (pageError) {
          break
        }
        all = all.concat(page || [])
        if (!page || page.length < pageSize) {
          break
        }
        from += pageSize
      }
      return all
    }

    if (chartType === 'transaction-analytics') {
      // Get comprehensive transaction analytics
      let partnersQuery = supabase
        .from('partners')
        .select('id, name, short_code, mpesa_shortcode')
        // Do not exclude inactive partners to match card totals behavior

      // Filter partners based on user permissions and requested partner
      if (effectivePartnerId && effectivePartnerId !== 'all') {
        partnersQuery = partnersQuery.eq('id', effectivePartnerId)
      }

      const { data: partners, error: partnersError } = await partnersQuery

      if (partnersError) {
        return NextResponse.json({ error: 'Failed to fetch partners' }, { status: 500 })
      }

      const analyticsData = await Promise.all(
        partners.map(async (partner) => {
          // Get transaction count using same method as dashboard cards
          let countQuery = supabase
            .from('disbursement_requests')
            .select('*', { count: 'exact', head: true })
            .eq('partner_id', partner.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())

          const { count: totalTransactions, error: countError } = await countQuery

          if (countError) {
            return null
          }

          if (!totalTransactions || totalTransactions === 0) {
            return {
              partnerId: partner.id,
              partnerName: partner.name,
              shortCode: partner.short_code || partner.mpesa_shortcode || 'N/A',
              averageTransactionAmount: 0,
              totalTransactions: 0,
              successfulTransactions: 0,
              failedTransactions: 0,
              transactionsPerHour: 0,
              transactionsPerMinute: 0,
              dailyAverages: [],
              hourlyDistribution: [],
              peakHours: []
            }
          }

          // Get full transaction data for detailed analysis (paginated)
          const transactions = await fetchAllTransactions(partner.id)

          // Calculate average transaction amount over time
          const dailyAverages = new Map()
          const hourlyDistribution = new Map()
          let totalAmount = 0
          let successfulTransactions = 0
          let failedTransactions = 0

          transactions.forEach(transaction => {
            // Align amount totals with dashboard cards: only successful amounts contribute
            if (transaction.status === 'success') {
              totalAmount += transaction.amount || 0
            }
            
            // Count successful and failed transactions
            if (transaction.status === 'success') {
              successfulTransactions++
            } else if (transaction.status === 'failed') {
              failedTransactions++
            }
            
            // Daily averages
            const date = format(new Date(transaction.created_at), 'MMM dd')
            const hour = new Date(transaction.created_at).getHours()
            
            if (!dailyAverages.has(date)) {
              dailyAverages.set(date, { date, totalAmount: 0, count: 0, average: 0 })
            }
            
            const dailyData = dailyAverages.get(date)
            dailyData.totalAmount += transaction.amount || 0
            dailyData.count += 1
            dailyData.average = dailyData.totalAmount / dailyData.count
            
            // Hourly distribution
            if (!hourlyDistribution.has(hour)) {
              hourlyDistribution.set(hour, { hour, count: 0, amount: 0 })
            }
            
            const hourlyData = hourlyDistribution.get(hour)
            hourlyData.count += 1
            hourlyData.amount += transaction.amount || 0
          })

          // Use the actual transaction count from data for consistency
          const actualTransactionCount = transactions?.length || 0
          const averageTransactionAmount = actualTransactionCount > 0 ? totalAmount / actualTransactionCount : 0
          
          // Calculate transactions per hour and minute
          const timeSpanHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
          const timeSpanMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
          
          const transactionsPerHour = timeSpanHours > 0 ? totalTransactions / timeSpanHours : 0
          const transactionsPerMinute = timeSpanMinutes > 0 ? totalTransactions / timeSpanMinutes : 0

          // Find peak hours (top 3 hours with most transactions)
          const peakHours = Array.from(hourlyDistribution.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3)
            .map(h => ({ hour: h.hour, count: h.count, amount: h.amount }))

          return {
            partnerId: partner.id,
            partnerName: partner.name,
            shortCode: partner.short_code || partner.mpesa_shortcode || 'N/A',
            averageTransactionAmount: Math.round(averageTransactionAmount * 100) / 100,
            totalTransactions: actualTransactionCount, // Use actual count for consistency
            totalAmount: totalAmount, // Add actual total amount
            successfulTransactions,
            failedTransactions,
            transactionsPerHour: Math.round(transactionsPerHour * 100) / 100,
            transactionsPerMinute: Math.round(transactionsPerMinute * 1000) / 1000,
            dailyAverages: Array.from(dailyAverages.values()).sort((a, b) => 
              new Date(a.date).getTime() - new Date(b.date).getTime()
            ),
            hourlyDistribution: Array.from(hourlyDistribution.values()).sort((a, b) => a.hour - b.hour),
            peakHours
          }
        })
      )

      return NextResponse.json({
        success: true,
        data: analyticsData.filter(Boolean)
      })
    }

    return NextResponse.json({ error: 'Invalid chart type' }, { status: 400 })

  } catch (error) {
    // Error fetching chart data
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
