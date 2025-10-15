// JWT utilities for secure token handling
import { SignJWT, jwtVerify } from 'jose'

// Generate a secure JWT secret if not provided
export function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET
  
  if (!secret || secret === 'your-secret-key-change-in-production') {
    // In production, this should be set via environment variables
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production environment')
    }
    
    // Development fallback - use a consistent secret for development
    console.warn('⚠️ Using development JWT secret. Set JWT_SECRET environment variable for production.')
    return 'dev-secret-consistent-for-development-only'
  }
  
  return secret
}

// Verify JWT token with proper error handling
export async function verifyJWTToken(token: string) {
  try {
    const secret = new TextEncoder().encode(getJWTSecret())
    const { payload } = await jwtVerify(token, secret)
    return payload
  } catch (error) {
    console.error('JWT verification failed:', error.message)
    return null
  }
}

// Create JWT token with proper configuration
export async function createJWTToken(payload: any) {
  const secret = new TextEncoder().encode(getJWTSecret())
  
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .setIssuedAt()
    .sign(secret)
}
