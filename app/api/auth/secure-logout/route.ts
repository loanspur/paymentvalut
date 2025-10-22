import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Processing logout request...')
    
    // Create response
    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    })

    // Clear the auth cookie with multiple approaches to ensure it's cleared
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: 0, // Expire immediately
      path: '/', // Ensure it covers all paths
      expires: new Date(0) // Set to epoch time
    }

    // Set empty cookie to clear it
    response.cookies.set('auth_token', '', cookieOptions)
    
    // Also try to delete the cookie explicitly
    response.cookies.delete('auth_token')
    
    console.log('✅ Auth cookie cleared successfully')
    return response

  } catch (error) {
    console.error('❌ Logout error:', error)
    return NextResponse.json({
      success: false,
      error: 'Logout failed'
    }, { status: 500 })
  }
}