import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

async function verifyToken(token: string): Promise<any> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    return null
  }
}

export async function middleware(request: NextRequest) {
  // Public routes that don't need protection
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup']
  const isPublicRoute = publicRoutes.includes(request.nextUrl.pathname)

  // Check if user is authenticated
  const token = request.cookies.get('auth_token')?.value
  const decoded = token ? await verifyToken(token) : null

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
  if (request.nextUrl.pathname.startsWith('/admin-dashboard') && decoded.role !== 'admin') {
    return NextResponse.redirect(new URL('/secure-login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ]
}
