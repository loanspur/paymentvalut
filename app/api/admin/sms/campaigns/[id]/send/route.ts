import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../../../lib/jwt-utils'
import crypto from 'crypto'

// Decryption function for sensitive data
function decryptData(encryptedData: string, passphrase: string): string {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const textParts = encryptedData.split(':')
    
    if (textParts.length !== 2) {
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
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    } catch (fallbackError) {
      return encryptedData
    }
  }
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Send SMS campaign
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const payload = await verifyJWTToken(token)
    if (!payload || (payload.role !== 'admin' && payload.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code,
          is_active
        )
      `)
      .eq('id', params.id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json(
        { success: false, error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if campaign can be sent
    if (campaign.status !== 'draft') {
      return NextResponse.json(
        { success: false, error: 'Campaign can only be sent from draft status' },
        { status: 400 }
      )
    }

    // Get partner SMS settings
    const { data: smsSettings, error: settingsError } = await supabase
      .from('partner_sms_settings')
      .select('*')
      .eq('partner_id', campaign.partner_id)
      .single()

    if (settingsError || !smsSettings) {
      return NextResponse.json(
        { success: false, error: 'SMS settings not configured for this partner' },
        { status: 400 }
      )
    }

    if (!smsSettings.sms_enabled) {
      return NextResponse.json(
        { success: false, error: 'SMS is disabled for this partner' },
        { status: 400 }
      )
    }

    // Check partner wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('id, current_balance')
      .eq('partner_id', campaign.partner_id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Partner wallet not found' },
        { status: 400 }
      )
    }

    if (wallet.current_balance < campaign.total_cost) {
      return NextResponse.json(
        { success: false, error: 'Insufficient wallet balance for SMS campaign' },
        { status: 400 }
      )
    }

    // Update campaign status to sending
    const { error: updateError } = await supabase
      .from('sms_bulk_campaigns')
      .update({
        status: 'sending'
      })
      .eq('id', params.id)

    if (updateError) {
      console.error('Error updating campaign status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to start campaign' },
        { status: 500 }
      )
    }

    // Process SMS sending in background
    processSMSCampaign(campaign, smsSettings, wallet.current_balance)

    return NextResponse.json({
      success: true,
      message: 'SMS campaign started successfully'
    })

  } catch (error) {
    console.error('Send SMS Campaign Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background function to process SMS campaign
async function processSMSCampaign(campaign: any, smsSettings: any, walletBalance: number) {
  try {
    let sentCount = 0
    let deliveredCount = 0
    let failedCount = 0
    let totalCost = 0

    // Process each recipient
    for (const phoneNumber of campaign.recipient_list) {
      try {
        // Decrypt the API key before sending
        const passphrase = process.env.JWT_SECRET || 'default-passphrase'
        const decryptedApiKey = decryptData(smsSettings.damza_api_key, passphrase)
        const decryptedUsername = decryptData(smsSettings.damza_username, passphrase)
        
        // Send SMS via AirTouch API
        const smsResponse = await sendSMSViaAirTouch({
          phoneNumber,
          message: campaign.message_content,
          senderId: smsSettings.damza_sender_id,
          username: decryptedUsername,
          apiKey: decryptedApiKey // Use decrypted API key for MD5 hash
        })

        sentCount++

        if (smsResponse.success) {
          deliveredCount++
          totalCost += smsSettings.sms_charge_per_message || 0.50

          // Create SMS notification record
          await supabase
            .from('sms_notifications')
            .insert({
              partner_id: campaign.partner_id,
              recipient_phone: phoneNumber,
              message_type: 'bulk_campaign',
              message_content: campaign.message_content,
              status: 'sent',
              damza_reference: smsResponse.reference,
              damza_sender_id: smsSettings.damza_sender_id,
              sms_cost: smsSettings.sms_charge_per_message || 0.50
            })
        } else {
          failedCount++

          // Create failed SMS notification record
          await supabase
            .from('sms_notifications')
            .insert({
              partner_id: campaign.partner_id,
              recipient_phone: phoneNumber,
              message_type: 'bulk_campaign',
              message_content: campaign.message_content,
              status: 'failed'
            })
        }

        // Update campaign progress (simplified - no extra columns)
        // We'll update the final status at the end

        // Small delay between SMS sends to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error sending SMS to ${phoneNumber}:`, error)
        failedCount++
        sentCount++

        // Create failed SMS notification record
        await supabase
          .from('sms_notifications')
          .insert({
            partner_id: campaign.partner_id,
            recipient_phone: phoneNumber,
            message_type: 'bulk_campaign',
            message_content: campaign.message_content,
            status: 'failed',
            bulk_campaign_id: campaign.id
          })
      }
    }

    // Update campaign final status
    const finalStatus = failedCount === campaign.recipient_list.length ? 'failed' : 'completed'
    
    await supabase
      .from('sms_bulk_campaigns')
      .update({
        status: finalStatus,
        sent_at: new Date().toISOString()
      })
      .eq('id', campaign.id)

    // Deduct cost from partner wallet
    if (totalCost > 0) {
      // Get the wallet to get the wallet ID
      const { data: wallet, error: walletError } = await supabase
        .from('partner_wallets')
        .select('id')
        .eq('partner_id', campaign.partner_id)
        .single()

      if (walletError || !wallet) {
        console.error('Error fetching wallet for transaction:', walletError)
        return
      }

      await supabase
        .from('partner_wallets')
        .update({
          current_balance: walletBalance - totalCost
        })
        .eq('partner_id', campaign.partner_id)

      // Create wallet transaction record
      await supabase
        .from('wallet_transactions')
        .insert({
          wallet_id: wallet.id,
          transaction_type: 'sms_charge',
          amount: -totalCost,
          description: `SMS Campaign: ${campaign.campaign_name}`,
          reference: `SMS_CAMPAIGN_${campaign.id}`,
          status: 'completed'
        })
    }

    console.log(`SMS Campaign ${campaign.id} completed: ${deliveredCount} sent, ${failedCount} failed`)

  } catch (error) {
    console.error('Error processing SMS campaign:', error)
    
    // Update campaign status to failed
    await supabase
      .from('sms_bulk_campaigns')
      .update({
        status: 'failed'
      })
      .eq('id', campaign.id)
  }
}

