import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWTToken } from './lib/jwt-utils'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for API routes, static files, and assets
  // IMPORTANT: Check _next paths FIRST before any other logic to prevent MIME type errors
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/api/') || 
    pathname === '/favicon.ico' ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/static/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot|json|map)$/i)
  ) {
    // Return immediately without any processing to ensure static files are served correctly
    return NextResponse.next()
  }

  // Public routes that don't need protection
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup', '/request-password-reset', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next (all Next.js internal paths - static files, chunks, etc.)
     * - favicon.ico (favicon file)
     * - static (static files)
     * - files with extensions (images, fonts, etc.)
     * 
     * Using non-capturing groups (?:...) to avoid "capturing groups not allowed" error
     */
    '/((?!api|_next|favicon\\.ico|static|.*\\.(?:ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot|json|map)).*)',
  ],
}
