import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import UnifiedWalletService from '@/lib/unified-wallet-service'
import { verifyJWTToken } from '@/lib/jwt-utils'
import { calculateSMSCount, calculateSMSCost } from '@/lib/sms-utils'
import { getAirTouchSMSBalance } from '@/lib/sms-balance-utils'
import { log } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Send SMS campaign (partner version - uses super admin SMS settings)
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
    if (!payload || !(payload as any).userId) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const userId = (payload as any).userId

    // Get user's partner_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('partner_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      log.error('Error fetching user for partner campaign send', userError)
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Only allow partner_admin and regular users with partner_id
    if (user.role !== 'partner_admin' && !user.partner_id) {
      return NextResponse.json(
        { success: false, error: 'Partner access required' },
        { status: 403 }
      )
    }

    const partnerId = user.partner_id

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

    // Verify campaign belongs to this partner
    if (campaign.partner_id !== partnerId) {
      return NextResponse.json(
        { success: false, error: 'Campaign does not belong to your partner' },
        { status: 403 }
      )
    }

    // Check if campaign can be sent
    if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
      return NextResponse.json(
        { success: false, error: 'Campaign can only be sent from draft or scheduled status' },
        { status: 400 }
      )
    }

    // ALWAYS use super admin SMS settings (from environment variables)
    const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true'
    if (!superAdminSmsEnabled || !process.env.SUPER_ADMIN_SMS_USERNAME || !process.env.SUPER_ADMIN_SMS_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'SMS service is not configured. Please contact administrator.' },
        { status: 500 }
      )
    }

    const smsSettings = {
      damza_username: process.env.SUPER_ADMIN_SMS_USERNAME,
      damza_api_key: process.env.SUPER_ADMIN_SMS_API_KEY,
      damza_sender_id: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
      sms_enabled: true,
      sms_charge_per_message: 1, // Default cost
      is_encrypted: false
    }

    // Check partner wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('id, current_balance')
      .eq('partner_id', partnerId)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json(
        { success: false, error: 'Partner wallet not found' },
        { status: 400 }
      )
    }

    if (wallet.current_balance < campaign.total_cost) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient wallet balance. Required: KES ${campaign.total_cost}, Available: KES ${wallet.current_balance}` 
        },
        { status: 400 }
      )
    }

    // Check AirTouch SMS balance
    const smsBalanceResult = await getAirTouchSMSBalance(
      smsSettings.damza_username,
      smsSettings.damza_api_key
    )
    
    if (!smsBalanceResult.success) {
      return NextResponse.json(
        { success: false, error: `Failed to check SMS balance: ${smsBalanceResult.error}` },
        { status: 500 }
      )
    }

    const initialSmsBalance = smsBalanceResult.balance

    // Calculate estimated total cost
    const smsChargePerMessage = smsSettings.sms_charge_per_message || 1
    let estimatedTotalSmsCost = 0
    for (let i = 0; i < campaign.recipient_list.length; i++) {
      let processedMessage = campaign.message_content
      
      // Process message with merge fields if CSV data is available
      if (campaign.csv_data && campaign.csv_data[i]) {
        const recipientData = campaign.csv_data[i]
        Object.keys(recipientData).forEach(field => {
          const placeholder = `{{${field}}}`
          const value = recipientData[field]
          processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value)
        })
      }
      
      const smsCost = calculateSMSCost(processedMessage, smsChargePerMessage)
      estimatedTotalSmsCost += smsCost
    }

    // Check if SMS balance is sufficient
    const minRequiredSmsBalance = estimatedTotalSmsCost + 1
    if (initialSmsBalance < minRequiredSmsBalance) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient AirTouch SMS balance. Required: KES ${minRequiredSmsBalance}, Available: KES ${initialSmsBalance}. Please contact administrator.`,
          sms_balance: initialSmsBalance,
          required_balance: minRequiredSmsBalance,
          estimated_total_cost: estimatedTotalSmsCost
        },
        { status: 400 }
      )
    }

    // Update campaign status to sending
    const { error: updateError } = await supabase
      .from('sms_bulk_campaigns')
      .update({
        status: 'sending',
        started_at: new Date().toISOString()
      })
      .eq('id', params.id)

    if (updateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to start campaign' },
        { status: 500 }
      )
    }

    // Process SMS sending in background
    processSMSCampaign(campaign, smsSettings, wallet.current_balance, initialSmsBalance, true)
      .catch(async (error) => {
        log.error('Background SMS campaign processing error', error)
        try {
          await supabase
            .from('sms_bulk_campaigns')
            .update({ status: 'failed', error_message: error.message || 'Background processing failed' })
            .eq('id', params.id)
        } catch (updateError) {
          log.error('Failed to update campaign status on error', updateError)
        }
      })

    return NextResponse.json({
      success: true,
      message: 'SMS campaign started successfully',
      data: {
        estimated_total_cost: estimatedTotalSmsCost,
        sms_balance: initialSmsBalance,
        recipient_count: campaign.recipient_list.length
      }
    })

  } catch (error) {
    log.error('Partner Send SMS campaign error', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Background function to process SMS campaign (uses super admin settings)
async function processSMSCampaign(
  campaign: any,
  smsSettings: any,
  walletBalance: number,
  initialSmsBalance: number,
  useEnvVars: boolean = true
) {
  const crypto = await import('crypto')
  
  // Decrypt function (not needed for env vars, but kept for consistency)
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
      try {
        return Buffer.from(encryptedData, 'base64').toString('utf8')
      } catch (fallbackError) {
        return encryptedData
      }
    }
  }

  // Get credentials (already plain text for env vars)
  const decryptedApiKey = smsSettings.damza_api_key
  const decryptedUsername = smsSettings.damza_username
  const senderId = smsSettings.damza_sender_id

  let actualSentCount = 0
  let actualFailedCount = 0
  let totalCost = 0

  // Send SMS to each recipient
  for (let i = 0; i < campaign.recipient_list.length; i++) {
    const recipient = campaign.recipient_list[i]
    let processedMessage = campaign.message_content

    // Process merge fields if CSV data is available
    if (campaign.csv_data && campaign.csv_data[i]) {
      const recipientData = campaign.csv_data[i]
      Object.keys(recipientData).forEach(field => {
        const placeholder = `{{${field}}}`
        const value = recipientData[field]
        processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), value)
      })
    }

    // Format phone number
    let formattedPhone = recipient.phone || recipient.phone_number || recipient
    if (typeof formattedPhone !== 'string') {
      formattedPhone = String(formattedPhone)
    }
    formattedPhone = formattedPhone.replace(/\D/g, '')
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1)
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone
    }

    // Calculate SMS cost
    const smsCost = calculateSMSCost(processedMessage, smsSettings.sms_charge_per_message || 1)

    // Send SMS via AirTouch API
    try {
      const smsId = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/'
      const hashedPassword = crypto.createHash('md5').update(decryptedApiKey).digest('hex')
      
      const params = new URLSearchParams({
        issn: senderId,
        msisdn: formattedPhone,
        text: processedMessage,
        username: decryptedUsername,
        password: hashedPassword,
        sms_id: smsId
      })
      
      const getUrl = `${apiUrl}?${params.toString()}`
      const response = await fetch(getUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })

      let data: any
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        const text = await response.text()
        data = { error: text.substring(0, 200) }
      }

      const smsSuccess = response.ok && data.status_code === '1000'

      // Create SMS notification record
      await supabase
        .from('sms_notifications')
        .insert({
          partner_id: campaign.partner_id,
          bulk_campaign_id: campaign.id,
          recipient_phone: formattedPhone,
          message_type: 'bulk_campaign',
          message_content: processedMessage,
          status: smsSuccess ? 'sent' : 'failed',
          sent_at: smsSuccess ? new Date().toISOString() : null,
          error_message: smsSuccess ? null : (data.status_desc || data.error || 'Unknown error'),
          damza_sender_id: senderId,
          sms_cost: smsCost
        })

      if (smsSuccess) {
        actualSentCount++
        totalCost += smsCost
      } else {
        actualFailedCount++
      }

    } catch (smsError) {
      log.error('Error sending SMS in campaign', smsError)
      actualFailedCount++
      
      // Create failed notification record
      await supabase
        .from('sms_notifications')
        .insert({
          partner_id: campaign.partner_id,
          bulk_campaign_id: campaign.id,
          recipient_phone: formattedPhone,
          message_type: 'bulk_campaign',
          message_content: processedMessage,
          status: 'failed',
          error_message: smsError instanceof Error ? smsError.message : 'Unknown error',
          damza_sender_id: senderId,
          sms_cost: smsCost
        })
    }
  }

  // Update campaign with final status
  const finalStatus = actualSentCount > 0 ? 'completed' : 'failed'
  await supabase
    .from('sms_bulk_campaigns')
    .update({
      status: finalStatus,
      sent_count: actualSentCount + actualFailedCount,
      delivered_count: actualSentCount,
      failed_count: actualFailedCount,
      completed_at: new Date().toISOString()
    })
    .eq('id', campaign.id)

  // Deduct from wallet if SMS were sent
  if (totalCost > 0 && actualSentCount > 0) {
    const { data: wallet } = await supabase
      .from('partner_wallets')
      .select('id, current_balance')
      .eq('partner_id', campaign.partner_id)
      .single()

    if (wallet) {
      const { data: smsChargeConfig } = await supabase
        .from('partner_charges_config')
        .select('id')
        .eq('partner_id', campaign.partner_id)
        .eq('charge_type', 'sms_charge')
        .eq('is_active', true)
        .single()

      await UnifiedWalletService.updateWalletBalance(
        campaign.partner_id,
        -totalCost,
        'sms_charge',
        {
          reference: `SMS_CAMPAIGN_${campaign.id}`,
          description: `SMS Campaign: ${campaign.campaign_name}`,
          charge_config_id: smsChargeConfig?.id || null,
          bulk_campaign_id: campaign.id,
          total_cost: totalCost,
          sent_count: actualSentCount,
          delivered_count: actualSentCount,
          failed_count: actualFailedCount
        }
      )
    }
  }
}

