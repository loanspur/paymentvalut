import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWTToken } from './lib/jwt-utils'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function middleware(request: NextRequest) {
  // Public routes that don't need protection
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup', '/request-password-reset', '/reset-password']
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  // Skip middleware for API routes and static files
  if (request.nextUrl.pathname.startsWith('/api/') || 
      request.nextUrl.pathname.startsWith('/_next/') ||
      request.nextUrl.pathname.startsWith('/favicon.ico')) {
    return NextResponse.next()
  }

  // Check if user is authenticated
  const token = request.cookies.get('auth_token')?.value
  const decoded = token ? await verifyJWTToken(token) : null

  // Skip middleware for public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protect all other routes
  if (!token) {
    console.log('🔒 No auth token found, redirecting to login')
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  if (!decoded) {
    console.log('🔒 Invalid auth token, redirecting to login')
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  // Check if token is expired
  if (decoded.exp && Date.now() >= decoded.exp * 1000) {
    console.log('🔒 Token expired, redirecting to login')
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  // Check if OTP validation is required and completed
  // Check current OTP settings from database to handle configuration changes
  try {
    const { data: otpSettings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('setting_key', 'login_otp_enabled')
      .single()

    const otpEnabled = otpSettings?.setting_value === 'true'
    
    // Only check OTP validation if:
    // 1. OTP is currently enabled in the system, AND
    // 2. The token indicates OTP is required, AND  
    // 3. The token indicates OTP is not validated
    if (otpEnabled && decoded.requiresOTP && !decoded.otpValidated) {
      console.log('🔒 OTP validation required but not completed, redirecting to login')
      return NextResponse.redirect(new URL('/secure-login', request.url))
    }
  } catch (error) {
    console.error('❌ Error checking OTP settings in middleware:', error)
    // If we can't check OTP settings, fall back to token-based check
    if (decoded.requiresOTP && !decoded.otpValidated) {
      console.log('🔒 OTP validation required but not completed (fallback check), redirecting to login')
      return NextResponse.redirect(new URL('/secure-login', request.url))
    }
  }

  // Additional role-based protection for admin routes
  if (request.nextUrl.pathname.startsWith('/admin-dashboard') && decoded && !['admin', 'super_admin'].includes(decoded.role as string)) {
    console.log('🔒 Insufficient permissions for admin route, redirecting to login')
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  console.log('✅ User authenticated, allowing access to:', request.nextUrl.pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
