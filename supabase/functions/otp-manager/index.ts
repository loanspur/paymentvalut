// OTP Manager Edge Function
// This function handles OTP generation, validation, and management for financial transactions
// Date: December 2024
// Version: 1.0

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { OTPService } from '../_shared/otp-service.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

// Initialize OTP service
const otpService = new OTPService(supabaseClient)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    console.log(`[OTP Manager] ${method} ${path}`)

    // Route handling
    switch (true) {
      case path.endsWith('/generate') && method === 'POST':
        return await handleGenerateOTP(req)
      
      case path.endsWith('/validate') && method === 'POST':
        return await handleValidateOTP(req)
      
      case path.endsWith('/status') && method === 'GET':
        return await handleGetOTPStatus(req)
      
      case path.endsWith('/cleanup') && method === 'POST':
        return await handleCleanupExpiredOTPs(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Endpoint not found',
            available_endpoints: [
              'POST /generate',
              'POST /validate',
              'GET /status',
              'POST /cleanup'
            ]
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('[OTP Manager] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Generate OTP for financial transaction
 */
async function handleGenerateOTP(req: Request) {
  try {
    const body = await req.json()
    const { 
      partner_id, 
      user_id, 
      phone_number, 
      email_address, 
      purpose, 
      amount 
    } = body

    // Validate required fields
    if (!partner_id || !phone_number || !email_address || !purpose) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'partner_id, phone_number, email_address, and purpose are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate purpose
    const validPurposes = ['float_purchase', 'disbursement', 'wallet_topup']
    if (!validPurposes.includes(purpose)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid purpose. Must be one of: ${validPurposes.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate phone number
    const formattedPhone = OTPService.formatPhoneNumber(phone_number)
    if (!OTPService.validatePhoneNumber(formattedPhone)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate email
    if (!OTPService.validateEmail(email_address)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid email format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate amount for financial transactions
    if (purpose !== 'wallet_topup' && (!amount || amount <= 0)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Amount is required for financial transactions' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create OTP
    const otpResult = await otpService.createOTP({
      partnerId: partner_id,
      userId: user_id,
      phoneNumber: formattedPhone,
      emailAddress: email_address,
      purpose: purpose,
      amount: amount
    })

    if (!otpResult.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: otpResult.error || 'Failed to create OTP' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the created OTP record for response
    const otpRecord = await otpService.getOTPByReference(otpResult.reference!, partner_id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'OTP generated successfully',
        reference: otpResult.reference,
        expiresAt: otpRecord?.expiresAt,
        purpose: purpose,
        amount: amount,
        phoneNumber: formattedPhone,
        emailAddress: email_address,
        maxAttempts: 3,
        expiryMinutes: 10
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Generate OTP] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'OTP generation failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Validate OTP code
 */
async function handleValidateOTP(req: Request) {
  try {
    const body = await req.json()
    const { reference, otp_code, partner_id } = body

    // Validate required fields
    if (!reference || !otp_code || !partner_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'reference, otp_code, and partner_id are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate OTP code format
    if (!/^\d{6}$/.test(otp_code)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OTP code must be 6 digits' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate OTP
    const validationResult = await otpService.validateOTP({
      reference: reference,
      otpCode: otp_code,
      partnerId: partner_id
    })

    return new Response(
      JSON.stringify({
        success: validationResult.success,
        valid: validationResult.valid,
        message: validationResult.message,
        remainingAttempts: validationResult.remainingAttempts,
        otp: validationResult.otp ? {
          id: validationResult.otp.id,
          reference: validationResult.otp.reference,
          purpose: validationResult.otp.purpose,
          amount: validationResult.otp.amount,
          status: validationResult.otp.status,
          validatedAt: validationResult.otp.validatedAt
        } : null
      }),
      { 
        status: validationResult.success ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Validate OTP] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'OTP validation failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Get OTP status
 */
async function handleGetOTPStatus(req: Request) {
  try {
    const url = new URL(req.url)
    const reference = url.searchParams.get('reference')
    const partnerId = url.searchParams.get('partner_id')

    if (!reference || !partnerId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'reference and partner_id parameters are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const otp = await otpService.getOTPByReference(reference, partnerId)
    
    if (!otp) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OTP not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if OTP is expired
    const isExpired = new Date(otp.expiresAt) < new Date()
    const remainingAttempts = otp.maxAttempts - otp.attempts

    return new Response(
      JSON.stringify({
        success: true,
        otp: {
          id: otp.id,
          reference: otp.reference,
          purpose: otp.purpose,
          amount: otp.amount,
          status: isExpired ? 'expired' : otp.status,
          attempts: otp.attempts,
          maxAttempts: otp.maxAttempts,
          remainingAttempts: Math.max(0, remainingAttempts),
          smsSent: otp.smsSent,
          emailSent: otp.emailSent,
          expiresAt: otp.expiresAt,
          validatedAt: otp.validatedAt,
          createdAt: otp.createdAt,
          isExpired: isExpired
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Get OTP Status] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to get OTP status',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Clean up expired OTPs
 */
async function handleCleanupExpiredOTPs(req: Request) {
  try {
    const cleanupResult = await otpService.cleanupExpiredOTPs()

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Expired OTPs cleaned up successfully',
        cleanedCount: cleanupResult.cleaned,
        error: cleanupResult.error
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Cleanup OTPs] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to cleanup expired OTPs',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

