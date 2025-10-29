import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateSMSCount, calculateSMSCost as calculateSMSCostUtil } from '@/lib/sms-utils'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import crypto from 'crypto'
import UnifiedWalletService from '@/lib/unified-wallet-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Decryption function for sensitive data
function decryptData(encryptedData: string, passphrase: string): string {
  const algorithm = 'aes-256-cbc'
  const key = crypto.scryptSync(passphrase, 'salt', 32)
  const textParts = encryptedData.split(':')
  const iv = Buffer.from(textParts.shift()!, 'hex')
  const encryptedText = textParts.join(':')
  const decipher = crypto.createDecipher(algorithm, key)
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}

// Calculate SMS cost based on message length
function calculateSMSCost(message: string, costPerMessage: number): number {
  // Use the utility function for consistent calculation
  return calculateSMSCostUtil(message, costPerMessage)
}

// Send SMS via AirTouch API
async function sendAirTouchSMS(username: string, password: string, to: string, from: string, message: string) {
  try {
    // Check if we're in test mode
    const isTestMode = !username || !password || username.includes('test') || password.includes('test') || username === '***encrypted***' || password === '***encrypted***'
    
    if (isTestMode) {
      console.log(`🧪 Test Mode: Simulating SMS send to ${to}`)
      return {
        success: true,
        response: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        status: 200
      }
    }

    // Format phone number (ensure it's in international format without +)
    let formattedPhone = to.replace(/\D/g, '') // Remove all non-digits
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1) // Convert 07... to 2547...
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone // Add 254 prefix if missing
    }

    // Generate unique SMS ID
    const smsId = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // AirTouch SMS API integration - Use HTTPS GET request format
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/'
    
    // According to AirTouch API docs:
    // password = md5 sum from the string "api key" in hexadecimal
    // Create MD5 hash of the API key as required by AirTouch API
    const hashedPassword = crypto.createHash('md5').update(password).digest('hex')
    
    // Build GET request URL with parameters
    const params = new URLSearchParams({
      issn: from,
      msisdn: formattedPhone,
      text: message,
      username: username,
      password: hashedPassword, // Use MD5 hashed password
      sms_id: smsId
    })
    
    const getUrl = `${apiUrl}?${params.toString()}`

    console.log(`📱 Sending SMS to ${formattedPhone} via AirTouch API (GET)`)
    console.log(`🔐 Using MD5 hashed password (length: ${hashedPassword.length})`)

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
      console.error('⚠️ Non-JSON response from AirTouch API:', text)
      return {
        success: false,
        response: `Invalid API response format: ${text.substring(0, 200)}`,
        status: response.status
      }
    }

    console.log('AirTouch API Response:', data)

    if (response.ok && data.status_code === '1000') {
      return {
        success: true,
        response: data.message_id || smsId,
        status: response.status
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
        response: errorMessage,
        status: response.status
      }
    }

  } catch (error) {
    console.error('AirTouch SMS API Error:', error)
    return {
      success: false,
      response: error instanceof Error ? error.message : 'Unknown error',
      status: 500
    }
  }
}

