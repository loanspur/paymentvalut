import { NextRequest, NextResponse } from 'next/server'

// POST - Clear all authentication cookies to fix OTP redirect loop
export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Clearing all auth cookies to fix OTP redirect loop...')
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'All authentication cookies cleared successfully. Please refresh the page.'
    })

    // Clear all possible auth cookie variations
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 0, // Expire immediately
      path: '/', // Ensure it covers all paths
      expires: new Date(0) // Set to epoch time
    }

    // Clear auth_token cookie
    response.cookies.set('auth_token', '', cookieOptions)
    response.cookies.delete('auth_token')
    
    // Clear any other possible auth cookies
    response.cookies.set('session', '', cookieOptions)
    response.cookies.delete('session')
    
    response.cookies.set('token', '', cookieOptions)
    response.cookies.delete('token')
    
    console.log('✅ All auth cookies cleared successfully')
    return response

  } catch (error) {
    console.error('❌ Clear cookies error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to clear cookies'
    }, { status: 500 })
  }
}
