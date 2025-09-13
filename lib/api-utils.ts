// Shared utilities for API routes to reduce duplication

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Common error responses
export const errorResponses = {
  missingEnvVars: () => NextResponse.json(
    { error: 'Missing environment variables' },
    { status: 500 }
  ),
  
  partnerNotFound: () => NextResponse.json(
    { error: 'Partner not found' },
    { status: 404 }
  ),
  
  internalError: (message: string = 'Internal server error') => NextResponse.json(
    { error: message },
    { status: 500 }
  ),
  
  badRequest: (message: string) => NextResponse.json(
    { error: message },
    { status: 400 }
  )
}

// Create Supabase client with error handling
export function createSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }
  
  return createClient(supabaseUrl, supabaseServiceKey)
}

// Common API route wrapper with error handling
export function withErrorHandling(handler: () => Promise<NextResponse>) {
  return async () => {
    try {
      return await handler()
    } catch (error) {
      return errorResponses.internalError(
        error instanceof Error ? error.message : 'Unknown error'
      )
    }
  }
}

// M-Pesa URL configuration
export const mpesaUrls = {
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
}

// Get M-Pesa URLs based on environment
export function getMpesaUrls(environment: 'production' | 'sandbox' = 'sandbox') {
  return mpesaUrls[environment]
}

// Get callback URLs from environment variables
export function getCallbackUrls() {
  return {
    timeout: process.env.MPESA_CALLBACK_TIMEOUT_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mpesa-b2c-timeout`,
    result: process.env.MPESA_CALLBACK_RESULT_URL || `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/mpesa-b2c-result`
  }
}

// Common validation functions
export const validators = {
  phoneNumber: (phone: string) => {
    const msisdnRegex = /^254[0-9]{9}$/
    return msisdnRegex.test(phone)
  },
  
  amount: (amount: number) => {
    return amount > 0 && amount <= 150000
  },
  
  required: (value: any, fieldName: string) => {
    if (!value) {
      throw new Error(`${fieldName} is required`)
    }
  }
}

// Common response formats
export const responseFormats = {
  success: (data: any, message?: string) => NextResponse.json({
    success: true,
    message,
    data
  }),
  
  error: (message: string, code?: string) => NextResponse.json({
    success: false,
    error: message,
    code
  })
}
