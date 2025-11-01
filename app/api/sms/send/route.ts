import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateSMSCount, calculateSMSCost as calculateSMSCostUtil } from '@/lib/sms-utils'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import crypto from 'crypto'
import UnifiedWalletService from '@/lib/unified-wallet-service'
import { getAirTouchSMSBalance } from '@/lib/sms-balance-utils'

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
        response: `Invalid API response format: ${text.substring(0, 200)}`,
        status: response.status
      }
    }


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

    // Get SMS credentials - prioritize environment variables for super_admin/admin
    let username = ''
    let apiKey = ''
    let senderId = ''
    let isEncrypted = false

    // Check if super_admin/admin and environment variables are enabled
    const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true'
    if ((payload.role === 'super_admin' || payload.role === 'admin') && superAdminSmsEnabled) {
      // Use environment variables for super_admin/admin (fastest path)
      username = process.env.SUPER_ADMIN_SMS_USERNAME || ''
      apiKey = process.env.SUPER_ADMIN_SMS_API_KEY || ''
      senderId = process.env.SUPER_ADMIN_SMS_SENDER_ID || 'eazzypay'
      isEncrypted = false

      if (!username || !apiKey) {
        return NextResponse.json(
          { success: false, error: 'SMS credentials not configured in environment variables for super admin' },
          { status: 400 }
        )
      }
    } else {
      // Fallback to database partner SMS settings
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

      // Decrypt Damza credentials from database
      const passphrase = process.env.JWT_SECRET || 'default-passphrase'
      apiKey = decryptData(smsSettings.damza_api_key, passphrase)
      username = decryptData(smsSettings.damza_username, passphrase)
      senderId = smsSettings.damza_sender_id
      isEncrypted = smsSettings.is_encrypted || false
    }

    // Get SMS charge per message (from settings if using database, or use default)
    let smsChargePerMessage = 1 // Default
    if (!superAdminSmsEnabled || payload.role !== 'super_admin' && payload.role !== 'admin') {
      // Get from database settings if not using env vars
      const { data: smsSettings } = await supabase
        .from('partner_sms_settings')
        .select('sms_charge_per_message')
        .eq('partner_id', partner_id)
        .single()
      
      if (smsSettings?.sms_charge_per_message) {
        smsChargePerMessage = smsSettings.sms_charge_per_message
      }
    }

    // Calculate SMS cost
    const smsCost = calculateSMSCost(message_content, smsChargePerMessage)

    // Check AirTouch SMS balance before sending
    const smsBalanceResult = await getAirTouchSMSBalance(username, apiKey)
    
    if (!smsBalanceResult.success) {
      return NextResponse.json(
        { success: false, error: `Failed to check SMS balance: ${smsBalanceResult.error}` },
        { status: 500 }
      )
    }

    const smsBalance = smsBalanceResult.balance

    // Check if SMS balance is sufficient
    const minRequiredBalance = smsCost + 1
    if (smsBalance < minRequiredBalance) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient AirTouch SMS balance. Required: KES ${minRequiredBalance}, Available: KES ${smsBalance}`,
          sms_balance: smsBalance,
          required_balance: minRequiredBalance
        },
        { status: 400 }
      )
    }

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
    if (!chargeConfigError && smsChargeConfig) {
      chargeConfigId = smsChargeConfig.id
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
      // Log silently - notification created but update failed
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

      if (!transactionError) {
        // Update wallet balance using unified service
        await UnifiedWalletService.updateWalletBalance(
          partner_id,
          -smsCost,
          'sms_charge',
          {
            reference: `SMS_${smsNotification.id}`,
            description: `SMS charge for ${recipient_phone}`,
            charge_config_id: chargeConfigId,
            sms_notification_id: smsNotification.id,
            phone_number: recipient_phone,
            message_length: message_content.length,
            sms_cost: smsCost
          }
        )

        // Update SMS notification with wallet transaction ID
        await supabase
          .from('sms_notifications')
          .update({ wallet_transaction_id: walletTransaction.id })
          .eq('id', smsNotification.id)
      }
    }

    // Re-check SMS balance after sending to report current balance
    const finalBalanceResult = await getAirTouchSMSBalance(username, apiKey)
    const finalSmsBalance = finalBalanceResult.success ? finalBalanceResult.balance : null

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
        wallet_balance_after: smsResult.success ? wallet.current_balance - smsCost : wallet.current_balance,
        sms_balance_before: smsBalance,
        sms_balance_after: finalSmsBalance
      },
      error: smsResult.success ? null : smsResult.response
    })

  } catch (error) {
    console.error('Send SMS error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
