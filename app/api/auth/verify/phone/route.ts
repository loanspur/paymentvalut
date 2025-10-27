import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Send phone verification code
export async function POST(request: NextRequest) {
  try {
    // Get the JWT token from the request
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
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

    const body = await request.json()
    const { phone_number } = body

    if (!phone_number) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, phone_number, phone_verified, partner_id')
      .eq('id', payload.userId || payload.sub || payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if phone is already verified
    if (user.phone_verified) {
      return NextResponse.json(
        { success: false, error: 'Phone number is already verified' },
        { status: 400 }
      )
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()

    // Create phone verification record
    const { data: verificationRecord, error: verificationError } = await supabase
      .from('phone_verifications')
      .insert({
        user_id: user.id,
        phone_number: phone_number,
        verification_code: verificationCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 minutes
      })
      .select()
      .single()

    if (verificationError) {
      console.error('Error creating phone verification record:', verificationError)
      return NextResponse.json(
        { success: false, error: 'Failed to generate verification code' },
        { status: 500 }
      )
    }

    // Send verification SMS using partner's SMS settings
    let smsSent = false

    try {
      // Get partner SMS settings
      const { data: partnerSmsSettings } = await supabase
        .from('partner_sms_settings')
        .select('*')
        .eq('partner_id', user.partner_id || 'default')
        .single()

      if (partnerSmsSettings && partnerSmsSettings.sms_enabled) {
        // Send SMS via AirTouch API
        const smsMessage = `Your Payment Vault phone verification code is: ${verificationCode}. Valid for 15 minutes. Do not share this code.`
        
        const smsResponse = await sendSMSViaAirTouch({
          phoneNumber: phone_number,
          message: smsMessage,
          senderId: partnerSmsSettings.damza_sender_id,
          username: partnerSmsSettings.damza_username,
          apiKey: partnerSmsSettings.damza_api_key,
          isEncrypted: true // Database credentials are encrypted
        })

        if (smsResponse.success) {
          smsSent = true
          // Update verification record
          await supabase
            .from('phone_verifications')
            .update({ sms_sent: true })
            .eq('id', verificationRecord.id)
        }
      } else {
        // Fallback to environment variables for super admin
        console.log('📱 No partner SMS settings found, using environment variables')
        
        const smsMessage = `Your Payment Vault phone verification code is: ${verificationCode}. Valid for 15 minutes. Do not share this code.`
        
        const smsResponse = await sendSMSViaAirTouch({
          phoneNumber: phone_number,
          message: smsMessage,
          senderId: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
          username: process.env.SUPER_ADMIN_SMS_USERNAME || '',
          apiKey: process.env.SUPER_ADMIN_SMS_API_KEY || '',
          isEncrypted: false // Environment variables are plain text, not encrypted
        })

        if (smsResponse.success) {
          smsSent = true
          // Update verification record
          await supabase
            .from('phone_verifications')
            .update({ sms_sent: true })
            .eq('id', verificationRecord.id)
        }
      }
    } catch (smsError) {
      console.error('Error sending verification SMS:', smsError)
    }

    return NextResponse.json({
      success: true,
      message: 'Phone verification code sent successfully',
      data: {
        verification_id: verificationRecord.id,
        expires_at: verificationRecord.expires_at,
        sms_sent: smsSent,
        // In development, include verification code for testing
        ...(process.env.NODE_ENV === 'development' && { verification_code: verificationCode })
      }
    })

  } catch (error) {
    console.error('Send Phone Verification Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Verify phone with code
export async function PUT(request: NextRequest) {
  try {
    // Get the JWT token from the request
    const token = request.cookies.get('auth_token')?.value

    if (!token) {
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

    const body = await request.json()
    const { verification_code, phone_number } = body

    if (!verification_code || verification_code.length !== 6) {
      return NextResponse.json(
        { success: false, error: 'Valid 6-digit verification code is required' },
        { status: 400 }
      )
    }

    if (!phone_number) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Find the most recent pending verification for the user and phone number
    const { data: verificationRecord, error: verificationError } = await supabase
      .from('phone_verifications')
      .select('*')
      .eq('user_id', payload.userId || payload.sub || payload.id)
      .eq('phone_number', phone_number)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (verificationError || !verificationRecord) {
      return NextResponse.json(
        { success: false, error: 'No valid verification code found or code has expired' },
        { status: 400 }
      )
    }

    // Check if max attempts exceeded
    if (verificationRecord.attempts >= verificationRecord.max_attempts) {
      await supabase
        .from('phone_verifications')
        .update({ status: 'expired' })
        .eq('id', verificationRecord.id)

      return NextResponse.json(
        { success: false, error: 'Maximum attempts exceeded' },
        { status: 400 }
      )
    }

    // Check if verification code matches
    if (verificationRecord.verification_code === verification_code) {
      // Mark verification as verified
      await supabase
        .from('phone_verifications')
        .update({ 
          status: 'verified', 
          verified_at: new Date().toISOString() 
        })
        .eq('id', verificationRecord.id)

      // Update user phone verification status and phone number
      await supabase
        .from('users')
        .update({ 
          phone_number: phone_number,
          phone_verified: true,
          phone_verified_at: new Date().toISOString()
        })
        .eq('id', verificationRecord.user_id)

      return NextResponse.json({
        success: true,
        message: 'Phone number verified successfully'
      })
    } else {
      // Increment attempts
      await supabase
        .from('phone_verifications')
        .update({ attempts: verificationRecord.attempts + 1 })
        .eq('id', verificationRecord.id)

      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid verification code',
          attempts_remaining: verificationRecord.max_attempts - verificationRecord.attempts - 1
        },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Verify Phone Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Decryption function (same as SMS campaigns)
async function decryptData(encryptedData: string, passphrase: string): Promise<string> {
  try {
    const crypto = await import('crypto')
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
    let decryptedApiKey = apiKey
    let decryptedUsername = username

    // Only decrypt if the data is encrypted (from database)
    if (isEncrypted) {
      const passphrase = process.env.JWT_SECRET
      if (!passphrase) {
        throw new Error('JWT_SECRET environment variable is required')
      }

      decryptedApiKey = await decryptData(apiKey, passphrase)
      decryptedUsername = await decryptData(username, passphrase)
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
    const smsId = `VERIFY_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

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

    console.log(`📱 Sending verification SMS to ${formattedPhone} via AirTouch API (GET)`)

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

