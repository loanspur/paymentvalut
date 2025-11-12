import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 [Retry API] Manual retry trigger received')
    
    const { disbursement_id, force_retry = false } = await request.json()

    if (disbursement_id) {
      // Retry specific disbursement
      console.log(`🔄 [Retry API] Retrying specific disbursement: ${disbursement_id}`)
      
      const { data: disbursement, error: fetchError } = await supabase
        .from('disbursement_requests')
        .select(`
          *,
          partners!inner (
            id,
            name,
            api_key
          )
        `)
        .eq('id', disbursement_id)
        .single()

      if (fetchError || !disbursement) {
        return NextResponse.json(
          { success: false, error: 'Disbursement not found' },
          { status: 404 }
        )
      }

      // Check if disbursement is eligible for retry
      if (!force_retry && disbursement.status === 'success') {
        return NextResponse.json(
          { success: false, error: 'Disbursement already successful' },
          { status: 400 }
        )
      }

      if (!force_retry && disbursement.retry_count >= disbursement.max_retries) {
        return NextResponse.json(
          { success: false, error: 'Maximum retry attempts exceeded' },
          { status: 400 }
        )
      }

      // Call the retry Edge Function
      const retryResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/disburse-retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({ disbursement_id })
      })

      const retryResult = await retryResponse.json()

      return NextResponse.json({
        success: retryResult.success,
        message: retryResult.message || 'Retry process completed',
        disbursement_id,
        result: retryResult
      })

    } else {
      // Retry all eligible disbursements
      console.log('🔄 [Retry API] Retrying all eligible disbursements')
      
      // Call the retry Edge Function
      const retryResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/disburse-retry`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({})
      })

      const retryResult = await retryResponse.json()

      return NextResponse.json({
        success: retryResult.success,
        message: retryResult.message || 'Retry process completed',
        retry_count: retryResult.retry_count || 0,
        success_count: retryResult.success_count || 0,
        failure_count: retryResult.failure_count || 0,
        processed: retryResult.processed || []
      })
    }

  } catch (error) {
    console.error('❌ [Retry API] Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    // Get current user from database to get partner_id and role
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active')
      .eq('id', payload.userId)
      .single()

    if (userError || !user || !user.is_active) {
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const requestedPartnerId = searchParams.get('partner_id')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Determine which partner's disbursements to query - SECURITY: Enforce partner isolation
    let partnerId: string | null = null
    
    if (user.role === 'super_admin') {
      // Only super_admin can query any partner
      partnerId = requestedPartnerId || null
    } else {
      // All other users (including admin) can only access their own partner
      if (!user.partner_id) {
        return NextResponse.json(
          { success: false, error: 'No partner assigned to user' },
          { status: 400 }
        )
      }
      
      partnerId = user.partner_id
      
      // If they requested a different partner, deny access
      if (requestedPartnerId && requestedPartnerId !== user.partner_id) {
        return NextResponse.json(
          { success: false, error: 'Access denied: You can only view your own partner\'s disbursements' },
          { status: 403 }
        )
      }
    }

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner filter required' },
        { status: 400 }
      )
    }

    // Build query for disbursements with retry information
    let query = supabase
      .from('disbursement_requests')
      .select(`
        *,
        partners!inner (
          id,
          name
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply partner filter - SECURITY: Always filter by partner
    query = query.eq('partner_id', partnerId)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: disbursements, error, count } = await query

    if (error) {
      console.error('Error fetching disbursements:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch disbursements' },
        { status: 500 }
      )
    }

    // Get retry logs for each disbursement
    const disbursementIds = disbursements?.map(d => d.id) || []
    let retryLogs: any[] = []
    
    if (disbursementIds.length > 0) {
      const { data: logs, error: logsError } = await supabase
        .from('disbursement_retry_logs')
        .select('*')
        .in('disbursement_id', disbursementIds)
        .order('retry_attempt', { ascending: false })

      if (!logsError && logs) {
        retryLogs = logs
      }
    }

    // Group retry logs by disbursement ID
    const retryLogsMap = retryLogs.reduce((acc, log) => {
      if (!acc[log.disbursement_id]) {
        acc[log.disbursement_id] = []
      }
      acc[log.disbursement_id].push(log)
      return acc
    }, {} as Record<string, any[]>)

    // Transform data to include retry information
    const transformedData = disbursements?.map(disbursement => ({
      ...disbursement,
      partner_name: disbursement.partners?.name,
      retry_logs: retryLogsMap[disbursement.id] || [],
      can_retry: disbursement.status !== 'success' && 
                 disbursement.retry_count < disbursement.max_retries,
      next_retry_at_formatted: disbursement.next_retry_at ? 
        new Date(disbursement.next_retry_at).toLocaleString() : null
    })) || []

    // Get summary statistics - SECURITY: Filter by partner for summary too
    const { data: summaryData, error: summaryError } = await supabase
      .from('disbursement_requests')
      .select('status, retry_count, created_at')
      .eq('partner_id', partnerId)

    if (summaryError) {
      console.error('Error fetching summary data:', summaryError)
    }

    const summary = {
      total_disbursements: summaryData?.length || 0,
      successful_disbursements: summaryData?.filter(d => d.status === 'success').length || 0,
      failed_disbursements: summaryData?.filter(d => d.status === 'failed').length || 0,
      pending_disbursements: summaryData?.filter(d => d.status === 'pending').length || 0,
      disbursements_with_retries: summaryData?.filter(d => d.retry_count > 0).length || 0,
      max_retry_count: Math.max(...(summaryData?.map(d => d.retry_count) || [0])),
      today_disbursements: summaryData?.filter(d => {
        const today = new Date().toISOString().split('T')[0]
        return d.created_at?.startsWith(today)
      }).length || 0
    }

    return NextResponse.json({
      success: true,
      data: transformedData,
      summary,
      pagination: {
        page,
        limit,
        offset,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limit),
        has_more: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('❌ [Retry API] GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}








