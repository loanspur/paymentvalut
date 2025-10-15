import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWTToken } from './lib/jwt-utils'

export async function middleware(request: NextRequest) {
  // Public routes that don't need protection
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup', '/request-password-reset', '/reset-password']
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  // Check if user is authenticated
  const token = request.cookies.get('auth_token')?.value
  const decoded = token ? await verifyJWTToken(token) : null

  // Skip middleware for public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // Protect all other routes
  if (!token) {
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  if (!decoded) {
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  // Additional role-based protection for admin routes
  if (request.nextUrl.pathname.startsWith('/admin-dashboard') && decoded && !['admin', 'super_admin'].includes(decoded.role as string)) {
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
