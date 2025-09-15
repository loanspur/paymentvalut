import { NextRequest, NextResponse } from 'next/server'
// Removed auth-enhanced import

export async function GET(request: NextRequest) {
  try {
    // Simple authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({
        error: 'Access denied',
        message: 'You need to be logged in to access API documentation'
      }, { status: 401 })
    }

    // Return the API documentation data
    return NextResponse.json({
      success: true,
      message: 'API documentation access granted',
      user: {
        authenticated: true
      },
      documentation: {
        baseUrl: 'https://paymentvalut-ju.vercel.app',
        endpoints: {
          disbursement: {
            url: '/api/disburse',
            method: 'POST',
            description: 'Send money to customers',
            requiredHeaders: ['x-api-key', 'Content-Type'],
            requiredPermissions: ['transactions.create']
          },
          status: {
            url: '/api/ussd/transaction-status',
            method: 'GET',
            description: 'Check transaction status',
            requiredHeaders: ['x-api-key'],
            requiredPermissions: ['transactions.read']
          }
        },
        authentication: {
          type: 'API Key',
          header: 'x-api-key',
          description: 'Include your partner API key in the x-api-key header'
        },
        security: {
          ipWhitelisting: 'Enabled for production',
          rateLimiting: 'Applied per partner',
          https: 'Required for all requests'
        }
      }
    })

  } catch (error) {
    console.error('Protected API docs error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to access API documentation'
    }, { status: 500 })
  }
}
