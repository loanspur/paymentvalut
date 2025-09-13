// Centralized environment variable configuration

export const env = {
  // Supabase configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  
  // M-Pesa configuration
  mpesa: {
    environment: process.env.MPESA_ENVIRONMENT || 'sandbox',
    initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
    callbackTimeoutUrl: process.env.MPESA_CALLBACK_TIMEOUT_URL,
    callbackResultUrl: process.env.MPESA_CALLBACK_RESULT_URL
  },
  
  // Test configuration
  test: {
    phoneNumber: process.env.TEST_PHONE_NUMBER || '254727638940'
  },
  
  // Application configuration
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || '1'
  }
}

// Validation function to ensure required environment variables are set
export function validateEnv() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ]
  
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

// Helper function to get M-Pesa callback URLs
export function getMpesaCallbackUrls() {
  const baseUrl = env.supabase.url
  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  }
  
  return {
    timeout: env.mpesa.callbackTimeoutUrl || `${baseUrl}/functions/v1/mpesa-b2c-timeout`,
    result: env.mpesa.callbackResultUrl || `${baseUrl}/functions/v1/mpesa-b2c-result`
  }
}

// Helper function to get M-Pesa URLs based on environment
export function getMpesaUrls() {
  const environment = env.mpesa.environment as 'production' | 'sandbox'
  
  return {
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
  }[environment]
}