// POST - Send SMS message
export async function POST(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const {
      partner_id,
      recipient_phone,
      message_content,
      message_type = 'custom',
      template_id,
      variables = {}
    } = await request.json()

    // Validate required fields
    if (!partner_id || !recipient_phone || !message_content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: partner_id, recipient_phone, message_content' },
        { status: 400 }
      )
    }

    // Validate phone number format (254XXXXXXXXX)
    const phoneRegex = /^254\d{9}$/
    if (!phoneRegex.test(recipient_phone)) {
      return NextResponse.json(
        { success: false, error: 'Phone number must be in format 254XXXXXXXXX' },
        { status: 400 }
      )
    }

    // Get partner SMS settings
    const { data: smsSettings, error: settingsError } = await supabase
      .from('partner_sms_settings')
      .select('*')
      .eq('partner_id', partner_id)
      .eq('sms_enabled', true)
      .single()

    if (settingsError || !smsSettings) {
      return NextResponse.json(
        { success: false, error: 'SMS settings not found or disabled for this partner' },
        { status: 404 }
      )
    }

    // Decrypt Damza credentials
    const passphrase = process.env.JWT_SECRET || 'default-passphrase'
    const apiKey = decryptData(smsSettings.damza_api_key, passphrase)
    const username = decryptData(smsSettings.damza_username, passphrase)
    const senderId = smsSettings.damza_sender_id

    // Calculate SMS cost
    const smsCost = calculateSMSCost(message_content, smsSettings.sms_charge_per_message)

    // Get SMS charge config for this partner (single source of truth)
    const { data: smsChargeConfig, error: chargeConfigError } = await supabase
      .from('partner_charges_config')
      .select('id')
      .eq('partner_id', partner_id)
      .eq('charge_type', 'sms_charge')
      .eq('is_active', true)
      .single()

    // Handle case where charge config doesn't exist
    let chargeConfigId = null
    if (chargeConfigError) {
      if (chargeConfigError.code === 'PGRST116') {
        // No rows returned - charge config doesn't exist
        console.warn(`⚠️ SMS charge config not found for partner ${partner_id}. Transaction will be created without charge_config_id.`)
      } else {
        console.error('❌ Error fetching SMS charge config:', chargeConfigError)
      }
    } else if (smsChargeConfig) {
      chargeConfigId = smsChargeConfig.id
      console.log(`✅ Found SMS charge config ID: ${chargeConfigId} for partner ${partner_id}`)
    }

    // Check partner wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('id, current_balance')
      .eq('partner_id', partner_id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Partner wallet not found' },
        { status: 404 }
      )
    }

    if (wallet.current_balance < smsCost) {
      return NextResponse.json(
        { success: false, error: `Insufficient wallet balance. Required: KES ${smsCost}, Available: KES ${wallet.current_balance}` },
        { status: 400 }
      )
    }

    // Create SMS notification record
    const { data: smsNotification, error: notificationError } = await supabase
      .from('sms_notifications')
      .insert({
        partner_id,
        template_id,
        recipient_phone,
        message_type,
        message_content,
        status: 'pending',
        damza_sender_id: senderId,
        sms_cost: smsCost
      })
      .select()
      .single()

    if (notificationError) {
      console.error('Error creating SMS notification:', notificationError)
      return NextResponse.json(
        { success: false, error: 'Failed to create SMS notification record' },
        { status: 500 }
      )
    }

    // Send SMS via AirTouch API
    const smsResult = await sendAirTouchSMS(username, apiKey, recipient_phone, senderId, message_content)

    // Update SMS notification with result
    const updateData: any = {
      status: smsResult.success ? 'sent' : 'failed',
      sent_at: smsResult.success ? new Date().toISOString() : null,
      error_message: smsResult.success ? null : smsResult.response
    }

    if (smsResult.success) {
      // Extract reference from response if available
      const referenceMatch = smsResult.response.match(/reference[":\s]+([a-zA-Z0-9]+)/i)
      if (referenceMatch) {
        updateData.damza_reference = referenceMatch[1]
      }
    }

    const { error: updateError } = await supabase
      .from('sms_notifications')
      .update(updateData)
      .eq('id', smsNotification.id)

    if (updateError) {
      console.error('Error updating SMS notification:', updateError)
    }

    // If SMS was sent successfully, deduct cost from wallet
    if (smsResult.success) {
      // Create wallet transaction for SMS charge
      // Include charge_config_id in metadata for single source of truth
      const { data: walletTransaction, error: transactionError } = await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          transaction_type: 'sms_charge',
          amount: -smsCost, // Negative amount for deduction
          currency: 'KES',
          status: 'completed',
          description: `SMS charge for ${recipient_phone}`,
          reference: `SMS_${smsNotification.id}`,
          metadata: {
            charge_config_id: chargeConfigId, // Single source of truth
            sms_notification_id: smsNotification.id,
            recipient_phone: recipient_phone,
            message_type: message_type,
            sms_cost: smsCost
          }
        })
        .select()
        .single()

      if (transactionError) {
        console.error('Error creating wallet transaction:', transactionError)
      } else {
        // Update wallet balance using unified service
        const balanceResult = await UnifiedWalletService.updateWalletBalance(
          partner_id,
          -smsCost, // Negative amount for deduction
          'sms_charge',
          {
            reference: `SMS_${smsNotification.id}`,
            description: `SMS charge for ${recipient_phone}`,
            charge_config_id: chargeConfigId, // Single source of truth
            sms_notification_id: smsNotification.id,
            phone_number: recipient_phone,
            message_length: message_content.length,
            sms_cost: smsCost
          }
        )

        if (!balanceResult.success) {
          console.error('Error updating wallet balance:', balanceResult.error)
        }

        // Update SMS notification with wallet transaction ID
        await supabase
          .from('sms_notifications')
          .update({ wallet_transaction_id: walletTransaction.id })
          .eq('id', smsNotification.id)
      }
    }

    return NextResponse.json({
      success: smsResult.success,
      message: smsResult.success ? 'SMS sent successfully' : 'Failed to send SMS',
      data: {
        sms_notification: {
          ...smsNotification,
          status: updateData.status,
          sent_at: updateData.sent_at,
          damza_reference: updateData.damza_reference
        },
        sms_cost: smsCost,
        wallet_balance_after: smsResult.success ? wallet.current_balance - smsCost : wallet.current_balance
      },
      error: smsResult.success ? null : smsResult.response
    })

  } catch (error) {
    console.error('Send SMS Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
