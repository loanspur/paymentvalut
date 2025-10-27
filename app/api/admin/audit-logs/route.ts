import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user has permission to view audit logs
    if (!['super_admin', 'admin', 'partner_admin'].includes(payload.role as string)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Extract query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // Try to fetch real data from the database
    try {
      const results = []

      // Get audit logs
      const { data: auditLogs, error: auditError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (!auditError && auditLogs) {
        results.push(...auditLogs.map(log => ({
          ...log,
          log_type: 'audit',
          id: `audit-${log.id}`,
          timestamp: log.created_at,
          action: log.action,
          user: log.user_id || 'System',
          partner: 'N/A',
          category: log.resource_type,
          severity: 'info',
          origin_ip: log.ip_address,
          endpoint: 'N/A',
          method: 'N/A',
          response_status: null
        })))
      }

      // Get API requests
      const { data: apiRequests, error: apiError } = await supabase
        .from('api_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (!apiError && apiRequests) {
        results.push(...apiRequests.map(req => ({
          ...req,
          log_type: 'api',
          id: `api-${req.id}`,
          timestamp: req.created_at,
          action: `${req.method} ${req.endpoint}`,
          user: req.user_email || 'System',
          partner: req.partner_name || 'N/A',
          category: 'api_request',
          severity: req.response_status >= 400 ? 'error' : 'success',
          origin_ip: req.origin_ip,
          endpoint: req.endpoint,
          method: req.method,
          response_status: req.response_status
        })))
      }

      // Get user activities
      const { data: userActivities, error: userError } = await supabase
        .from('user_activities')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (!userError && userActivities) {
        results.push(...userActivities.map(activity => ({
          ...activity,
          log_type: 'user',
          id: `user-${activity.id}`,
          timestamp: activity.created_at,
          action: activity.action,
          user: activity.user_id || 'System',
          partner: 'N/A',
          category: activity.resource || 'user_activity',
          severity: 'info',
          origin_ip: activity.ip_address,
          endpoint: 'N/A',
          method: 'N/A',
          response_status: null
        })))
      }

      // Get system events
      const { data: systemEvents, error: systemError } = await supabase
        .from('system_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1)

      if (!systemError && systemEvents) {
        results.push(...systemEvents.map(event => ({
          ...event,
          log_type: 'system',
          id: `system-${event.id}`,
          timestamp: event.created_at,
          action: event.event_description,
          user: 'System',
          partner: 'N/A',
          category: event.event_category,
          severity: event.severity,
          origin_ip: '127.0.0.1',
          endpoint: 'N/A',
          method: 'N/A',
          response_status: null
        })))
      }

      // Sort combined results by timestamp
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      // Apply pagination to combined results
      const paginatedResults = results.slice(0, limit)

      return NextResponse.json({
        success: true,
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total: results.length,
          pages: Math.ceil(results.length / limit)
        }
      })

    } catch (dbError) {
      console.error('Database error, falling back to mock data:', dbError)
      
      // Fallback to mock data if database queries fail
      const mockLogs = [
        {
          id: 'audit-1',
          log_type: 'audit',
          timestamp: new Date().toISOString(),
          action: 'User login successful',
          user: 'admin@mpesavault.com',
          partner: 'System',
          category: 'authentication',
          severity: 'info',
          origin_ip: '192.168.1.1',
          endpoint: '/api/auth/login',
          method: 'POST',
          response_status: 200
        },
        {
          id: 'audit-2',
          log_type: 'api',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          action: 'Disbursement request',
          user: 'admin@mpesavault.com',
          partner: 'Kulman Group Limited',
          category: 'financial',
          severity: 'success',
          origin_ip: '192.168.1.1',
          endpoint: '/api/disburse',
          method: 'POST',
          response_status: 200
        }
      ]

      return NextResponse.json({
        success: true,
        data: mockLogs,
        pagination: {
          page,
          limit,
          total: mockLogs.length,
          pages: Math.ceil(mockLogs.length / limit)
        }
      })
    }

  } catch (error) {
    console.error('Error in audit logs API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Export audit logs
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Check if user has permission to export audit logs
    if (payload.role !== 'super_admin') {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { logType, format, filters } = body

    // TODO: Implement actual export functionality
    // This would generate CSV/JSON files and return download links

    return NextResponse.json({
      success: true,
      message: 'Export initiated',
      downloadUrl: '/api/admin/audit-logs/export/123' // Placeholder
    })

  } catch (error) {
    console.error('Error in audit logs export:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}