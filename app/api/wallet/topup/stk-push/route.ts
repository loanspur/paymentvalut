import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { amount, phone_number, partner_id } = await request.json()

    if (!amount || !phone_number) {
      return NextResponse.json(
        { success: false, error: 'Amount and phone number are required' },
        { status: 400 }
      )
    }

    if (amount < 1) {
      return NextResponse.json(
        { success: false, error: 'Amount must be greater than 0' },
        { status: 400 }
      )
    }

    // Validate phone number format (254XXXXXXXXX)
    const phoneRegex = /^254\d{9}$/
    if (!phoneRegex.test(phone_number)) {
      return NextResponse.json(
        { success: false, error: 'Phone number must be in format 254XXXXXXXXX' },
        { status: 400 }
      )
    }

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

    // Get current user from database
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('id, role, partner_id, is_active, email')
      .eq('id', payload.userId)
      .single()

    console.log('🔍 [DEBUG] Current user lookup:', {
      userId: payload.userId,
      userError: userError,
      currentUser: currentUser ? {
        id: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        partner_id: currentUser.partner_id,
        is_active: currentUser.is_active
      } : null
    })

    if (userError || !currentUser || !currentUser.is_active) {
      console.error('❌ User validation failed:', {
        userError,
        currentUser,
        userId: payload.userId
      })
      return NextResponse.json(
        { success: false, error: 'User not found or inactive' },
        { status: 401 }
      )
    }

    // Determine which partner to use
    let targetPartnerId: string

    if (currentUser.role === 'super_admin' && partner_id) {
      // Super admin can specify any partner
      targetPartnerId = partner_id
      console.log('🔍 [DEBUG] Super admin selected partner:', targetPartnerId)
    } else if (currentUser.partner_id) {
      // Regular users use their assigned partner
      targetPartnerId = currentUser.partner_id
      console.log('🔍 [DEBUG] Regular user using assigned partner:', targetPartnerId)
    } else {
      console.error('❌ User has no partner_id:', {
        userId: currentUser.id,
        email: currentUser.email,
        role: currentUser.role,
        partner_id: currentUser.partner_id
      })
      return NextResponse.json(
        { success: false, error: 'User is not assigned to any partner. Please contact administrator to assign you to a partner.' },
        { status: 400 }
      )
    }

    // Get partner details
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', targetPartnerId)
      .single()

    console.log('🔍 [DEBUG] Partner lookup:', {
      partnerId: targetPartnerId,
      partnerError: partnerError,
      partner: partner ? {
        id: partner.id,
        name: partner.name,
        short_code: partner.short_code,
        is_active: partner.is_active
      } : null
    })

    if (partnerError || !partner) {
      console.error('❌ Partner lookup failed:', {
        partnerError,
        partner,
        partnerId: targetPartnerId
      })
      return NextResponse.json(
        { success: false, error: 'Partner not found in database' },
        { status: 404 }
      )
    }

    if (!partner.is_active) {
      console.error('❌ Partner is inactive:', {
        partnerId: partner.id,
        partnerName: partner.name,
        is_active: partner.is_active
      })
      return NextResponse.json(
        { success: false, error: 'Partner account is inactive. Please contact administrator.' },
        { status: 400 }
      )
    }

    // Get global NCBA system settings for STK Push authentication
    const { data: ncbaSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, is_encrypted')
      .in('setting_key', [
        'ncba_business_short_code',
        'ncba_stk_push_username', 
        'ncba_stk_push_password',
        'ncba_stk_push_passkey',
        'ncba_account_number',
        'ncba_account_reference_separator'
      ])

    if (settingsError) {
      console.error('Error fetching NCBA settings:', settingsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch NCBA system settings' },
        { status: 500 }
      )
    }

    // Convert settings array to object and decrypt encrypted values
    const settings: Record<string, string> = {}
    
    for (const setting of ncbaSettings) {
      let value = setting.setting_value
      
      // Decrypt if the setting is encrypted
      if (setting.is_encrypted && value) {
        try {
          const crypto = await import('crypto')
          const passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase'
          
          const decryptData = async (encryptedData: string, passphrase: string): Promise<string> => {
            try {
              // Try different decryption methods
              
              // Method 1: Current format (iv + encrypted data)
              if (encryptedData.length > 32 && encryptedData.slice(32).length > 0) {
                try {
                  const key = crypto.scryptSync(passphrase, 'salt', 32)
                  const iv = Buffer.from(encryptedData.slice(0, 32), 'hex')
                  const encrypted = encryptedData.slice(32)
                  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
                  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
                  decrypted += decipher.final('utf8')
                  return decrypted
                } catch (error) {
                  console.log(`   Method 1 failed for ${setting.setting_key}, trying method 2...`)
                }
              }
              
              // Method 2: Format with colon separator (iv:encrypted)
              if (encryptedData.includes(':')) {
                try {
                  const parts = encryptedData.split(':')
                  if (parts.length === 2) {
                    const key = crypto.scryptSync(passphrase, 'salt', 32)
                    const iv = Buffer.from(parts[0], 'hex')
                    const encrypted = parts[1]
                    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
                    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
                    decrypted += decipher.final('utf8')
                    return decrypted
                  }
                } catch (error) {
                  console.log(`   Method 2 failed for ${setting.setting_key}, trying method 3...`)
                }
              }
              
              // Method 3: Simple base64 decode (if it's just base64 encoded)
              try {
                const decoded = Buffer.from(encryptedData, 'base64').toString('utf8')
                // Check if it looks like plain text (no special characters that would indicate encryption)
                if (/^[a-zA-Z0-9@._-]+$/.test(decoded)) {
                  return decoded
                }
              } catch (error) {
                console.log(`   Method 3 failed for ${setting.setting_key}`)
              }
              
              // If all methods fail, return the original data
              console.log(`   All decryption methods failed for ${setting.setting_key}, returning original`)
              return encryptedData
              
            } catch (error) {
              console.error(`   Decryption error for ${setting.setting_key}:`, error.message)
              return encryptedData // Return original if decryption fails
            }
          }
          
          value = await decryptData(value, passphrase)
          console.log(`🔓 Decrypted ${setting.setting_key}: ${value ? 'SUCCESS' : 'FAILED'}`)
        } catch (error) {
          console.error(`❌ Failed to decrypt ${setting.setting_key}:`, error)
        }
      }
      
      settings[setting.setting_key] = value
    }

    // Debug: Log global NCBA STK Push credentials status
    console.log('🔍 [DEBUG] NCBA Notification Credentials Status:', {
      hasNotificationUsername: !!settings.ncba_notification_username,
      hasNotificationPassword: !!settings.ncba_notification_password,
      hasBusinessShortCode: !!settings.ncba_business_short_code,
      notificationUsernameLength: settings.ncba_notification_username?.length || 0,
      notificationPasswordLength: settings.ncba_notification_password?.length || 0
    })

    // Check if NCBA notification credentials are configured (we'll use these for STK Push)
    if (!settings.ncba_notification_username || !settings.ncba_notification_password) {
      return NextResponse.json(
        { success: false, error: 'NCBA notification credentials not configured. Please configure NCBA notification credentials in system settings.' },
        { status: 400 }
      )
    }

    // Get or create wallet for the partner
    let { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partner.id)
      .single()

    if (walletError && walletError.code === 'PGRST116') {
      // Wallet doesn't exist, create it
      const { data: newWallet, error: createError } = await supabase
        .from('partner_wallets')
        .insert({
          partner_id: partner.id,
          current_balance: 0,
          currency: 'KES',
          low_balance_threshold: 1000,
          sms_notifications_enabled: true
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating wallet:', createError)
        return NextResponse.json(
          { success: false, error: 'Failed to create wallet' },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (walletError) {
      console.error('Error fetching wallet:', walletError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wallet' },
        { status: 500 }
      )
    }

    // Create wallet transaction record
    const { data: walletTransaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .insert({
        wallet_id: wallet.id,
        transaction_type: 'top_up',
        amount: amount,
        currency: 'KES',
        status: 'pending',
        description: `Wallet top-up via NCBA STK Push - ${phone_number}`,
        reference: `TOPUP_${Date.now()}`,
        metadata: {
          phone_number: phone_number,
          stk_push_initiated: true,
          initiated_at: new Date().toISOString()
        }
      })
      .select()
      .single()

    if (transactionError) {
      console.error('Error creating wallet transaction:', transactionError)
      return NextResponse.json(
        { success: false, error: 'Failed to create transaction record' },
        { status: 500 }
      )
    }

    // Generate transaction reference for NCBA
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14)
    const paybill_number = settings.ncba_business_short_code || '880100'
    const account_number = settings.ncba_account_number || '774451'
    const account_reference_separator = settings.ncba_account_reference_separator || '#'
    const account_reference = `${account_number}${account_reference_separator}${partner.id}`
    const transaction_reference = `STK${timestamp}${Math.random().toString(36).substr(2, 4).toUpperCase()}`

    // Prepare NCBA STK Push request (different format from Safaricom)
    const stkPushRequest = {
      TelephoneNo: phone_number,
      Amount: amount.toString(), // Amount as string
      PayBillNo: paybill_number,
      AccountNo: account_reference,
      Network: "Safaricom",
      TransactionType: "CustomerPayBillOnline"
    }

    // Get NCBA access token using notification credentials
    console.log('🔍 [DEBUG] NCBA Authentication attempt:', {
      notificationUsername: settings.ncba_notification_username ? 'SET' : 'NOT SET',
      notificationPassword: settings.ncba_notification_password ? 'SET' : 'NOT SET',
      paybillNumber: paybill_number
    })

    // Debug: Log authentication attempt details
    console.log('🔍 [DEBUG] NCBA Authentication Attempt:', {
      authUrl: 'https://c2bapis.ncbagroup.com/payments/api/v1/auth/token',
      notificationUsername: settings.ncba_notification_username,
      notificationPasswordLength: settings.ncba_notification_password?.length || 0,
      authHeaderLength: Buffer.from(`${settings.ncba_notification_username}:${settings.ncba_notification_password}`).toString('base64').length
    })

    const authResponse = await fetch('https://c2bapis.ncbagroup.com/payments/api/v1/auth/token', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${settings.ncba_notification_username}:${settings.ncba_notification_password}`).toString('base64')}`,
        'Content-Type': 'application/json'
      }
    })

    console.log('🔍 [DEBUG] NCBA Auth Response:', {
      status: authResponse.status,
      statusText: authResponse.statusText,
      ok: authResponse.ok
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      console.error('❌ NCBA Auth Error:', {
        status: authResponse.status,
        statusText: authResponse.statusText,
        errorText: errorText,
        notificationUsername: settings.ncba_notification_username,
        notificationPasswordLength: settings.ncba_notification_password?.length || 0
      })
      
      let errorMessage = 'Failed to authenticate with NCBA'
      if (authResponse.status === 400) {
        errorMessage = 'NCBA authentication failed: Bad request. Please check your NCBA credentials format and ensure they are correct.'
      } else if (authResponse.status === 401) {
        errorMessage = 'NCBA authentication failed: Invalid credentials. Please check your NCBA notification username and password in system settings.'
      } else if (authResponse.status === 403) {
        errorMessage = 'NCBA access forbidden: Please check your NCBA account permissions.'
      } else if (authResponse.status >= 500) {
        errorMessage = 'NCBA service temporarily unavailable. Please try again later.'
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    const authData = await authResponse.json()
    console.log('✅ NCBA Auth Success:', {
      hasAccessToken: !!authData.access_token,
      tokenLength: authData.access_token ? authData.access_token.length : 0
    })
    
    const access_token = authData.access_token

    if (!access_token) {
      console.error('❌ No access token received from NCBA')
      return NextResponse.json(
        { success: false, error: 'NCBA authentication failed: No access token received' },
        { status: 500 }
      )
    }

    // Initiate STK Push using NCBA API
    console.log('🔍 [DEBUG] NCBA STK Push Request:', {
      telephoneNo: stkPushRequest.TelephoneNo,
      amount: stkPushRequest.Amount,
      payBillNo: stkPushRequest.PayBillNo,
      accountNo: stkPushRequest.AccountNo,
      network: stkPushRequest.Network,
      transactionType: stkPushRequest.TransactionType
    })

    const stkPushResponse = await fetch('https://c2bapis.ncbagroup.com/payments/api/v1/stk-push/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushRequest)
    })

    const stkPushData = await stkPushResponse.json()
    
    console.log('🔍 [DEBUG] STK Push Response:', {
      status: stkPushResponse.status,
      ok: stkPushResponse.ok,
      responseData: stkPushData
    })

    if (!stkPushResponse.ok) {
      console.error('❌ NCBA STK Push Error:', stkPushData)
      
      let errorMessage = 'STK Push failed'
      if (stkPushData.message) {
        errorMessage = `STK Push failed: ${stkPushData.message}`
      } else if (stkPushResponse.status === 401) {
        errorMessage = 'STK Push failed: Authentication expired. Please try again.'
      } else if (stkPushResponse.status >= 500) {
        errorMessage = 'STK Push failed: NCBA service temporarily unavailable.'
      }
      
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    // Check NCBA response status (NCBA uses StatusCode field)
    if (stkPushData.StatusCode !== "0" && stkPushData.StatusCode !== 0) {
      console.error('❌ NCBA STK Push Failed:', stkPushData)
      return NextResponse.json(
        { success: false, error: `STK Push failed: ${stkPushData.StatusDescription || 'Unknown error'}` },
        { status: 500 }
      )
    }

    // Create STK Push log record
    const { data: stkPushLog, error: stkPushError } = await supabase
      .from('ncb_stk_push_logs')
      .insert({
        partner_id: partner.id,
        wallet_transaction_id: walletTransaction.id,
        stk_push_transaction_id: stkPushData.TransactionID,
        partner_phone: phone_number,
        amount: amount,
        ncb_paybill_number: paybill_number,
        ncb_account_number: account_reference,
        stk_push_status: 'initiated',
        ncb_response: stkPushData
      })
      .select()
      .single()

    if (stkPushError) {
      console.error('Error creating STK Push log:', stkPushError)
      // Don't fail the request, just log the error
    }

    console.log('NCBA STK Push initiated successfully:', {
      phone_number,
      amount,
      transaction_id: stkPushData.TransactionID,
      reference_id: stkPushData.ReferenceID,
      wallet_transaction_id: walletTransaction.id,
      partner_id: partner.id
    })

    return NextResponse.json({
      success: true,
      message: 'STK Push initiated successfully',
      data: {
        wallet_transaction: walletTransaction,
        stk_push_log: stkPushLog,
        transaction_id: stkPushData.TransactionID,
        reference_id: stkPushData.ReferenceID
      }
    })

  } catch (error) {
    console.error('STK Push Top-up Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}