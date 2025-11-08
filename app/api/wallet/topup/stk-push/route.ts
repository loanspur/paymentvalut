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

    

    if (userError || !currentUser || !currentUser.is_active) {
      
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
      
    } else if (currentUser.partner_id) {
      // Regular users use their assigned partner
      targetPartnerId = currentUser.partner_id
      
    } else {
      
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

    

    if (partnerError || !partner) {
      
      return NextResponse.json(
        { success: false, error: 'Partner not found in database' },
        { status: 404 }
      )
    }

    if (!partner.is_active) {
      
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
        'ncba_notification_username', 
        'ncba_notification_password',
        'ncba_account_number',
        'ncba_account_reference_separator'
      ])

    if (settingsError) {
      
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
                
              }
              
              // If all methods fail, return the original data
              
              return encryptedData
              
            } catch (error) {
              
              return encryptedData // Return original if decryption fails
            }
          }
          
          value = await decryptData(value, passphrase)
          
        } catch (error) {
          
        }
      }
      
      settings[setting.setting_key] = value
    }

    // Debug: Log global NCBA STK Push credentials status
    

    // Normalize credentials (trim to avoid hidden whitespace causing auth failures)
    settings.ncba_notification_username = (settings.ncba_notification_username || '').trim()
    settings.ncba_notification_password = (settings.ncba_notification_password || '').trim()

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
      
        return NextResponse.json(
          { success: false, error: 'Failed to create wallet' },
          { status: 500 }
        )
      }

      wallet = newWallet
    } else if (walletError) {
      
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
    // Use partner short_code instead of partner.id for consistency with manual payments
    // Format: 774451#FINSAFE (same as manual paybill payments)
    const partnerShortCode = partner.short_code || partner.id
    const account_reference = `${account_number}${account_reference_separator}${partnerShortCode}`
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
    

    // Debug: Log authentication attempt details
    

    // Build Basic header once; also emit masked preview for troubleshooting
    const basicHeader = `Basic ${Buffer.from(`${settings.ncba_notification_username}:${settings.ncba_notification_password}`).toString('base64')}`
    

    const authResponse = await fetch('https://c2bapis.ncbagroup.com/payments/api/v1/auth/token', {
      method: 'GET',
      headers: {
        'Authorization': basicHeader
      }
    })

    

    // Read body once and optionally parse JSON
    const responseText = await authResponse.text()
    

    if (!authResponse.ok) {
      
      
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

    let authData: any
    try {
      authData = responseText ? JSON.parse(responseText) : {}
    } catch {
      authData = {}
    }
    
    
    const access_token = authData.access_token

    if (!access_token) {
      
      return NextResponse.json(
        { success: false, error: 'NCBA authentication failed: No access token received' },
        { status: 500 }
      )
    }

    // Initiate STK Push using NCBA API
    

    // Log full JSON (masked phone/account) for audit
    const maskedPayload = {
      ...stkPushRequest,
      TelephoneNo: stkPushRequest.TelephoneNo?.replace(/^(\d{5})\d+(\d{3})$/, '$1******$2'),
      AccountNo: stkPushRequest.AccountNo?.replace(/^(......).+$/, '$1********')
    }
    

    const stkPushResponse = await fetch('https://c2bapis.ncbagroup.com/payments/api/v1/stk-push/initiate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushRequest)
    })

    // Read body once and try to parse JSON safely
    const stkPushText = await stkPushResponse.text()
    let stkPushData: any = {}
    try {
      stkPushData = stkPushText ? JSON.parse(stkPushText) : {}
    } catch {
      // Non-JSON body (e.g., HTML error page)
      stkPushData = { raw: stkPushText }
    }

    

    if (!stkPushResponse.ok) {
      
      let errorMessage = 'STK Push failed'
      if (typeof stkPushData === 'object' && stkPushData && stkPushData.message) {
        errorMessage = `STK Push failed: ${stkPushData.message}`
      } else if (stkPushResponse.status === 401) {
        errorMessage = 'STK Push failed: Authentication expired. Please try again.'
      } else if (stkPushResponse.status >= 500) {
        errorMessage = 'STK Push failed: NCBA service temporarily unavailable.'
      } else if (typeof stkPushData?.raw === 'string') {
        errorMessage = `STK Push failed: ${stkPushData.raw.slice(0, 120)}`
      }
      return NextResponse.json(
        { success: false, error: errorMessage },
        { status: 500 }
      )
    }

    // Check NCBA response status (NCBA uses StatusCode field)
    if (stkPushData.StatusCode !== "0" && stkPushData.StatusCode !== 0) {
      
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
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}