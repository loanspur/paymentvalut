import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const requestStartTime = new Date().toISOString()
  console.log(`[${requestStartTime}] ===== NCBA STK PUSH CALLBACK ENDPOINT HIT =====`)
  
  try {
    // Log request headers for debugging
    const headers: Record<string, string> = {}
    request.headers.forEach((value, key) => {
      headers[key] = value
    })
    console.log(`[${requestStartTime}] Request headers:`, JSON.stringify(headers, null, 2))
    
    const callbackData = await request.json()
    
    console.log(`[${requestStartTime}] NCBA STK Push Callback received:`, JSON.stringify(callbackData, null, 2))

    // Extract callback data - NCBA might use different formats
    // Try multiple possible structures
    let transactionId: string | null = null
    let resultCode: number | null = null
    let resultDesc: string | null = null
    let callbackMetadata: any = null

    // Format 1: Safaricom-style (Body.stkCallback.CheckoutRequestID)
    if (callbackData.Body?.stkCallback?.CheckoutRequestID) {
      transactionId = callbackData.Body.stkCallback.CheckoutRequestID
      resultCode = callbackData.Body.stkCallback.ResultCode
      resultDesc = callbackData.Body.stkCallback.ResultDesc
      callbackMetadata = callbackData.Body.stkCallback.CallbackMetadata
    }
    // Format 2: Direct TransactionID
    else if (callbackData.TransactionID) {
      transactionId = callbackData.TransactionID
      resultCode = callbackData.ResultCode
      resultDesc = callbackData.ResultDesc
      callbackMetadata = callbackData.CallbackMetadata
    }
    // Format 3: CheckoutRequestID at root
    else if (callbackData.CheckoutRequestID) {
      transactionId = callbackData.CheckoutRequestID
      resultCode = callbackData.ResultCode
      resultDesc = callbackData.ResultDesc
      callbackMetadata = callbackData.CallbackMetadata
    }
    // Format 4: NCBA-specific format
    else if (callbackData.data?.TransactionID || callbackData.data?.CheckoutRequestID) {
      transactionId = callbackData.data.TransactionID || callbackData.data.CheckoutRequestID
      resultCode = callbackData.data.ResultCode || callbackData.data.StatusCode
      resultDesc = callbackData.data.ResultDesc || callbackData.data.StatusDescription
      callbackMetadata = callbackData.data.CallbackMetadata || callbackData.data.Metadata
    }

    if (!transactionId) {
      console.error('No transaction ID found in callback. Full callback data:', JSON.stringify(callbackData, null, 2))
      return NextResponse.json({ success: false, error: 'Invalid callback data: No transaction ID found' }, { status: 400 })
    }

    console.log('Extracted callback data:', { transactionId, resultCode, resultDesc })

    // Find the STK Push log record - try matching by stk_push_transaction_id
    let { data: stkPushLog, error: stkPushError } = await supabase
      .from('ncb_stk_push_logs')
      .select('*, wallet_transaction:wallet_transactions(*)')
      .eq('stk_push_transaction_id', transactionId)
      .single()

    // If not found, try searching by ncb_reference_id or other fields
    if (stkPushError || !stkPushLog) {
      console.log('Not found by stk_push_transaction_id, trying alternative search...')
      // Try to find by any matching transaction ID in the response
      const { data: allLogs } = await supabase
        .from('ncb_stk_push_logs')
        .select('*, wallet_transaction:wallet_transactions(*)')
        .eq('stk_push_status', 'initiated')
        .order('created_at', { ascending: false })
        .limit(10)

      // Try to match by checking the ncb_response JSONB field
      if (allLogs) {
        for (const log of allLogs) {
          const ncbResponse = log.ncb_response as any
          if (ncbResponse?.TransactionID === transactionId || 
              ncbResponse?.CheckoutRequestID === transactionId ||
              log.ncb_reference_id === transactionId) {
            stkPushLog = log
            stkPushError = null
            console.log('Found STK Push log by alternative search:', log.id)
            break
          }
        }
      }
    }

    if (stkPushError || !stkPushLog) {
      console.error('STK Push log not found for transaction ID:', transactionId)
      console.error('Search error:', stkPushError)
      return NextResponse.json({ success: false, error: `STK Push log not found for transaction ID: ${transactionId}` }, { status: 404 })
    }

    console.log('Found STK Push log:', stkPushLog.id, 'Wallet transaction:', stkPushLog.wallet_transaction_id)

    // Update STK Push log with callback data
    const updateData: any = {
      stk_push_status: resultCode === 0 ? 'completed' : 'failed',
      ncb_response: callbackData, // Use ncb_response column (not ncb_callback_response)
      updated_at: new Date().toISOString()
    }

    // If successful, extract transaction details
    if (resultCode === 0 && callbackMetadata) {
      let receiptNumber: string | null = null
      let transactionDate: string | null = null
      let phoneNumber: string | null = null

      // Try different metadata formats
      if (callbackMetadata.Item && Array.isArray(callbackMetadata.Item)) {
        // Safaricom format
        const items = callbackMetadata.Item
        receiptNumber = items.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
        transactionDate = items.find((item: any) => item.Name === 'TransactionDate')?.Value
        phoneNumber = items.find((item: any) => item.Name === 'PhoneNumber')?.Value
      } else if (callbackMetadata.MpesaReceiptNumber) {
        // Direct format
        receiptNumber = callbackMetadata.MpesaReceiptNumber
        transactionDate = callbackMetadata.TransactionDate
        phoneNumber = callbackMetadata.PhoneNumber
      } else if (typeof callbackMetadata === 'object') {
        // Try to find any receipt-like fields
        receiptNumber = callbackMetadata.receipt_number || callbackMetadata.ReceiptNumber || callbackMetadata.MpesaReceiptNumber
        transactionDate = callbackMetadata.transaction_date || callbackMetadata.TransactionDate
        phoneNumber = callbackMetadata.phone_number || callbackMetadata.PhoneNumber
      }

      if (receiptNumber) updateData.ncb_receipt_number = receiptNumber
      if (transactionDate) updateData.ncb_transaction_date = transactionDate
      if (phoneNumber) updateData.ncb_phone_number = phoneNumber
    }

    // Update STK Push log
    const { error: updateError } = await supabase
      .from('ncb_stk_push_logs')
      .update(updateData)
      .eq('id', stkPushLog.id)

    if (updateError) {
      console.error('Error updating STK Push log:', updateError)
    } else {
      console.log('STK Push log updated successfully:', stkPushLog.id)
    }

    // If transaction was successful, update wallet transaction and balance
    if (resultCode === 0) {
      console.log('Processing successful STK Push callback for wallet transaction:', stkPushLog.wallet_transaction_id)
      // Get the wallet transaction to get wallet_id
      const { data: walletTransaction, error: txFetchError } = await supabase
        .from('wallet_transactions')
        .select('wallet_id, amount, metadata')
        .eq('id', stkPushLog.wallet_transaction_id)
        .single()

      if (txFetchError || !walletTransaction) {
        console.error('Error fetching wallet transaction:', txFetchError)
        return NextResponse.json({ success: false, error: 'Wallet transaction not found' }, { status: 404 })
      }

      // Get current wallet balance
      const { data: wallet, error: walletError } = await supabase
        .from('partner_wallets')
        .select('current_balance, id')
        .eq('partner_id', stkPushLog.partner_id)
        .single()

      if (walletError || !wallet) {
        console.error('Error fetching wallet:', walletError)
        return NextResponse.json({ success: false, error: 'Wallet not found' }, { status: 404 })
      }

      // Calculate new balance
      const newBalance = (wallet.current_balance || 0) + stkPushLog.amount

      // Update wallet balance and transaction atomically
      const { error: walletUpdateError } = await supabase
        .from('partner_wallets')
        .update({
          current_balance: newBalance,
          last_topup_date: new Date().toISOString(),
          last_topup_amount: stkPushLog.amount,
          updated_at: new Date().toISOString()
        })
        .eq('id', wallet.id)

      if (walletUpdateError) {
        console.error('Error updating wallet balance:', walletUpdateError)
        return NextResponse.json({ success: false, error: 'Failed to update wallet balance' }, { status: 500 })
      }

      // Update wallet transaction status with balance info
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          metadata: {
            ...(walletTransaction.metadata || {}),
            ncb_receipt_number: updateData.ncb_receipt_number,
            ncb_transaction_date: updateData.ncb_transaction_date,
            completed_at: new Date().toISOString(),
            wallet_balance_after: newBalance
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', stkPushLog.wallet_transaction_id)

      if (transactionError) {
        console.error('Error updating wallet transaction:', transactionError)
        // Balance was updated, but transaction update failed - log but don't fail
      }
    } else {
      // Transaction failed, update wallet transaction status
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          metadata: {
            ...(stkPushLog.wallet_transaction as any)?.metadata,
            failure_reason: resultDesc,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', stkPushLog.wallet_transaction_id)

      if (transactionError) {
        console.error('Error updating failed wallet transaction:', transactionError)
      }
    }

    console.log(`[${requestStartTime}] Callback processed successfully`)
    return NextResponse.json({ success: true, message: 'Callback processed successfully' })

  } catch (error) {
    console.error(`[${requestStartTime}] STK Callback Error:`, error)
    console.error(`[${requestStartTime}] Error details:`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    console.log(`[${requestStartTime}] ===== NCBA STK PUSH CALLBACK ENDPOINT COMPLETED =====`)
  }
}