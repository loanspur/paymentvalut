import { NextRequest, NextResponse } from 'next/server'

// GET - List all users with permissions and shortcode access
// DEPRECATED: Use /api/user-management instead
// This route is kept for backward compatibility but should redirect to /api/user-management
export async function GET(request: NextRequest) {
  return NextResponse.json({
    error: 'Deprecated',
    message: 'This endpoint is deprecated. Please use /api/user-management instead',
    redirect: '/api/user-management'
  }, { status: 410 }) // 410 Gone - indicates resource is permanently unavailable
}

// POST - Create new user with permissions and shortcode access
// DEPRECATED: Use /api/user-management instead
export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'Deprecated',
    message: 'This endpoint is deprecated. Please use /api/user-management instead',
    redirect: '/api/user-management'
  }, { status: 410 }) // 410 Gone - indicates resource is permanently unavailable
}
