import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Generate OTP for login validation
export async function POST(request: NextRequest) {
  try {
    // Get the JWT token from the request
    const token = request.cookies.get('auth_token')?.value
    
    console.log('🔍 [DEBUG] OTP Generate - Cookie check:', {
      hasCookie: !!token,
      cookieValue: token ? 'SET' : 'NOT SET',
      allCookies: request.cookies.getAll().map(c => c.name)
    })

    if (!token) {
      console.log('🔍 [DEBUG] OTP Generate - No auth token found')
      return NextResponse.json(
        { success: false, error: 'Authentication token required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    if (!payload) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' },
        { status: 401 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, phone_number, phone_verified, email_verified')
      .eq('id', payload.userId || payload.sub || payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has phone number
    if (!user.phone_number) {
      return NextResponse.json(
        { success: false, error: 'Phone number not registered. Please contact administrator.' },
        { status: 400 }
      )
    }

    // For login OTP, we don't require email/phone to be verified first
    // The OTP is used to verify the user during login
    // Only check if user has the required contact information

    // Get OTP settings
    const { data: otpSettings } = await supabase
      .from('system_settings')
      .select('setting_value')
      .eq('category', 'otp')
      .in('setting_key', ['otp_expiry_minutes', 'otp_max_attempts', 'otp_length'])

    const settings = otpSettings?.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, string>) || {}

    const expiryMinutes = parseInt(settings.otp_expiry_minutes || '10')
    const maxAttempts = parseInt(settings.otp_max_attempts || '3')
    const otpLength = parseInt(settings.otp_length || '6')

    // Generate OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Create OTP record
    const { data: otpRecord, error: otpError } = await supabase
      .from('login_otp_validations')
      .insert({
        user_id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString(),
        max_attempts: maxAttempts
      })
      .select()
      .single()

    if (otpError) {
      console.error('Error creating OTP record:', otpError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate OTP' },
        { status: 500 }
      )
    }

    // Send OTP via SMS using existing SMS functions
    let smsSent = false
    let emailSent = false

    try {
      console.log('🔍 [DEBUG] Starting SMS sending process...')
      // Get SMS settings based on user role
      let smsSettings = null
      
      // For super_admin users, use environment variables for SMS settings
      if (user.role === 'super_admin' || user.role === 'admin') {
        console.log('📱 Super admin detected, checking environment SMS settings')
        
        // Check if super admin SMS is enabled via environment variables
        const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true'
        
        if (superAdminSmsEnabled) {
          console.log('📱 Using environment variables for super admin SMS')
          
          // Create SMS settings object from environment variables
          smsSettings = {
            damza_sender_id: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
            damza_username: process.env.SUPER_ADMIN_SMS_USERNAME,
            damza_api_key: process.env.SUPER_ADMIN_SMS_API_KEY,
            damza_password: process.env.SUPER_ADMIN_SMS_PASSWORD,
            sms_enabled: true
          }
          
          // Validate required environment variables
          if (!smsSettings.damza_username || !smsSettings.damza_api_key) {
            console.log('❌ Super admin SMS environment variables not properly configured')
            smsSettings = null
          } else {
            console.log('✅ Super admin SMS settings from environment variables:')
            console.log(`   Sender ID: ${smsSettings.damza_sender_id}`)
            console.log(`   Username: ${smsSettings.damza_username}`)
            console.log(`   API Key: ${smsSettings.damza_api_key ? '***' + smsSettings.damza_api_key.slice(-4) : 'Not set'}`)
          }
        } else {
          console.log('📱 Super admin SMS disabled via environment variables, falling back to database settings')
          
          // Fallback to database settings
          const { data: systemSmsSettings } = await supabase
            .from('partner_sms_settings')
            .select('*')
            .eq('sms_enabled', true)
            .limit(1)
            .single()
          
          if (systemSmsSettings) {
            smsSettings = systemSmsSettings
            console.log('📱 Using database SMS settings for super admin')
          }
        }
      } else if (user.partner_id) {
        // For regular users, try to get partner-specific SMS settings
        const { data: partnerSmsSettings } = await supabase
          .from('partner_sms_settings')
          .select('*')
          .eq('partner_id', user.partner_id)
          .single()
        
        if (partnerSmsSettings && partnerSmsSettings.sms_enabled) {
          smsSettings = partnerSmsSettings
          console.log('📱 Using partner-specific SMS settings')
        }
      }
      
      // Final fallback: use any available SMS settings
      if (!smsSettings) {
        const { data: anySmsSettings } = await supabase
          .from('partner_sms_settings')
          .select('*')
          .eq('sms_enabled', true)
          .limit(1)
          .single()
        
        if (anySmsSettings) {
          smsSettings = anySmsSettings
          console.log('📱 Using fallback SMS settings')
        }
      }

      if (smsSettings) {
        console.log('🔍 [DEBUG] SMS settings found, proceeding with SMS sending...')
        console.log('📱 Sending SMS OTP to:', user.phone_number)
        
        // Send SMS via AirTouch API
        const smsMessage = `Your Payment Vault login OTP is: ${otpCode}. Valid for ${expiryMinutes} minutes. Do not share this code.`
        
        // Determine if the SMS settings are encrypted (from database) or plain text (from environment)
        const isEncrypted = !(user.role === 'super_admin' && process.env.SUPER_ADMIN_SMS_ENABLED === 'true')
        
        const smsResponse = await sendSMSViaAirTouch({
          phoneNumber: user.phone_number,
          message: smsMessage,
          senderId: smsSettings.damza_sender_id,
          username: smsSettings.damza_username,
          apiKey: smsSettings.damza_api_key,
          isEncrypted: isEncrypted
        })

        if (smsResponse.success) {
          smsSent = true
          console.log('✅ SMS OTP sent successfully to:', user.phone_number)
          // Update OTP record
          await supabase
            .from('login_otp_validations')
            .update({ sms_sent: true })
            .eq('id', otpRecord.id)
        } else {
          console.log('❌ SMS OTP failed:', smsResponse.error)
        }
      } else {
        console.log('🔍 [DEBUG] No SMS settings found for user')
        console.log('❌ No SMS settings found for user')
      }
    } catch (smsError) {
      console.error('🔍 [DEBUG] SMS sending failed with error:', smsError)
      console.error('❌ Error sending SMS:', smsError)
    }

    // Send OTP via Email
    try {
      const emailSent = await sendOTPEmail({
        email: user.email,
        otpCode: otpCode,
        expiryMinutes: expiryMinutes
      })

      if (emailSent) {
        // Update OTP record
        await supabase
          .from('login_otp_validations')
          .update({ email_sent: true })
          .eq('id', otpRecord.id)
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'OTP generated and sent successfully',
      data: {
        otp_id: otpRecord.id,
        expires_at: otpRecord.expires_at,
        sms_sent: smsSent,
        email_sent: emailSent,
        // In development, include OTP code for testing
        ...(process.env.NODE_ENV === 'development' && { otp_code: otpCode })
      }
    })

  } catch (error) {
    console.error('Generate OTP Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Decryption function (same as SMS campaigns)
function decryptData(encryptedData: string, passphrase: string): string {
  try {
    const crypto = require('crypto')
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const textParts = encryptedData.split(':')
    
    if (textParts.length !== 2) {
      // Handle fallback base64 encoding
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    }
    
    const iv = Buffer.from(textParts[0], 'hex')
    const encryptedText = textParts[1]
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    // Try base64 decoding as fallback
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    } catch (fallbackError) {
      return encryptedData // Return as-is if all decryption fails
    }
  }
}

// Function to send SMS via AirTouch API
async function sendSMSViaAirTouch({
  phoneNumber,
  message,
  senderId,
  username,
  apiKey,
  isEncrypted = true
}: {
  phoneNumber: string
  message: string
  senderId: string
  username: string
  apiKey: string
  isEncrypted?: boolean
}) {
  try {
    console.log('🔍 [DEBUG] sendSMSViaAirTouch called with:', {
      phoneNumber,
      senderId,
      username: username ? 'SET' : 'NOT SET',
      apiKey: apiKey ? 'SET' : 'NOT SET',
      isEncrypted
    })
    
    let decryptedApiKey = apiKey
    let decryptedUsername = username

    // Only decrypt if the data is encrypted (from database)
    if (isEncrypted) {
      const passphrase = process.env.JWT_SECRET
      if (!passphrase) {
        throw new Error('JWT_SECRET environment variable is required')
      }

      // Use the same decryption method as SMS campaigns
      decryptedApiKey = decryptData(apiKey, passphrase)
      decryptedUsername = decryptData(username, passphrase)
    }

    // Format phone number
    let formattedPhone = phoneNumber.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1)
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone
    }

    // AirTouch API URL (using the same working URL as SMS campaigns)
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/'
    
    // Create MD5 hash of API key for password
    const crypto = await import('crypto')
    const md5Hash = crypto.createHash('md5').update(decryptedApiKey).digest('hex')

    // Generate unique SMS ID
    const smsId = `OTP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // Prepare parameters (using same format as working SMS campaigns)
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: message,
      username: decryptedUsername,
      password: md5Hash,
      sms_id: smsId
    })

    const getUrl = `${apiUrl}?${params.toString()}`

    console.log(`📱 Sending OTP SMS to ${formattedPhone} via AirTouch API (GET)`)

    const response = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const data = await response.json()
    console.log('AirTouch API Response:', data)

    if (response.ok && data.status_code === '1000') {
      return {
        success: true,
        reference: data.message_id || smsId
      }
    } else {
      // Enhanced error handling (same as working SMS campaigns)
      if (data.status_code === '1011' || data.status_desc === 'INVALID USER') {
        return {
          success: false,
          error: 'Invalid AirTouch credentials. Please check username and password.'
        }
      } else if (data.status_code === '1004' || data.status_desc?.includes('BALANCE')) {
        return {
          success: false,
          error: 'Insufficient AirTouch account balance.'
        }
      } else if (data.status_code === '1001' || data.status_desc?.includes('SENDER')) {
        return {
          success: false,
          error: 'Invalid sender ID. Please check if sender ID is registered with AirTouch.'
        }
      } else {
        return {
          success: false,
          error: data.status_desc || `API Error: ${data.status_code}`
        }
      }
    }
  } catch (error) {
    console.error('AirTouch SMS Error:', error)
    return {
      success: false,
      error: 'SMS sending failed'
    }
  }
}

// Function to send OTP email
async function sendOTPEmail({
  email,
  otpCode,
  expiryMinutes
}: {
  email: string
  otpCode: string
  expiryMinutes: number
}) {
  try {
    const { sendEmail } = await import('../../../../../lib/email-utils')
    
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Payment Vault</h1>
          <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Secure Login Verification</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin: 0 0 20px 0;">Your Login OTP</h2>
          
          <div style="background: white; border: 2px dashed #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
            <h1 style="color: #667eea; font-size: 36px; margin: 10px 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otpCode}</h1>
          </div>
          
          <p style="color: #666; margin: 20px 0; line-height: 1.6;">
            This code will expire in <strong>${expiryMinutes} minutes</strong>. 
            Please enter this code in the login form to complete your authentication.
          </p>
          
          <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 0; color: #856404; font-size: 14px;">
              <strong>Security Notice:</strong> Never share this code with anyone. 
              Payment Vault will never ask for your OTP via phone or email.
            </p>
          </div>
          
          <p style="color: #999; font-size: 12px; margin: 30px 0 0 0;">
            If you didn't request this code, please ignore this email or contact support.
          </p>
        </div>
      </div>
    `

    const result = await sendEmail({
      to: email,
      subject: 'Payment Vault - Login Verification Code',
      html: emailHtml,
      text: `Your Payment Vault login OTP is: ${otpCode}. Valid for ${expiryMinutes} minutes.`
    })

    if (result.success) {
      console.log(`✅ OTP email sent successfully to ${email}`)
      return true
    } else {
      console.error(`❌ Failed to send OTP email to ${email}:`, result.error)
      return false
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return false
  }
}
