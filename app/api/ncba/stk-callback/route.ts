import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import UnifiedWalletService from '@/lib/unified-wallet-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const callbackData = await request.json()
    
    console.log('NCBA STK Push Callback received:', callbackData)

    // Extract callback data
    const {
      Body: {
        stkCallback: {
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata
        } = {}
      } = {}
    } = callbackData

    if (!CheckoutRequestID) {
      console.error('No CheckoutRequestID in callback')
      return NextResponse.json({ success: false, error: 'Invalid callback data' }, { status: 400 })
    }

    // Find the STK Push log record
    const { data: stkPushLog, error: stkPushError } = await supabase
      .from('ncb_stk_push_logs')
      .select('*')
      .eq('stk_push_transaction_id', CheckoutRequestID)
      .single()

    if (stkPushError || !stkPushLog) {
      console.error('STK Push log not found:', CheckoutRequestID)
      return NextResponse.json({ success: false, error: 'STK Push log not found' }, { status: 404 })
    }

    // Update STK Push log with callback data
    const updateData: any = {
      stk_push_status: ResultCode === 0 ? 'completed' : 'failed',
      ncb_callback_response: callbackData,
      updated_at: new Date().toISOString()
    }

    // If successful, extract transaction details
    if (ResultCode === 0 && CallbackMetadata?.Item) {
      const items = CallbackMetadata.Item
      const receiptNumber = items.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const transactionDate = items.find((item: any) => item.Name === 'TransactionDate')?.Value
      const phoneNumber = items.find((item: any) => item.Name === 'PhoneNumber')?.Value

      updateData.ncb_receipt_number = receiptNumber
      updateData.ncb_transaction_date = transactionDate
      updateData.ncb_phone_number = phoneNumber
    }

    // Update STK Push log
    const { error: updateError } = await supabase
      .from('ncb_stk_push_logs')
      .update(updateData)
      .eq('stk_push_transaction_id', CheckoutRequestID)

    if (updateError) {
      console.error('Error updating STK Push log:', updateError)
    }

    // If transaction was successful, update wallet transaction and balance
    if (ResultCode === 0) {
      // Update wallet transaction status
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          metadata: {
            ...stkPushLog.wallet_transaction?.metadata,
            ncb_receipt_number: updateData.ncb_receipt_number,
            ncb_transaction_date: updateData.ncb_transaction_date,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', stkPushLog.wallet_transaction_id)

      if (transactionError) {
        console.error('Error updating wallet transaction:', transactionError)
      } else {
        // Update wallet balance using unified service
        const balanceResult = await UnifiedWalletService.updateWalletBalance(
          stkPushLog.partner_id,
          stkPushLog.amount,
          'top_up',
          {
            reference: updateData.ncb_receipt_number,
            ncb_receipt_number: updateData.ncb_receipt_number,
            ncb_transaction_date: updateData.ncb_transaction_date,
            completed_at: new Date().toISOString()
          }
        )

        if (!balanceResult.success) {
          console.error('Error updating wallet balance:', balanceResult.error)
        }
      }
    } else {
      // Transaction failed, update wallet transaction status
      const { error: transactionError } = await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          metadata: {
            ...stkPushLog.wallet_transaction?.metadata,
            failure_reason: ResultDesc,
            failed_at: new Date().toISOString()
          }
        })
        .eq('id', stkPushLog.wallet_transaction_id)

      if (transactionError) {
        console.error('Error updating failed wallet transaction:', transactionError)
      }
    }

    return NextResponse.json({ success: true, message: 'Callback processed successfully' })

  } catch (error) {
    console.error('STK Callback Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}