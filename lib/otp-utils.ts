import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export interface GenerateOTPParams {
  userId: string
  partnerId: string
  phoneNumber: string
  emailAddress: string
  purpose: 'float_purchase' | 'disbursement' | 'wallet_topup'
  amount?: number
}

export interface GenerateOTPResult {
  success: boolean
  reference?: string
  expiresAt?: string
  smsSent?: boolean
  emailSent?: boolean
  error?: string
  details?: string
}

/**
 * Generate and send OTP directly (without HTTP call)
 * This is more reliable in production than making internal API calls
 */
export async function generateAndSendOTP(params: GenerateOTPParams): Promise<GenerateOTPResult> {
  try {
    const { userId, partnerId, phoneNumber, emailAddress, purpose, amount } = params

    // Validate phone number format
    const formattedPhone = phoneNumber.replace(/\D/g, '')
    if (!/^254\d{9}$/.test(formattedPhone)) {
      return {
        success: false,
        error: 'Invalid phone number format. Use format: 254XXXXXXXXX'
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailAddress)) {
      return {
        success: false,
        error: 'Invalid email format'
      }
    }

    // Validate amount for financial transactions
    if (purpose !== 'wallet_topup' && (!amount || amount <= 0)) {
      return {
        success: false,
        error: 'Amount is required for financial transactions'
      }
    }

    // Generate OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString() // 6-digit OTP
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now
    const otpReference = uuidv4()

    // Create OTP record
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_validations')
      .insert({
        reference: otpReference,
        user_id: userId,
        partner_id: partnerId,
        phone_number: formattedPhone,
        email_address: emailAddress,
        otp_code: otpCode,
        purpose: purpose,
        amount: amount,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
        attempts: 0,
        max_attempts: 3
      })
      .select()
      .single()

    if (otpError) {
      console.error('OTP creation error:', otpError)
      return {
        success: false,
        error: 'Failed to create OTP',
        details: otpError.message || otpError.code || 'Database error'
      }
    }

    // Send OTP via SMS and Email
    let smsSent = false
    let emailSent = false

    // Send SMS - Note: SMS sending via API requires authentication
    // For OTP, we'll skip SMS in the utility function and let the caller handle it if needed
    // The OTP is still valid without SMS - email is the primary delivery method
    // SMS can be sent separately via the SMS API if needed
    smsSent = false

    // Send Email
    try {
      const { sendEmail } = await import('./email-utils')
      const emailSubject = `OTP for ${purpose === 'float_purchase' ? 'B2C Float Purchase' : purpose}`
      const emailBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Payment Vault - OTP Verification</h2>
          <p>Your OTP code for ${purpose === 'float_purchase' ? 'B2C Float Purchase' : purpose} is:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #2563eb; font-size: 32px; margin: 0; letter-spacing: 4px;">${otpCode}</h1>
          </div>
          <p><strong>Amount:</strong> KES ${amount || 0}</p>
          <p><strong>Valid for:</strong> 10 minutes</p>
          <p style="color: #dc2626;"><strong>⚠️ Do not share this code with anyone.</strong></p>
          <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">This is an automated message. Please do not reply.</p>
        </div>
      `

      const emailResult = await sendEmail({
        to: emailAddress,
        subject: emailSubject,
        html: emailBody
      })

      emailSent = emailResult.success || false

      // Update OTP record with Email status
      await supabase
        .from('otp_validations')
        .update({ email_sent: emailSent })
        .eq('reference', otpReference)
    } catch (emailError) {
      console.error('Error sending OTP Email:', emailError)
    }

    // Log OTP for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`OTP for ${formattedPhone} / ${emailAddress} (${purpose}): ${otpCode}. Reference: ${otpReference}`)
    }

    return {
      success: true,
      reference: otpReference,
      expiresAt: expiresAt.toISOString(),
      smsSent,
      emailSent
    }

  } catch (error) {
    console.error('OTP generation error:', error)
    return {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

