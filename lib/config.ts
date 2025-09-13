// Centralized configuration for the application
// All hardcoded values should be moved here and made configurable

export const config = {
  // M-Pesa API URLs
  mpesa: {
    production: {
      baseUrl: 'https://api.safaricom.co.ke',
      oauth: 'https://api.safaricom.co.ke/oauth/v1/generate',
      b2c: 'https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
      balance: 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query'
    },
    sandbox: {
      baseUrl: 'https://sandbox.safaricom.co.ke',
      oauth: 'https://sandbox.safaricom.co.ke/oauth/v1/generate',
      b2c: 'https://sandbox.safaricom.co.ke/mpesa/b2c/v1/paymentrequest',
      balance: 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query'
    }
  },
  
  // Callback URLs - should be configurable via environment variables
  callbacks: {
    timeout: process.env.MPESA_CALLBACK_TIMEOUT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/mpesa-b2c-timeout',
    result: process.env.MPESA_CALLBACK_RESULT_URL || process.env.NEXT_PUBLIC_SUPABASE_URL + '/functions/v1/mpesa-b2c-result'
  },
  
  // Default values
  defaults: {
    mpesaEnvironment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
    commandId: 'BusinessPayment'
  }
}

// Helper function to get M-Pesa URLs based on environment
export function getMpesaUrls(environment: 'production' | 'sandbox' = 'sandbox') {
  return config.mpesa[environment]
}

// Helper function to get callback URLs
export function getCallbackUrls() {
  return config.callbacks
}
