import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Manual verification endpoint to check STK Push status with NCBA
 * This can be used if the callback doesn't arrive
 */
export async function POST(request: NextRequest) {
  try {
    // Authentication
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid session' },
        { status: 401 }
      )
    }

    const { wallet_transaction_id } = await request.json()

    if (!wallet_transaction_id) {
      return NextResponse.json(
        { success: false, error: 'wallet_transaction_id is required' },
        { status: 400 }
      )
    }

    // Get the wallet transaction
    const { data: walletTransaction, error: txError } = await supabase
      .from('wallet_transactions')
      .select('*, wallet:partner_wallets(partner_id)')
      .eq('id', wallet_transaction_id)
      .single()

    if (txError || !walletTransaction) {
      return NextResponse.json(
        { success: false, error: 'Wallet transaction not found' },
        { status: 404 }
      )
    }

    // Get the STK Push log
    const { data: stkPushLog, error: logError } = await supabase
      .from('ncb_stk_push_logs')
      .select('*')
      .eq('wallet_transaction_id', wallet_transaction_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (logError || !stkPushLog) {
      return NextResponse.json(
        { success: false, error: 'STK Push log not found for this transaction' },
        { status: 404 }
      )
    }

    console.log('Manual STK Push verification requested:', {
      wallet_transaction_id,
      stk_push_transaction_id: stkPushLog.stk_push_transaction_id,
      current_status: stkPushLog.stk_push_status,
      callback_received: !!stkPushLog.ncb_response
    })

    // Check if callback was already received
    if (stkPushLog.ncb_response) {
      const callbackData = stkPushLog.ncb_response as any
      
      // If callback was received but transaction wasn't updated, process it now
      if (walletTransaction.status !== 'completed') {
        console.log('Callback was received but transaction not updated. Processing now...')
        
        // Extract receipt number and transaction date from callback
        const receiptNumber = callbackData.TransID || callbackData.transactionId || callbackData.ReceiptNumber || callbackData.receipt_number
        const transactionDate = callbackData.TransTime || callbackData.transactionDate || callbackData.transaction_date
        
        // Check if this indicates success
        const resultCode = callbackData.ResultCode || callbackData.resultCode || callbackData.StatusCode || callbackData.statusCode
        const isSuccess = resultCode === 0 || resultCode === "0" || 
                        callbackData.status === 'SUCCESS' || 
                        callbackData.success === true ||
                        (callbackData.description && callbackData.description.toLowerCase().includes('successfully'))
        
        if (isSuccess) {
          // Get wallet using wallet_id from transaction
          const { data: partnerWallet } = await supabase
            .from('partner_wallets')
            .select('current_balance, id, partner_id')
            .eq('id', walletTransaction.wallet_id)
            .single()
          
          if (partnerWallet) {
            const newBalance = (partnerWallet.current_balance || 0) + parseFloat(walletTransaction.amount.toString())
            
            // Update wallet balance
            const walletUpdateResult = await supabase
              .from('partner_wallets')
              .update({
                current_balance: newBalance,
                last_topup_date: new Date().toISOString(),
                last_topup_amount: parseFloat(walletTransaction.amount.toString()),
                updated_at: new Date().toISOString()
              })
              .eq('id', partnerWallet.id)
            
            if (walletUpdateResult.error) {
              console.error('❌ Error updating wallet balance:', walletUpdateResult.error)
            }
            
            // Update transaction status
            const txUpdateResult = await supabase
              .from('wallet_transactions')
              .update({
                status: 'completed',
                metadata: {
                  ...(walletTransaction.metadata || {}),
                  ncb_receipt_number: receiptNumber,
                  ncb_transaction_date: transactionDate,
                  completed_at: new Date().toISOString(),
                  wallet_balance_after: newBalance,
                  notification_source: 'manual-verification-from-callback'
                },
                updated_at: new Date().toISOString()
              })
              .eq('id', wallet_transaction_id)
            
            if (txUpdateResult.error) {
              console.error('❌ Error updating wallet transaction:', txUpdateResult.error)
            } else {
              console.log(`✅ Transaction updated from existing callback: ${wallet_transaction_id}, New balance: ${newBalance}`)
            }
            
            return NextResponse.json({
              success: true,
              message: 'Transaction updated successfully from existing callback',
              data: {
                wallet_transaction_id,
                new_balance: newBalance,
                receipt_number: receiptNumber
              }
            })
          } else {
            console.error('❌ Wallet not found for wallet_id:', walletTransaction.wallet_id)
          }
        } else {
          console.log('⚠️ Callback indicates transaction was not successful:', callbackData)
        }
      }
      
      // If already processed, just return the data
      return NextResponse.json({
        success: true,
        message: 'Callback was already received and processed',
        data: {
          stk_push_log: stkPushLog,
          callback_data: callbackData,
          wallet_transaction: walletTransaction
        }
      })
    }

    // If no callback received, query NCBA API for status
    // Get NCBA credentials from system settings
    const { data: ncbaSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, is_encrypted')
      .in('setting_key', [
        'ncba_notification_username',
        'ncba_notification_password'
      ])

    if (settingsError || !ncbaSettings || ncbaSettings.length === 0) {
      return NextResponse.json(
        { success: false, error: 'NCBA credentials not configured' },
        { status: 500 }
      )
    }

    // Decrypt credentials
    const settings: Record<string, string> = {}
    for (const setting of ncbaSettings) {
      let value = setting.setting_value
      if (setting.is_encrypted && value) {
        try {
          const crypto = await import('crypto')
          const passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase'
          const key = crypto.scryptSync(passphrase, 'salt', 32)
          const iv = Buffer.from(value.slice(0, 32), 'hex')
          const encrypted = value.slice(32)
          const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
          let decrypted = decipher.update(encrypted, 'hex', 'utf8')
          decrypted += decipher.final('utf8')
          value = decrypted
        } catch (error) {
          console.error('Error decrypting setting:', error)
        }
      }
      settings[setting.setting_key] = value
    }

    // Get NCBA access token
    const basicHeader = `Basic ${Buffer.from(`${settings.ncba_notification_username}:${settings.ncba_notification_password}`).toString('base64')}`
    
    const authResponse = await fetch('https://c2bapis.ncbagroup.com/payments/api/v1/auth/token', {
      method: 'GET',
      headers: {
        'Authorization': basicHeader
      }
    })

    if (!authResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to authenticate with NCBA' },
        { status: 500 }
      )
    }

    const authData = await authResponse.json()
    const access_token = authData.access_token

    if (!access_token) {
      return NextResponse.json(
        { success: false, error: 'NCBA authentication failed: No access token' },
        { status: 500 }
      )
    }

    // Query STK Push status from NCBA
    const queryResponse = await fetch('https://c2bapis.ncbagroup.com/payments/api/v1/stk-push/query', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        TransactionID: stkPushLog.stk_push_transaction_id
      })
    })

    const queryData = await queryResponse.json()

    console.log('NCBA STK Push Query Response:', JSON.stringify(queryData, null, 2))

    // Check if transaction was successful - NCBA uses different formats
    // Format 1: StatusCode === "0" or 0 (Safaricom-style)
    // Format 2: status === 'SUCCESS' (NCBA-style)
    // Format 3: success === true
    const isSuccess = queryResponse.ok && (
      queryData.StatusCode === "0" || 
      queryData.StatusCode === 0 ||
      queryData.status === 'SUCCESS' ||
      queryData.status === 'success' ||
      queryData.success === true ||
      (queryData.description && queryData.description.toLowerCase().includes('successfully'))
    )

    console.log('Transaction success check:', { isSuccess, queryData })

    // If successful, process the response as if it were a callback
    if (isSuccess) {
      // Update STK Push log
      await supabase
        .from('ncb_stk_push_logs')
        .update({
          stk_push_status: 'completed',
          ncb_response: queryData, // Use ncb_response column (not ncb_callback_response)
          ncb_receipt_number: queryData.ReceiptNumber || queryData.receipt_number,
          ncb_transaction_date: queryData.TransactionDate || queryData.transaction_date,
          updated_at: new Date().toISOString()
        })
        .eq('id', stkPushLog.id)

      // Get partner_id from STK push log (more reliable)
      const partnerId = stkPushLog.partner_id

      if (partnerId) {
        const { data: currentWallet } = await supabase
          .from('partner_wallets')
          .select('current_balance, id')
          .eq('partner_id', partnerId)
          .single()

        if (currentWallet) {
          const newBalance = (currentWallet.current_balance || 0) + stkPushLog.amount

          await supabase
            .from('partner_wallets')
            .update({
              current_balance: newBalance,
              last_topup_date: new Date().toISOString(),
              last_topup_amount: stkPushLog.amount,
              updated_at: new Date().toISOString()
            })
            .eq('id', currentWallet.id)

          // Update wallet transaction
          await supabase
            .from('wallet_transactions')
            .update({
              status: 'completed',
              metadata: {
                ...(walletTransaction.metadata || {}),
                ncb_receipt_number: queryData.ReceiptNumber || queryData.receipt_number,
                ncb_transaction_date: queryData.TransactionDate || queryData.transaction_date,
                completed_at: new Date().toISOString(),
                wallet_balance_after: newBalance,
                manually_verified: true
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', wallet_transaction_id)

          return NextResponse.json({
            success: true,
            message: 'STK Push verified and wallet updated successfully',
            data: {
              query_response: queryData,
              old_balance: currentWallet.current_balance,
              new_balance: newBalance,
              wallet_transaction_id
            }
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'STK Push status queried from NCBA',
      data: {
        query_response: queryData,
        stk_push_log: stkPushLog,
        note: queryData.StatusCode !== "0" && queryData.StatusCode !== 0 
          ? 'Transaction may still be pending or failed. Check NCBA response for details.'
          : 'Transaction verified successfully'
      }
    })

  } catch (error) {
    console.error('STK Push Verification Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

