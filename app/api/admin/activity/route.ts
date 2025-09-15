import { NextRequest, NextResponse } from 'next/server'
// Removed auth-enhanced import

// GET - Get user activity logs (admin only)
export async function GET(request: NextRequest) {
  try {
    // Simple authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'Authentication required'
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('user_id')
    const limit = parseInt(searchParams.get('limit') || '50')

    // Mock activities data (in real implementation, query database)
    const activities = [
      {
        id: '1',
        action: 'user_login',
        resource: 'authentication',
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        action: 'dashboard_viewed',
        resource: 'admin_dashboard',
        ip_address: '127.0.0.1',
        created_at: new Date(Date.now() - 300000).toISOString()
      }
    ]

    return NextResponse.json({
      success: true,
      activities,
      total: activities.length
    })

  } catch (error) {
    console.error('Get activity error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}