// Function to send SMS via AirTouch SMS API
async function sendSMSViaAirTouch({
  phoneNumber,
  message,
  senderId,
  username,
  apiKey
}: {
  phoneNumber: string
  message: string
  senderId: string
  username: string
  apiKey: string
}) {
  try {
    // Check if we're in test mode (when credentials are test values)
    const isTestMode = !username || !apiKey || username.includes('test') || apiKey.includes('test') || username === '***encrypted***' || apiKey === '***encrypted***'
    
    if (isTestMode) {
      console.log(`🧪 Test Mode: Simulating SMS send to ${phoneNumber}`)
      
      // Simulate successful SMS sending in test mode
      return {
        success: true,
        reference: `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
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
    const smsId = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // AirTouch SMS API integration - Use GET request format
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/'
    
    // According to AirTouch API docs:
    // password = md5 sum from the string "api key" in hexadecimal
    const crypto = require('crypto')
    
    // Create MD5 hash of the API key as required by AirTouch API
    const hashedPassword = crypto.createHash('md5').update(apiKey).digest('hex')
    
    // Build GET request URL with parameters
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: message,
      username: username,
      password: hashedPassword, // Use MD5 hashed API key
      sms_id: smsId
    })
    
    const getUrl = `${apiUrl}?${params.toString()}`
    
    console.log(`📱 Sending SMS to ${formattedPhone} via AirTouch API (GET)`)
    console.log(`📱 GET URL: ${getUrl}`)

    try {
      const response = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log('📱 AirTouch API Response:', data)

      if (response.ok && data.status_code === '1000') {
        console.log('✅ AirTouch API call successful!')
        return {
          success: true,
          reference: data.message_id || smsId
        }
      } else {
        console.log(`⚠️ AirTouch API returned error: ${data.status_desc || 'Unknown error'}`)
        
        // Check if it's an authentication issue
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
      console.error('AirTouch API Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }

  } catch (error) {
    console.error('AirTouch SMS API Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
