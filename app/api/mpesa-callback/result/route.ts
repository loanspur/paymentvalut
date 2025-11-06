import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface MpesaResultCallback {
  Result: {
    ResultType: number
    ResultCode: number
    ResultDesc: string
    OriginatorConversationID: string
    ConversationID: string
    TransactionID: string
    ResultParameters?: {
      ResultParameter: Array<{
        Key: string
        Value: string
      }>
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 M-Pesa callback received at cbsvault.co.ke')
    
    const callbackData: MpesaResultCallback = await request.json()
    console.log('Callback data:', JSON.stringify(callbackData, null, 2))

    const { Result } = callbackData
    const conversationId = Result.ConversationID
    const originatorConversationId = Result.OriginatorConversationID
    const transactionId = Result.TransactionID

    // Find the disbursement request by conversation ID
    let { data: disbursementRequest, error: findError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    // If not found by conversation_id, try to find by Occasion (disbursement ID)
    if (findError || !disbursementRequest) {
      console.log(`Disbursement not found by conversation_id: ${conversationId}, trying Occasion field`)
      
      // Extract Occasion from ResultParameters if available
      let occasion = null
      if (Result.ResultParameters?.ResultParameter) {
        for (const param of Result.ResultParameters.ResultParameter) {
          if (param.Key === 'Occasion') {
            occasion = param.Value
            break
          }
        }
      }
      
      if (occasion) {
        console.log(`Trying to find disbursement by Occasion: ${occasion}`)
        const { data: disbursementByOccasion, error: occasionError } = await supabase
          .from('disbursement_requests')
          .select('*')
          .eq('id', occasion)
          .single()
        
        if (!occasionError && disbursementByOccasion) {
          disbursementRequest = disbursementByOccasion
          findError = null
          console.log(`Found disbursement by Occasion: ${occasion}`)
        }
      }
    }

    if (findError || !disbursementRequest) {
      console.log(`Disbursement not found for conversation_id: ${conversationId}`)
      
      // Still save the callback for debugging
      await supabase
        .from('mpesa_callbacks')
        .insert({
          callback_type: 'result',
          conversation_id: conversationId,
          originator_conversation_id: originatorConversationId,
          transaction_id: transactionId,
          result_code: Result.ResultCode.toString(),
          result_desc: Result.ResultDesc,
          raw_callback_data: callbackData
        })
      
      return NextResponse.json({ message: 'OK' }, { status: 200 })
    }

    // Determine the final status based on result code
    let finalStatus = 'failed'
    if (Result.ResultCode === 0) {
      finalStatus = 'success'
    } else if (Result.ResultCode === 1) {
      finalStatus = 'pending'
    }

    // Extract additional parameters if available
    let receiptNumber = null
    let transactionAmount = null
    let transactionDate = null
    let workingAccountBalance = null
    let utilityAccountBalance = null
    let chargesAccountBalance = null

    if (Result.ResultParameters?.ResultParameter) {
      for (const param of Result.ResultParameters.ResultParameter) {
        switch (param.Key) {
          case 'TransactionReceipt':
            receiptNumber = param.Value
            break
          case 'TransactionAmount':
            transactionAmount = parseFloat(param.Value)
            break
          case 'TransactionDate':
            transactionDate = param.Value
            break
          case 'B2CWorkingAccountAvailableFunds':
            workingAccountBalance = parseFloat(param.Value)
            break
          case 'B2CUtilityAccountAvailableFunds':
            utilityAccountBalance = parseFloat(param.Value)
            break
          case 'B2CChargesPaidAccountAvailableFunds':
            chargesAccountBalance = parseFloat(param.Value)
            break
        }
      }
    }

    // Update the disbursement request status with balance information
    const { error: updateError } = await supabase
      .from('disbursement_requests')
      .update({
        status: finalStatus,
        result_code: Result.ResultCode.toString(),
        result_desc: Result.ResultDesc,
        transaction_id: transactionId,
        receipt_number: receiptNumber,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate,
        mpesa_working_account_balance: workingAccountBalance,
        mpesa_utility_account_balance: utilityAccountBalance,
        mpesa_charges_account_balance: chargesAccountBalance,
        balance_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', disbursementRequest.id)

    if (updateError) {
      console.error('Error updating disbursement request:', updateError)
    } else {
      console.log(`✅ Updated disbursement ${disbursementRequest.id} with status: ${finalStatus}`)
    }

    // 💰 NEW: Process wallet charge deduction based on disbursement status
    if (finalStatus === 'success') {
      // Disbursement succeeded - deduct wallet balance and complete pending transactions
      try {
        // Find pending wallet transaction for this disbursement
        const { data: walletTransaction, error: wtFindError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('reference', `DISBURSEMENT_CHARGE_${disbursementRequest.id}`)
          .eq('status', 'pending')
          .single()

        if (!wtFindError && walletTransaction) {
          const chargeAmount = Math.abs(walletTransaction.amount)
          
          // Get current wallet balance
          const { data: wallet, error: walletError } = await supabase
            .from('partner_wallets')
            .select('current_balance')
            .eq('id', walletTransaction.wallet_id)
            .single()

          if (!walletError && wallet) {
            const newBalance = wallet.current_balance - chargeAmount

            // Update wallet balance
            const { error: walletUpdateError } = await supabase
              .from('partner_wallets')
              .update({
                current_balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', walletTransaction.wallet_id)

            if (walletUpdateError) {
              console.error('❌ [Wallet] Error updating wallet balance:', walletUpdateError)
            } else {
              console.log('✅ [Wallet] Wallet balance deducted successfully:', {
                old_balance: wallet.current_balance,
                charge_deducted: chargeAmount,
                new_balance: newBalance
              })

              // Update wallet transaction status to completed
              const { error: wtUpdateError } = await supabase
                .from('wallet_transactions')
                .update({
                  status: 'completed',
                  metadata: {
                    ...(walletTransaction.metadata || {}),
                    wallet_balance_before: wallet.current_balance,
                    wallet_balance_after: newBalance,
                    completed_at: new Date().toISOString()
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', walletTransaction.id)

              if (wtUpdateError) {
                console.error('❌ [Wallet] Error updating wallet transaction status:', wtUpdateError)
              } else {
                console.log('✅ [Wallet] Wallet transaction status updated to completed')
              }

              // Update partner charge transaction status to completed
              const { error: pctUpdateError } = await supabase
                .from('partner_charge_transactions')
                .update({
                  status: 'completed',
                  wallet_balance_before: wallet.current_balance,
                  wallet_balance_after: newBalance,
                  metadata: {
                    ...(walletTransaction.metadata || {}),
                    wallet_balance_before: wallet.current_balance,
                    wallet_balance_after: newBalance,
                    completed_at: new Date().toISOString()
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('related_transaction_id', disbursementRequest.id)
                .eq('status', 'pending')

              if (pctUpdateError) {
                console.error('❌ [Wallet] Error updating partner charge transaction status:', pctUpdateError)
              } else {
                console.log('✅ [Wallet] Partner charge transaction status updated to completed')
              }
            }
          }
        } else if (wtFindError && wtFindError.code !== 'PGRST116') {
          console.log('💰 [Wallet] No pending wallet transaction found for this disbursement (may not have charges configured)')
        }
      } catch (walletError) {
        console.error('❌ [Wallet] Error processing wallet charge deduction:', walletError)
        // Don't fail the callback if wallet update fails
      }
    } else if (finalStatus === 'failed') {
      // Disbursement failed - mark pending transactions as failed (don't deduct balance)
      try {
        // Find pending wallet transaction for this disbursement
        const { data: failedWalletTransaction, error: wtFindError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('reference', `DISBURSEMENT_CHARGE_${disbursementRequest.id}`)
          .eq('status', 'pending')
          .single()

        if (!wtFindError && failedWalletTransaction) {
          const { error: wtUpdateError } = await supabase
            .from('wallet_transactions')
            .update({
              status: 'failed',
              metadata: {
                ...(failedWalletTransaction.metadata || {}),
                failure_reason: Result.ResultDesc || 'Disbursement failed',
                failed_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq('id', failedWalletTransaction.id)

          if (wtUpdateError) {
            console.error('❌ [Wallet] Error updating wallet transaction status to failed:', wtUpdateError)
          } else {
            console.log('✅ [Wallet] Wallet transaction status updated to failed (balance not deducted)')
          }

          // Update partner charge transaction status to failed
          const { error: pctUpdateError } = await supabase
            .from('partner_charge_transactions')
            .update({
              status: 'failed',
              metadata: {
                failure_reason: Result.ResultDesc || 'Disbursement failed',
                failed_at: new Date().toISOString()
              },
              updated_at: new Date().toISOString()
            })
            .eq('related_transaction_id', disbursementRequest.id)
            .eq('status', 'pending')

          if (pctUpdateError) {
            console.error('❌ [Wallet] Error updating partner charge transaction status to failed:', pctUpdateError)
          } else {
            console.log('✅ [Wallet] Partner charge transaction status updated to failed')
          }
        }
      } catch (walletError) {
        console.error('❌ [Wallet] Error processing failed wallet transaction:', walletError)
      }
    }

    // Log the callback
    await supabase
      .from('mpesa_callbacks')
      .insert({
        partner_id: disbursementRequest.partner_id,
        disbursement_id: disbursementRequest.id,
        callback_type: 'result',
        conversation_id: conversationId,
        originator_conversation_id: originatorConversationId,
        transaction_id: transactionId,
        result_code: Result.ResultCode.toString(),
        result_desc: Result.ResultDesc,
        receipt_number: receiptNumber,
        transaction_amount: transactionAmount,
        raw_callback_data: callbackData
      })

    // Send webhook to USSD backend if configured
    const ussdWebhookUrl = process.env.USSD_WEBHOOK_URL
    if (ussdWebhookUrl && disbursementRequest.origin === 'ussd') {
      try {
        const webhookPayload = {
          disbursement_id: disbursementRequest.id,
          conversation_id: conversationId,
          result_code: Result.ResultCode,
          result_desc: Result.ResultDesc,
          transaction_receipt: receiptNumber,
          amount: disbursementRequest.amount,
          msisdn: disbursementRequest.msisdn,
          customer_name: disbursementRequest.customer_name,
          processed_at: new Date().toISOString(),
          status: finalStatus
        }

        console.log(`📤 Sending webhook to USSD backend: ${ussdWebhookUrl}`)
        
        const webhookResponse = await fetch(ussdWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'PaymentVault-MPesa-Webhook/1.0'
          },
          body: JSON.stringify(webhookPayload),
          // Disable SSL certificate verification for webhook delivery
          // This is needed when the USSD backend has self-signed or invalid certificates
          // @ts-ignore - Node.js fetch options
          tls: {
            rejectUnauthorized: false
          }
        })

        if (webhookResponse.ok) {
          console.log(`✅ Webhook sent successfully to USSD backend (${webhookResponse.status})`)
        } else {
          console.error(`❌ Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`)
        }
      } catch (webhookError) {
        console.error('❌ Error sending webhook to USSD backend:', webhookError)
        // Don't fail the callback processing if webhook fails
      }
    } else if (disbursementRequest.origin === 'ussd') {
      console.warn('⚠️ USSD webhook URL not configured, skipping webhook notification')
    }

    console.log('✅ M-Pesa callback processed successfully')
    return NextResponse.json({ message: 'OK' }, { status: 200 })

  } catch (error) {
    console.error('❌ Error processing M-Pesa callback:', error)
    return NextResponse.json({ message: 'OK' }, { status: 200 })
  }
}