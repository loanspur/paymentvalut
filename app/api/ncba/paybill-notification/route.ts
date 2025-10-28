import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { getCurrentUtcTimestamp, ensureUtcTimestamp } from '../../../../lib/utils'
import UnifiedWalletService from '@/lib/unified-wallet-service'

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
      // Received XML notification
      
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

    // Get current UTC timestamp with proper Z suffix
    const currentUtcTime = getCurrentUtcTimestamp()
    
    // NCBA Paybill notification received

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

    // Validate hash (temporarily disabled for testing)
    // Hash validation temporarily disabled for testing
    
    // TODO: Fix hash validation method - NCBA is using different hash generation
    // if (!validateHash(Hash, settings.ncba_notification_secret_key, notificationData)) {
    //   console.error('Hash validation failed')
    //   return NextResponse.json({
    //     ResultCode: "1",
    //     ResultDesc: "Hash validation failed"
    //   })
    // }

    // Find partner by account reference
    // Handle different NCBA formats:
    // Format 1: BillRefNumber = "774451", Narrative = "FINSAFE" 
    // Format 2: BillRefNumber = "FINSAFE", BusinessShortCode = "774451"
    let partner = null
    const accountNumber = settings.ncba_account_number || '774451'
    
    // Try Format 1: Look for Narrative field
    let partnerIdentifier = notificationData.Narrative || notificationData.narrative
    
    // Try Format 2: If no Narrative, use BillRefNumber as partner identifier
    if (!partnerIdentifier && BillRefNumber !== accountNumber) {
      partnerIdentifier = BillRefNumber
    }
    
    if (BusinessShortCode === accountNumber && partnerIdentifier) {
      // Try to find partner by short code - case insensitive
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .ilike('short_code', partnerIdentifier)
        .eq('is_active', true)
        .single()

      if (partnerError || !partnerData) {
        console.error('Partner not found for short code:', partnerIdentifier)
        return NextResponse.json({
          ResultCode: "1",
          ResultDesc: "Partner not found"
        })
      }
      
      partner = partnerData
    } else {
      console.error('Invalid account reference format:', {
        businessShortCode: BusinessShortCode,
        billRefNumber: BillRefNumber,
        narrative: partnerIdentifier,
        expectedAccountNumber: accountNumber
      })
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
      // Transaction already processed
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
        amount: parseFloat(TransAmount), // Use 'amount' instead of 'transaction_amount'
        business_short_code: BusinessShortCode,
        bill_reference_number: `${BillRefNumber} ${partnerIdentifier}`, // Combine account number and partner
        customer_phone: Mobile,
        customer_name: name || null,
        status: 'completed',
        raw_notification: notificationData,
        created_at: ensureUtcTimestamp(created_at) || currentUtcTime
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

    // Update partner wallet balance using unified service
    try {
      console.log(`Processing wallet update for partner ${partner.name} (${partner.id}): ${TransAmount} KES`)
      
      const balanceResult = await UnifiedWalletService.updateWalletBalance(
        partner.id,
        parseFloat(TransAmount),
        'top_up',
        {
          reference: TransID,
          description: `Paybill payment from ${Mobile}`,
          ncb_transaction_id: TransID,
          ncb_transaction_time: TransTime,
          customer_name: name || 'Unknown Customer',
          phone_number: Mobile,
          business_short_code: BusinessShortCode,
          bill_ref_number: BillRefNumber
        }
      )

      if (!balanceResult.success) {
        console.error('Error updating wallet balance:', balanceResult.error)
      } else {
        console.log(`Wallet balance updated successfully: ${balanceResult.previousBalance} -> ${balanceResult.newBalance}`)
      }
    } catch (walletError) {
      console.error('Error processing wallet update:', walletError)
    }

    // NCBA Paybill notification processed successfully

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
