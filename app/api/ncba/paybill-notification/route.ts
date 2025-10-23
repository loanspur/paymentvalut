import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Function to generate hash for validation (as per NCBA documentation)
function generateHash(secretKey: string, transType: string, transID: string, transTime: string, transAmount: string, businessShortCode: string, billRefNumber: string, mobile: string, name: string): string {
  try {
    // Concatenate values as per NCBA documentation
    const hashString = secretKey + transType + transID + transTime + transAmount + businessShortCode + billRefNumber + mobile + name + "1"
    
    // Hash with SHA256
    const sha256Hash = crypto.createHash('sha256').update(hashString, 'utf8').digest('hex')
    
    // Convert to Base64
    const base64Hash = Buffer.from(sha256Hash, 'hex').toString('base64')
    
    return base64Hash
  } catch (error) {
    console.error('Error generating hash:', error)
    return ''
  }
}

// Function to validate hash
function validateHash(receivedHash: string, secretKey: string, notificationData: any): boolean {
  const generatedHash = generateHash(
    secretKey,
    notificationData.TransType || notificationData.transType,
    notificationData.TransID || notificationData.transID,
    notificationData.TransTime || notificationData.transTime,
    notificationData.TransAmount || notificationData.transAmount,
    notificationData.BusinessShortCode || notificationData.businessShortCode,
    notificationData.BillRefNumber || notificationData.billRefNumber || 'N/A',
    notificationData.Mobile || notificationData.mobile,
    notificationData.name || notificationData.CustomerName || notificationData.customerName
  )
  
  return receivedHash === generatedHash
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    let notificationData: any = {}
    
    // Parse request body based on content type
    if (contentType.includes('application/json')) {
      notificationData = await request.json()
    } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
      const xmlBody = await request.text()
      console.log('Received XML notification:', xmlBody)
      
      // For now, we'll focus on JSON notifications
      // XML parsing can be added later if needed
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "XML notifications not yet supported"
      })
    } else {
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "Unsupported content type"
      })
    }

    console.log('NCBA Paybill Notification received:', JSON.stringify(notificationData, null, 2))

    // Extract notification data
    const {
      TransType,
      TransID,
      TransTime,
      TransAmount,
      BusinessShortCode,
      BillRefNumber,
      Mobile,
      name,
      Username,
      Password,
      Hash,
      created_at
    } = notificationData

    // Validate required fields
    if (!TransID || !TransAmount || !BusinessShortCode || !Mobile) {
      console.error('Missing required fields in notification')
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "Missing required fields"
      })
    }

    // Get system NCBA settings
    const { data: systemSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'ncba_business_short_code',
        'ncba_notification_username',
        'ncba_notification_password',
        'ncba_notification_secret_key',
        'ncba_account_number',
        'ncba_account_reference_separator'
      ])

    if (settingsError || !systemSettings || systemSettings.length === 0) {
      console.error('System NCBA settings not found')
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "System configuration not found"
      })
    }

    // Convert settings array to object
    const settings = systemSettings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, string>)

    // Validate business short code
    if (BusinessShortCode !== settings.ncba_business_short_code) {
      console.error('Invalid business short code:', BusinessShortCode)
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "Invalid business short code"
      })
    }

    // Validate authentication credentials
    if (Username !== settings.ncba_notification_username || Password !== settings.ncba_notification_password) {
      console.error('Invalid authentication credentials')
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "Invalid credentials"
      })
    }

    // Validate hash
    if (!validateHash(Hash, settings.ncba_notification_secret_key, notificationData)) {
      console.error('Hash validation failed')
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "Hash validation failed"
      })
    }

    // Find partner by account reference (BillRefNumber should be in format 123456#UNIQUE_PARTNER_ID)
    let partner = null
    if (BillRefNumber && BillRefNumber.includes(settings.ncba_account_reference_separator)) {
      const parts = BillRefNumber.split(settings.ncba_account_reference_separator)
      if (parts.length === 2 && parts[0] === settings.ncba_account_number) {
        const partnerId = parts[1]
        
        const { data: partnerData, error: partnerError } = await supabase
          .from('partners')
          .select('*')
          .eq('id', partnerId)
          .eq('is_active', true)
          .single()

        if (partnerError || !partnerData) {
          console.error('Partner not found for account reference:', BillRefNumber)
          return NextResponse.json({
            ResultCode: "1",
            ResultDesc: "Partner not found"
          })
        }
        
        partner = partnerData
      } else {
        console.error('Invalid account reference format:', BillRefNumber)
        return NextResponse.json({
          ResultCode: "1",
          ResultDesc: "Invalid account reference format"
        })
      }
    } else {
      console.error('Invalid account reference format:', BillRefNumber)
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "Invalid account reference format"
      })
    }

    // Check if this transaction has already been processed
    const { data: existingTransaction, error: existingError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('transaction_id', TransID)
      .single()

    if (existingTransaction) {
      console.log('Transaction already processed:', TransID)
      return NextResponse.json({
        ResultCode: "0",
        ResultDesc: "Transaction already processed"
      })
    }

    // Create C2B transaction record
    const { data: c2bTransaction, error: c2bError } = await supabase
      .from('c2b_transactions')
      .insert({
        partner_id: partner.id,
        transaction_id: TransID,
        transaction_type: TransType || 'PAYBILL',
        transaction_time: TransTime,
        transaction_amount: parseFloat(TransAmount),
        business_short_code: BusinessShortCode,
        bill_reference_number: BillRefNumber || null,
        customer_phone: Mobile,
        customer_name: name || null,
        status: 'completed',
        raw_notification: notificationData,
        created_at: created_at || new Date().toISOString()
      })
      .select()
      .single()

    if (c2bError) {
      console.error('Error creating C2B transaction:', c2bError)
      return NextResponse.json({
        ResultCode: "1",
        ResultDesc: "Failed to record transaction"
      })
    }

    // Update partner wallet balance
    try {
      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('partner_wallets')
        .select('*')
        .eq('partner_id', partner.id)
        .single()

      if (walletError && walletError.code !== 'PGRST116') {
        console.error('Error fetching wallet:', walletError)
      } else {
        let currentBalance = 0
        if (wallet) {
          currentBalance = wallet.balance || 0
        } else {
          // Create wallet if it doesn't exist
          const { data: newWallet, error: createError } = await supabase
            .from('partner_wallets')
            .insert({
              partner_id: partner.id,
              balance: 0,
              currency: 'KES',
              is_active: true
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating wallet:', createError)
          } else {
            currentBalance = 0
          }
        }

        // Update wallet balance
        const newBalance = currentBalance + parseFloat(TransAmount)
        const { error: balanceError } = await supabase
          .from('partner_wallets')
          .upsert({
            partner_id: partner.id,
            balance: newBalance,
            currency: 'KES',
            is_active: true,
            updated_at: new Date().toISOString()
          })

        if (balanceError) {
          console.error('Error updating wallet balance:', balanceError)
        } else {
          console.log(`Wallet balance updated for partner ${partner.name}: ${currentBalance} -> ${newBalance}`)
        }

        // Create wallet transaction record
        const { data: walletTransaction, error: walletTransactionError } = await supabase
          .from('wallet_transactions')
          .insert({
            partner_id: partner.id,
            transaction_type: 'top_up',
            amount: parseFloat(TransAmount),
            currency: 'KES',
            status: 'completed',
            reference: TransID,
            description: `Wallet top-up via NCBA Paybill - ${BillRefNumber || 'N/A'}`,
            metadata: {
              c2b_transaction_id: c2bTransaction.id,
              transaction_type: TransType,
              business_short_code: BusinessShortCode,
              bill_reference: BillRefNumber,
              customer_phone: Mobile,
              customer_name: name,
              source: 'ncba_paybill_notification'
            }
          })
          .select()
          .single()

        if (walletTransactionError) {
          console.error('Error creating wallet transaction:', walletTransactionError)
        }
      }
    } catch (walletError) {
      console.error('Error processing wallet update:', walletError)
    }

    console.log('NCBA Paybill notification processed successfully:', TransID)

    // Return success response
    return NextResponse.json({
      ResultCode: "0",
      ResultDesc: "Transaction processed successfully"
    })

  } catch (error) {
    console.error('NCBA Paybill Notification Error:', error)
    return NextResponse.json({
      ResultCode: "1",
      ResultDesc: "Internal server error"
    })
  }
}
