import { createClient } from '@supabase/supabase-js'
import { v4 as uuidv4 } from 'uuid'
import crypto from 'crypto'
import { log } from './logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Decrypt data using AES-256-CBC (matching the SMS send route implementation)
function decryptData(encryptedData: string, passphrase: string): string {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const textParts = encryptedData.split(':')
    const iv = Buffer.from(textParts.shift()!, 'hex')
    const encryptedText = textParts.join(':')
    const decipher = crypto.createDecipher(algorithm, key)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    // If decryption fails, return as-is (might be plain text)
    return encryptedData
  }
}

// Send SMS via AirTouch API
async function sendAirTouchSMS(username: string, apiKey: string, phoneNumber: string, senderId: string, message: string): Promise<{ success: boolean; response?: string; error?: string }> {
  try {
    // Check if we're in test mode
    const isTestMode = !username || !apiKey || username.includes('test') || apiKey.includes('test') || username === '***encrypted***' || apiKey === '***encrypted***'
    
    if (isTestMode) {
      log.debug('OTP SMS: Test mode - SMS not sent')
      return {
        success: true,
        response: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    }

    // Format phone number (ensure it's in international format without +)
    let formattedPhone = phoneNumber.replace(/\D/g, '') // Remove all non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1) // Convert 07... to 2547...
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone // Add 254 prefix if missing
    }

    // Generate unique SMS ID
    const smsId = `OTP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // AirTouch SMS API integration - Use HTTPS GET request format
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/'
    
    // According to AirTouch API docs:
    // password = md5 sum from the string "api key" in hexadecimal
    // Create MD5 hash of the API key as required by AirTouch API
    const hashedPassword = crypto.createHash('md5').update(apiKey).digest('hex')
    
    // Build GET request URL with parameters
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: message,
      username: username,
      password: hashedPassword, // Use MD5 hashed password
      sms_id: smsId
    })
    
    const getUrl = `${apiUrl}?${params.toString()}`

    const response = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Check if response is JSON
    let data
    const contentType = response.headers.get('content-type')
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      const text = await response.text()
      // Non-JSON response from AirTouch API
      return {
        success: false,
        error: `Invalid API response format: ${text.substring(0, 200)}`
      }
    }

    if (response.ok && data.status_code === '1000') {
      return {
        success: true,
        response: data.message_id || smsId
      }
    } else {
      // Enhanced error handling
      let errorMessage = data.status_desc || `API Error: ${data.status_code}`
      
      if (data.status_code === '1011' || data.status_desc === 'INVALID USER') {
        errorMessage = 'Invalid AirTouch credentials. Please check username and password.'
      } else if (data.status_code === '1004' || data.status_desc?.includes('BALANCE')) {
        errorMessage = 'Insufficient AirTouch account balance.'
      } else if (data.status_code === '1001' || data.status_desc?.includes('SENDER')) {
        errorMessage = 'Invalid sender ID. Please check if sender ID is registered with AirTouch.'
      }
      
      return {
        success: false,
        error: errorMessage
      }
    }

  } catch (error) {
    log.error('AirTouch SMS API Error', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

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
      log.error('OTP creation error', otpError)
      return {
        success: false,
        error: 'Failed to create OTP',
        details: otpError.message || otpError.code || 'Database error'
      }
    }

    // Send OTP via SMS and Email
    let smsSent = false
    let emailSent = false

    // Send SMS
    try {
      // Get SMS credentials - prioritize environment variables for super_admin
      let username = ''
      let apiKey = ''
      let senderId = ''
      let isEncrypted = false

      // Check if super admin SMS is enabled via environment variables
      const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true'
      
      if (superAdminSmsEnabled) {
        // Use environment variables for super admin (fastest path)
        username = process.env.SUPER_ADMIN_SMS_USERNAME || ''
        apiKey = process.env.SUPER_ADMIN_SMS_API_KEY || ''
        senderId = process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault'
        isEncrypted = false

        if (!username || !apiKey) {
          log.warn('OTP SMS: Super admin SMS environment variables not configured')
        }
      } else {
        // Fallback to partner SMS settings from database
        const { data: smsSettings, error: settingsError } = await supabase
          .from('partner_sms_settings')
          .select('*')
          .eq('partner_id', partnerId)
          .eq('sms_enabled', true)
          .single()

        if (settingsError || !smsSettings) {
          log.warn('OTP SMS: Partner SMS settings not found or disabled', { error: settingsError?.message || 'No settings found' })
        } else {
          // Decrypt Damza credentials from database
          const passphrase = process.env.JWT_SECRET || 'default-passphrase'
          apiKey = decryptData(smsSettings.damza_api_key, passphrase)
          username = decryptData(smsSettings.damza_username, passphrase)
          senderId = smsSettings.damza_sender_id
          isEncrypted = smsSettings.is_encrypted || false
        }
      }

      // Send SMS if credentials are available
      if (username && apiKey && senderId) {
        const smsMessage = `Payment Vault OTP: ${otpCode} for ${purpose === 'float_purchase' ? 'B2C Float Purchase' : purpose}. Amount: KES ${amount || 0}. Valid for 10 minutes. Do not share this code.`
        
        log.debug('OTP SMS: Sending SMS', { phone: formattedPhone })
        const smsResult = await sendAirTouchSMS(username, apiKey, formattedPhone, senderId, smsMessage)
        
        smsSent = smsResult.success || false
        
        if (smsResult.success) {
          log.info('OTP SMS: SMS sent successfully', { response: smsResult.response })
        } else {
          log.error('OTP SMS: SMS sending failed', { error: smsResult.error })
        }

        // Update OTP record with SMS status
        await supabase
          .from('otp_validations')
          .update({ sms_sent: smsSent })
          .eq('reference', otpReference)
      } else {
        log.warn('OTP SMS: SMS credentials not available - skipping SMS sending')
      }
    } catch (smsError) {
      log.error('OTP SMS: Error sending OTP SMS', smsError)
      // Don't fail the entire OTP generation if SMS fails - email is still sent
    }

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
      log.error('Error sending OTP Email', emailError)
    }

    // Log OTP for development only
    log.debug('OTP generated', { phone: formattedPhone, email: emailAddress, purpose, reference: otpReference })

    return {
      success: true,
      reference: otpReference,
      expiresAt: expiresAt.toISOString(),
      smsSent,
      emailSent
    }

  } catch (error) {
    log.error('OTP generation error', error)
    return {
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

