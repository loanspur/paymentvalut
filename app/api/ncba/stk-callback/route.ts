import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('STK Push Callback received:', JSON.stringify(body, null, 2))

    const { 
      Body: {
        stkCallback: {
          CheckoutRequestID,
          ResultCode,
          ResultDesc,
          CallbackMetadata
        }
      }
    } = body

    // Find the STK Push log by CheckoutRequestID
    const { data: stkLog, error: stkLogError } = await supabase
      .from('ncb_stk_push_logs')
      .select('*')
      .eq('checkout_request_id', CheckoutRequestID)
      .single()

    if (stkLogError || !stkLog) {
      console.error('STK Push log not found for CheckoutRequestID:', CheckoutRequestID)
      return NextResponse.json({ success: false, error: 'STK Push log not found' }, { status: 404 })
    }

    // Update STK Push log with callback data
    const updateData: any = {
      callback_payload: body,
      result_code: ResultCode,
      result_description: ResultDesc,
      updated_at: new Date().toISOString()
    }

    // If successful, extract transaction details
    if (ResultCode === 0 && CallbackMetadata) {
      const metadata = CallbackMetadata.Item || []
      const mpesaReceiptNumber = metadata.find((item: any) => item.Name === 'MpesaReceiptNumber')?.Value
      const transactionDate = metadata.find((item: any) => item.Name === 'TransactionDate')?.Value
      const phoneNumber = metadata.find((item: any) => item.Name === 'PhoneNumber')?.Value

      updateData.mpesa_receipt_number = mpesaReceiptNumber
      updateData.transaction_date = transactionDate
      updateData.phone_number = phoneNumber
      updateData.status = 'completed'
    } else {
      updateData.status = 'failed'
    }

    // Update the STK Push log
    const { error: updateError } = await supabase
      .from('ncb_stk_push_logs')
      .update(updateData)
      .eq('checkout_request_id', CheckoutRequestID)

    if (updateError) {
      console.error('Error updating STK Push log:', updateError)
    }

    // If successful, create wallet transaction and update partner wallet
    if (ResultCode === 0 && updateData.mpesa_receipt_number) {
      try {
        // Get partner wallet
        const { data: wallet, error: walletError } = await supabase
          .from('partner_wallets')
          .select('*')
          .eq('partner_id', stkLog.partner_id)
          .single()

        if (walletError || !wallet) {
          console.error('Partner wallet not found:', stkLog.partner_id)
        } else {
          // Create wallet transaction
          const { data: transaction, error: transactionError } = await supabase
            .from('wallet_transactions')
            .insert({
              partner_id: stkLog.partner_id,
              transaction_type: 'top_up',
              amount: stkLog.amount,
              currency: 'KES',
              status: 'completed',
              reference: updateData.mpesa_receipt_number,
              description: `Wallet top-up via STK Push - ${stkLog.transaction_desc}`,
              metadata: {
                stk_push_log_id: stkLog.id,
                checkout_request_id: CheckoutRequestID,
                phone_number: updateData.phone_number,
                transaction_date: updateData.transaction_date,
                source: 'ncba_stk_push'
              }
            })
            .select()
            .single()

          if (transactionError) {
            console.error('Error creating wallet transaction:', transactionError)
          } else {
            // Update partner wallet balance
            const newBalance = (wallet.balance || 0) + stkLog.amount
            const { error: balanceError } = await supabase
              .from('partner_wallets')
              .update({ 
                balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('partner_id', stkLog.partner_id)

            if (balanceError) {
              console.error('Error updating wallet balance:', balanceError)
            } else {
              console.log(`Wallet balance updated for partner ${stkLog.partner_id}: ${wallet.balance} -> ${newBalance}`)
            }
          }
        }
      } catch (walletError) {
        console.error('Error processing wallet update:', walletError)
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Callback processed successfully' 
    })

  } catch (error) {
    console.error('STK Push Callback Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}


