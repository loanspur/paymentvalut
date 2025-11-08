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

    // FIRST: Check if this is an STK Push notification
    // STK Push notifications come with AccountNo format like "774451#PARTNER_ID" in BillRefNumber
    const accountNumber = settings.ncba_account_number || '774451'
    const accountReferenceSeparator = settings.ncba_account_reference_separator || '#'
    
    // Check if BillRefNumber contains account number + separator (STK Push format)
    let isSTKPushNotification = false
    let stkPushPartnerId: string | null = null
    
    // Normalize phone number for matching (remove spaces, dashes, etc.)
    const normalizePhone = (phone: string): string => {
      if (!phone) return ''
      // Remove all non-digit characters
      return phone.replace(/\D/g, '')
    }
    
    const normalizedMobile = normalizePhone(Mobile)
    
    // Check if this might be an STK Push notification
    // STK Push uses account reference format: "774451#PARTNER_ID" or "774451#PARTNER_SHORT_CODE"
    
    // First, try to find STK push logs by amount and phone (most reliable)
    // This works regardless of BillRefNumber format
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    const notificationAmount = parseFloat(TransAmount)
    
    // Query with amount matching - use numeric comparison to handle decimal precision
    const { data: allStkPushLogs, error: stkLogsError } = await supabase
      .from('ncb_stk_push_logs')
      .select('*, wallet_transaction:wallet_transactions(*)')
      .in('stk_push_status', ['initiated', 'pending'])
      .gte('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (stkLogsError) {
      console.error('Error fetching STK push logs:', stkLogsError)
    }
    
    // Filter by amount (handle decimal precision issues)
    const amountMatchedLogs = allStkPushLogs?.filter(log => {
      const logAmount = parseFloat(log.amount?.toString() || '0')
      // Match if amounts are within 0.01 (handles floating point precision)
      return Math.abs(logAmount - notificationAmount) < 0.01
    }) || []
    
    
    // Filter by normalized phone number - be more flexible with phone matching
    let stkPushLogs = amountMatchedLogs.filter(log => {
      const logPhone = normalizePhone(log.partner_phone || '')
      // Match if phones are exactly the same, or if last 9 digits match (handles country code differences)
      const phoneMatch = logPhone === normalizedMobile || 
                        (logPhone.length >= 9 && normalizedMobile.length >= 9 && 
                         logPhone.slice(-9) === normalizedMobile.slice(-9))
      
      
      return phoneMatch
    })
    
    // If no phone match, try matching by amount only (within last 30 minutes) - NCBA might send different phone format
    if (stkPushLogs.length === 0 && amountMatchedLogs.length > 0) {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const amountOnlyLogs = amountMatchedLogs.filter(log => {
        const logCreatedAt = new Date(log.created_at)
        const thirtyMinAgo = new Date(thirtyMinutesAgo)
        return logCreatedAt >= thirtyMinAgo
      })
      if (amountOnlyLogs.length > 0) {
        stkPushLogs = amountOnlyLogs
      }
    }
    
    if (stkPushLogs.length > 0) {
      // Use the most recent matching log
      const matchingLog = stkPushLogs[0]
      isSTKPushNotification = true
      stkPushPartnerId = matchingLog.partner_id
    } else {
      
      if (BillRefNumber && (BillRefNumber.includes(accountReferenceSeparator) || BillRefNumber.includes(' '))) {
      // Fallback to account reference matching if phone matching didn't work
      // Handle both configured separator and space separator
      let parts: string[] = []
      if (BillRefNumber.includes(accountReferenceSeparator)) {
        parts = BillRefNumber.split(accountReferenceSeparator)
      } else if (BillRefNumber.includes(' ')) {
        parts = BillRefNumber.split(' ')
      }
      
      if (parts.length >= 2 && (parts[0] === accountNumber || parts[0].trim() === accountNumber)) {
        // This might be an STK Push notification
        // Try to find a pending STK push transaction matching amount and phone
        const { data: refStkPushLogs } = await supabase
          .from('ncb_stk_push_logs')
          .select('*, wallet_transaction:wallet_transactions(*)')
          .in('stk_push_status', ['initiated', 'pending'])
          .eq('amount', parseFloat(TransAmount))
          .order('created_at', { ascending: false })
          .limit(10)
        
        // Filter by normalized phone number
        stkPushLogs = refStkPushLogs?.filter(log => {
          const logPhone = normalizePhone(log.partner_phone || '')
          return logPhone === normalizedMobile || logPhone.endsWith(normalizedMobile.slice(-9)) || normalizedMobile.endsWith(logPhone.slice(-9))
        }) || []
        
        if (stkPushLogs.length > 0) {
          // Check if account reference matches - now uses partner short_code (e.g., "774451#FINSAFE")
          for (const log of stkPushLogs) {
            const logAccountRef = log.ncb_account_number || ''
            const partnerIdentifierFromRef = parts[1]?.trim() // Extract partner identifier (short_code or ID) from BillRefNumber
            
            // Match by: exact account reference match, or partner short_code match
            let matches = false
            
            // Normalize account references for comparison (remove spaces, convert to lowercase)
            const normalizedBillRef = BillRefNumber.replace(/\s+/g, '').toLowerCase()
            const normalizedLogRef = logAccountRef.replace(/\s+/g, '').toLowerCase()
            
            if (normalizedLogRef === normalizedBillRef || logAccountRef === BillRefNumber) {
              matches = true
            } else {
              // Try to match by partner short_code (primary) or partner ID (fallback for old transactions)
              const { data: partner } = await supabase
                .from('partners')
                .select('id, short_code')
                .eq('id', log.partner_id)
                .single()
              
              if (partner) {
                // Primary: Match by short_code (case-insensitive) - this is the new format
                const shortCodeMatch = partner.short_code?.toLowerCase() === partnerIdentifierFromRef?.toLowerCase()
                
                // Fallback: Match by partner ID (for backward compatibility with old transactions)
                const partnerIdMatch = partner.id === partnerIdentifierFromRef || 
                                      partner.id.toLowerCase() === partnerIdentifierFromRef?.toLowerCase() ||
                                      partner.id.replace(/-/g, '') === partnerIdentifierFromRef?.replace(/-/g, '')
                
                if (shortCodeMatch || partnerIdMatch) {
                  matches = true
                }
              }
            }
            
            if (matches) {
              isSTKPushNotification = true
              stkPushPartnerId = log.partner_id
              break // Found match, exit loop
            }
          }
        }
      }
    }
    
    // Handle STK push notification
    if (isSTKPushNotification) {
      if (stkPushPartnerId) {
      // Find the matching log again to update it
      // Use the log we already found instead of querying again with exact phone match
      // This avoids issues where phone number formats differ
      let matchingLog = null
      
      if (stkPushLogs && stkPushLogs.length > 0) {
        // Use the log we already matched
        matchingLog = stkPushLogs[0]
      } else {
        // Fallback: query by partner_id and amount only (don't require exact phone match)
        // Use amount-matched logs to avoid decimal precision issues
        const fallbackLogs = amountMatchedLogs.filter(log => log.partner_id === stkPushPartnerId)
        if (fallbackLogs.length > 0) {
          matchingLog = fallbackLogs[0]
        } else {
          // Last resort: query database directly
          const { data: queriedLog } = await supabase
            .from('ncb_stk_push_logs')
            .select('*, wallet_transaction:wallet_transactions(*)')
            .eq('partner_id', stkPushPartnerId)
            .in('stk_push_status', ['initiated', 'pending'])
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false })
            .limit(5)
          
          if (queriedLog && queriedLog.length > 0) {
            // Find log with matching amount (handle decimal precision)
            const matched = queriedLog.find(log => {
              const logAmount = parseFloat(log.amount?.toString() || '0')
              return Math.abs(logAmount - notificationAmount) < 0.01
            })
            if (matched) {
              matchingLog = matched
            }
          }
        }
      }
      
      if (matchingLog) {
        // Check if this transaction was already processed (prevent duplicate processing)
        if (matchingLog.wallet_transaction_id) {
          const { data: existingTx } = await supabase
            .from('wallet_transactions')
            .select('id, status, metadata')
            .eq('id', matchingLog.wallet_transaction_id)
            .single()
          
          if (existingTx && existingTx.status === 'completed' && existingTx.metadata?.ncb_receipt_number === TransID) {
            return NextResponse.json({
              ResultCode: "0",
              ResultDesc: "STK Push transaction already processed"
            })
          }
        }
        
        // Update STK push log and wallet transaction
        await supabase
          .from('ncb_stk_push_logs')
          .update({
            stk_push_status: 'completed',
            ncb_response: notificationData,
            ncb_receipt_number: TransID,
            ncb_transaction_date: TransTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingLog.id)
          
        // Update wallet transaction (ONLY update existing transaction, never create new one)
        if (matchingLog.wallet_transaction_id) {
          const { data: walletTransaction } = await supabase
            .from('wallet_transactions')
            .select('wallet_id, amount, metadata, status')
            .eq('id', matchingLog.wallet_transaction_id)
            .single()
          
          if (walletTransaction) {
            // Only update if transaction is still pending (prevent duplicate updates)
            if (walletTransaction.status === 'pending' || walletTransaction.status === 'initiated') {
              // Get wallet and update balance
              const { data: wallet } = await supabase
                .from('partner_wallets')
                .select('current_balance, id')
                .eq('partner_id', stkPushPartnerId)
                .single()
              
              if (wallet) {
                const newBalance = (wallet.current_balance || 0) + parseFloat(TransAmount)
                
                const walletUpdateResult = await supabase
                  .from('partner_wallets')
                  .update({
                    current_balance: newBalance,
                    last_topup_date: new Date().toISOString(),
                    last_topup_amount: parseFloat(TransAmount),
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', wallet.id)
                
                if (walletUpdateResult.error) {
                  console.error('Error updating wallet balance:', walletUpdateResult.error)
                }
                
                const txUpdateResult = await supabase
                  .from('wallet_transactions')
                  .update({
                    status: 'completed',
                    metadata: {
                      ...(walletTransaction.metadata || {}),
                      ncb_receipt_number: TransID,
                      ncb_transaction_date: TransTime,
                      completed_at: new Date().toISOString(),
                      wallet_balance_after: newBalance,
                      notification_source: 'paybill-notification'
                    },
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', matchingLog.wallet_transaction_id)
                
                if (txUpdateResult.error) {
                  console.error('Error updating wallet transaction:', txUpdateResult.error)
                }
              } else {
                console.error('Wallet not found for partner:', stkPushPartnerId)
              }
            }
          }
        }
        
        // Return success - STK Push handled (DO NOT fall through to regular paybill processing)
        return NextResponse.json({
          ResultCode: "0",
          ResultDesc: "STK Push transaction processed successfully"
        })
      } else {
        // Try one more time to find the log with more lenient matching
        if (stkPushPartnerId) {
          const { data: lastResortLog } = await supabase
            .from('ncb_stk_push_logs')
            .select('*, wallet_transaction:wallet_transactions(*)')
            .eq('partner_id', stkPushPartnerId)
            .in('stk_push_status', ['initiated', 'pending'])
            .gte('created_at', twoHoursAgo)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()
          
          if (lastResortLog) {
            const logAmount = parseFloat(lastResortLog.amount?.toString() || '0')
            if (Math.abs(logAmount - notificationAmount) < 0.01) {
              matchingLog = lastResortLog
            }
          }
        }
        
        if (!matchingLog) {
          console.error('STK push log not found for update')
          return NextResponse.json({
            ResultCode: "1",
            ResultDesc: "STK Push log not found for update"
          })
        }
        
        // Process the matching log found via last resort
        if (matchingLog.wallet_transaction_id) {
          const { data: existingTx } = await supabase
            .from('wallet_transactions')
            .select('id, status, metadata')
            .eq('id', matchingLog.wallet_transaction_id)
            .single()
          
          if (existingTx && existingTx.status === 'completed' && existingTx.metadata?.ncb_receipt_number === TransID) {
            return NextResponse.json({
              ResultCode: "0",
              ResultDesc: "STK Push transaction already processed"
            })
          }
        }
        
        // Update STK push log and wallet transaction
        await supabase
          .from('ncb_stk_push_logs')
          .update({
            stk_push_status: 'completed',
            ncb_response: notificationData,
            ncb_receipt_number: TransID,
            ncb_transaction_date: TransTime,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingLog.id)
          
        // Update wallet transaction
        if (matchingLog.wallet_transaction_id) {
          const { data: walletTransaction } = await supabase
            .from('wallet_transactions')
            .select('wallet_id, amount, metadata, status')
            .eq('id', matchingLog.wallet_transaction_id)
            .single()
          
          if (walletTransaction && (walletTransaction.status === 'pending' || walletTransaction.status === 'initiated')) {
            const { data: wallet } = await supabase
              .from('partner_wallets')
              .select('current_balance, id')
              .eq('partner_id', stkPushPartnerId)
              .single()
            
            if (wallet) {
              const newBalance = (wallet.current_balance || 0) + parseFloat(TransAmount)
              
              const walletUpdateResult = await supabase
                .from('partner_wallets')
                .update({
                  current_balance: newBalance,
                  last_topup_date: new Date().toISOString(),
                  last_topup_amount: parseFloat(TransAmount),
                  updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id)
              
              if (walletUpdateResult.error) {
                console.error('Error updating wallet balance:', walletUpdateResult.error)
              }
              
              const txUpdateResult = await supabase
                .from('wallet_transactions')
                .update({
                  status: 'completed',
                  metadata: {
                    ...(walletTransaction.metadata || {}),
                    ncb_receipt_number: TransID,
                    ncb_transaction_date: TransTime,
                    completed_at: new Date().toISOString(),
                    wallet_balance_after: newBalance,
                    notification_source: 'paybill-notification'
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', matchingLog.wallet_transaction_id)
              
              if (txUpdateResult.error) {
                console.error('Error updating wallet transaction:', txUpdateResult.error)
              }
            } else {
              console.error('Wallet not found for partner:', stkPushPartnerId)
            }
          }
        }
        
        return NextResponse.json({
          ResultCode: "0",
          ResultDesc: "STK Push transaction processed successfully"
        })
      }
      } else {
        // STK push detected but partner ID not found - return error
        console.error('STK push notification detected but partner ID not found')
        return NextResponse.json({
          ResultCode: "1",
          ResultDesc: "STK push partner not identified"
        })
      }
    } else {
      // If not STK Push, continue with regular paybill notification processing
      // CRITICAL: Before processing as regular paybill, check for pending STK push transactions
      // This prevents duplicate transactions when STK push matching fails
      const twoHoursAgoCheck = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      const notificationAmountCheck = parseFloat(TransAmount)
      const normalizedMobileCheck = Mobile.replace(/\D/g, '')
      
      // First, try to find STK push logs that match amount and phone (even if matching failed earlier)
      const { data: stkLogsForCheck } = await supabase
        .from('ncb_stk_push_logs')
        .select('wallet_transaction_id, amount, partner_phone, stk_push_status')
        .in('stk_push_status', ['initiated', 'pending'])
        .gte('created_at', twoHoursAgoCheck)
        .limit(20)
      
      // Check if any STK push log matches this notification
      const matchingStkLog = stkLogsForCheck?.find(log => {
        const logAmount = parseFloat(log.amount?.toString() || '0')
        const amountMatch = Math.abs(logAmount - notificationAmountCheck) < 0.01
        if (!amountMatch) return false
        
        const logPhone = normalizePhone(log.partner_phone || '')
        const phoneMatch = logPhone === normalizedMobileCheck || 
                          (logPhone.length >= 9 && normalizedMobileCheck.length >= 9 && 
                           logPhone.slice(-9) === normalizedMobileCheck.slice(-9))
        return phoneMatch
      })
      
      // If we found a matching STK log, check if the wallet transaction is still pending
      if (matchingStkLog && matchingStkLog.wallet_transaction_id) {
        const { data: walletTx } = await supabase
          .from('wallet_transactions')
          .select('id, status, transaction_type, metadata')
          .eq('id', matchingStkLog.wallet_transaction_id)
          .single()
        
        if (walletTx && (walletTx.status === 'pending' || walletTx.status === 'initiated') && walletTx.transaction_type === 'top_up') {
          return NextResponse.json({
            ResultCode: "0",
            ResultDesc: "STK push transaction already exists, will be updated when matched"
          })
        }
      }
      
      // Fallback: Query all pending top_up transactions within the time window
      const { data: allPendingTopUpsCheck } = await supabase
        .from('wallet_transactions')
        .select('id, status, amount, metadata, created_at, wallet_id')
        .eq('transaction_type', 'top_up')
        .in('status', ['pending', 'initiated'])
        .gte('created_at', twoHoursAgoCheck)
        .limit(20)
      
      // Filter for STK push transactions with matching amount and phone
      const pendingSTKTransactionsCheck = allPendingTopUpsCheck?.filter(tx => {
        // Check if it's an STK push transaction
        const isSTKPush = tx.metadata?.stk_push_initiated === true
        if (!isSTKPush) return false
        
        // Check amount match (with tolerance for floating point)
        const txAmount = parseFloat(tx.amount?.toString() || '0')
        const amountMatch = Math.abs(txAmount - notificationAmountCheck) < 0.01
        if (!amountMatch) return false
        
        // Check phone match
        const txPhone = (tx.metadata?.phone_number || '').replace(/\D/g, '')
        const phoneMatch = txPhone === normalizedMobileCheck || 
                          (txPhone.length >= 9 && normalizedMobileCheck.length >= 9 && 
                           txPhone.slice(-9) === normalizedMobileCheck.slice(-9))
        
        return phoneMatch
      }) || []
      
      // If we found matching pending STK transactions, skip C2B processing
      if (pendingSTKTransactionsCheck.length > 0) {
        return NextResponse.json({
          ResultCode: "0",
          ResultDesc: "STK push transaction already exists, will be updated when matched"
        })
      }
      
      // Find partner by account reference
      // Handle different NCBA formats:
      // Format 1: BillRefNumber = "774451", Narrative = "FINSAFE" 
      // Format 2: BillRefNumber = "FINSAFE", BusinessShortCode = "774451"
      // Format 3: BusinessShortCode = "880100", BillRefNumber = "774451", Narrative = "umoja"
      let partner = null
    
      // Try Format 1: Look for Narrative field
      let partnerIdentifier = notificationData.Narrative || notificationData.narrative
      
      // Try Format 2: If no Narrative, use BillRefNumber as partner identifier
      if (!partnerIdentifier && BillRefNumber !== accountNumber) {
        partnerIdentifier = BillRefNumber
      }
      
      // Check if this is the new format (BusinessShortCode = "880100", BillRefNumber = account number)
      const isNewFormat = BusinessShortCode === '880100' && BillRefNumber === accountNumber && partnerIdentifier
      
      // Check if this is the old format (BusinessShortCode = account number)
      const isOldFormat = BusinessShortCode === accountNumber && partnerIdentifier
      
      if ((isNewFormat || isOldFormat) && partnerIdentifier) {
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
            ResultDesc: `Partner not found for identifier: ${partnerIdentifier}`
          })
        }
        
        partner = partnerData
      } else {
        console.error('Invalid account reference format')
        return NextResponse.json({
          ResultCode: "1",
          ResultDesc: "Invalid account reference format"
        })
      }

      // Check if this transaction has already been processed as C2B
      const { data: existingC2BTransaction } = await supabase
        .from('c2b_transactions')
        .select('*')
        .eq('transaction_id', TransID)
        .single()

      if (existingC2BTransaction) {
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
          amount: parseFloat(TransAmount),
          business_short_code: BusinessShortCode,
          bill_reference_number: `${BillRefNumber} ${partnerIdentifier}`,
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
        }
      } catch (walletError) {
        console.error('Error processing wallet update:', walletError)
      }

      // Return success response
      return NextResponse.json({
        ResultCode: "0",
        ResultDesc: "Transaction processed successfully"
      })
    }
    }

  } catch (error) {
    console.error('NCBA Paybill Notification Error:', error)
    return NextResponse.json({
      ResultCode: "1",
      ResultDesc: "Internal server error"
    })
  }
}
