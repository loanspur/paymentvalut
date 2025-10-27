import { NextRequest, NextResponse } from 'next/server'
import { auditLogger } from './audit-logger'

export interface RequestLogData {
  requestId: string
  method: string
  endpoint: string
  path?: string
  queryParams?: any
  requestHeaders?: any
  requestBody?: any
  responseStatus?: number
  responseHeaders?: any
  responseBody?: any
  responseTimeMs?: number
  originIp?: string
  userAgent?: string
  userId?: string
  userEmail?: string
  partnerId?: string
  partnerName?: string
  requestSource?: string
}

/**
 * Middleware to log API requests
 */
export async function logRequest(
  request: NextRequest,
  response: NextResponse,
  userContext?: {
    userId?: string
    userEmail?: string
    partnerId?: string
    partnerName?: string
  }
): Promise<void> {
  try {
    const startTime = Date.now()
    const requestId = crypto.randomUUID()
    
    // Extract request information
    const url = new URL(request.url)
    const method = request.method
    const endpoint = url.pathname
    const path = url.pathname
    const queryParams = Object.fromEntries(url.searchParams)
    
    // Get request headers (excluding sensitive ones)
    const requestHeaders: any = {}
    request.headers.forEach((value, key) => {
      if (!['authorization', 'cookie', 'x-api-key'].includes(key.toLowerCase())) {
        requestHeaders[key] = value
      }
    })
    
    // Get request body for POST/PUT requests (if available)
    let requestBody: any = null
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      try {
        const clonedRequest = request.clone()
        const body = await clonedRequest.text()
        if (body) {
          requestBody = JSON.parse(body)
        }
      } catch (error) {
        // Ignore body parsing errors
      }
    }
    
    // Extract response information
    const responseStatus = response.status
    const responseHeaders: any = {}
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value
    })
    
    // Calculate response time
    const responseTimeMs = Date.now() - startTime
    
    // Extract client information
    const originIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'
    
    // Determine request source
    const requestSource = request.headers.get('x-request-source') || 'frontend'
    
    // Log the API request
    await auditLogger.logApiRequest({
      requestId,
      method,
      endpoint,
      path,
      queryParams,
      requestHeaders,
      requestBody,
      responseStatus,
      responseHeaders,
      responseTimeMs,
      originIp,
      userAgent,
      userId: userContext?.userId,
      userEmail: userContext?.userEmail,
      partnerId: userContext?.partnerId,
      partnerName: userContext?.partnerName,
      requestSource
    })
    
  } catch (error) {
    console.error('Error logging request:', error)
    // Don't throw - logging errors shouldn't break the request
  }
}

/**
 * Utility to extract user context from JWT token
 */
export async function extractUserContext(request: NextRequest): Promise<{
  userId?: string
  userEmail?: string
  partnerId?: string
  partnerName?: string
} | null> {
  try {
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return null
    }
    
    // You would need to implement JWT verification here
    // For now, return null to avoid breaking the system
    return null
  } catch (error) {
    console.error('Error extracting user context:', error)
    return null
  }
}

/**
 * Higher-order function to wrap API routes with logging
 */
export function withRequestLogging<T extends any[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    const [request] = args
    const startTime = Date.now()
    
    try {
      // Extract user context
      const userContext = await extractUserContext(request)
      
      // Call the original handler
      const response = await handler(...args)
      
      // Log the request
      await logRequest(request, response, userContext)
      
      return response
    } catch (error) {
      // Log error
      await auditLogger.logError(error as Error, {
        endpoint: request.url,
        method: request.method
      })
      
      throw error
    }
  }
}