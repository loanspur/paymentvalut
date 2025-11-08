import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import UnifiedWalletService from '@/lib/unified-wallet-service'

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
    const callbackData: MpesaResultCallback = await request.json()

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
        const { data: disbursementByOccasion, error: occasionError } = await supabase
          .from('disbursement_requests')
          .select('*')
          .eq('id', occasion)
          .single()
        
        if (!occasionError && disbursementByOccasion) {
          disbursementRequest = disbursementByOccasion
          findError = null
        }
      }
    }

    if (findError || !disbursementRequest) {
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
      console.error('[M-Pesa Callback] Error updating disbursement request:', updateError)
    }

    // Process wallet charge deduction based on disbursement status
    // Only deduct wallet balance when disbursement status is 'success'
    const { data: currentDisbursement } = await supabase
      .from('disbursement_requests')
      .select('status, result_code')
      .eq('id', disbursementRequest.id)
      .single()
    
    const actualStatus = currentDisbursement?.status || finalStatus
    
    if (finalStatus === 'success' && actualStatus === 'success') {
      try {
        const { data: walletTransaction, error: wtFindError } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('reference', `DISBURSEMENT_CHARGE_${disbursementRequest.id}`)
          .eq('status', 'pending')
          .single()

        if (!wtFindError && walletTransaction) {
          // Re-check the disbursement status one more time before deducting
          const { data: finalCheck, error: finalCheckError } = await supabase
            .from('disbursement_requests')
            .select('status, result_code')
            .eq('id', disbursementRequest.id)
            .single()
          
          if (finalCheckError || !finalCheck || finalCheck.status !== 'success') {
            throw new Error(`Disbursement status is '${finalCheck?.status || 'unknown'}', not 'success'. Wallet deduction aborted.`)
          }
          
          const chargeAmount = Math.abs(walletTransaction.amount)
          const { data: wallet, error: walletError } = await supabase
            .from('partner_wallets')
            .select('current_balance')
            .eq('id', walletTransaction.wallet_id)
            .single()

          if (!walletError && wallet) {
            const balanceResult = await UnifiedWalletService.updateWalletBalance(
              disbursementRequest.partner_id,
              -chargeAmount, // Negative amount for deduction
              'charge',
              {
                reference: `DISBURSEMENT_CHARGE_${disbursementRequest.id}`,
                description: `Disbursement charge for ${disbursementRequest.amount} KES`,
                related_transaction_id: disbursementRequest.id,
                related_transaction_type: 'disbursement',
                disbursement_id: disbursementRequest.id,
                disbursement_amount: disbursementRequest.amount,
                charge_amount: chargeAmount,
                wallet_transaction_id: walletTransaction.id,
                processed_via_callback: true,
                callback_timestamp: new Date().toISOString()
              }
            )

            if (!balanceResult.success) {
              console.error('[M-Pesa Callback] UnifiedWalletService failed to deduct wallet balance:', balanceResult.error)
              throw new Error(`Failed to deduct wallet balance: ${balanceResult.error}`)
            } else {
              const newBalance = balanceResult.newBalance || (wallet.current_balance - chargeAmount)

              const { error: wtUpdateError } = await supabase
                .from('wallet_transactions')
                .update({
                  status: 'completed',
                  metadata: {
                    ...(walletTransaction.metadata || {}),
                    wallet_balance_before: balanceResult.previousBalance,
                    wallet_balance_after: balanceResult.newBalance,
                    completed_at: new Date().toISOString(),
                    processed_via_unified_service: true
                  },
                  updated_at: new Date().toISOString()
                })
                .eq('id', walletTransaction.id)

              if (wtUpdateError) {
                console.error('[M-Pesa Callback] Error updating wallet transaction status:', wtUpdateError)
              }

              const { data: pendingCharges, error: pctFindError } = await supabase
                .from('partner_charge_transactions')
                .select('*')
                .eq('related_transaction_id', disbursementRequest.id)
                .eq('status', 'pending')

              if (!pctFindError && pendingCharges && pendingCharges.length > 0) {
                // Process each pending charge transaction
                for (const chargeTransaction of pendingCharges) {
                  // Only deduct if charge wasn't already deducted
                  if (chargeTransaction.status === 'pending' && chargeTransaction.metadata?.deduction_deferred !== true) {
                    // This charge was already deducted, just update status
                    const { error: pctUpdateError } = await supabase
                      .from('partner_charge_transactions')
                      .update({
                        status: 'completed',
                        wallet_balance_before: wallet.current_balance,
                        wallet_balance_after: newBalance,
                        metadata: {
                          ...(chargeTransaction.metadata || {}),
                          wallet_balance_before: wallet.current_balance,
                          wallet_balance_after: newBalance,
                          completed_at: new Date().toISOString()
                        },
                        processed_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', chargeTransaction.id)

                    if (pctUpdateError) {
                      console.error('[M-Pesa Callback] Error updating charge transaction:', pctUpdateError)
                    }
                  } else {
                    const deferredChargeAmount = chargeTransaction.charge_amount || chargeAmount
                    const deferredBalanceResult = await UnifiedWalletService.updateWalletBalance(
                      disbursementRequest.partner_id,
                      -deferredChargeAmount,
                      'charge',
                      {
                        reference: `CHARGE_${chargeTransaction.id}`,
                        description: chargeTransaction.description || `Deferred charge for disbursement ${disbursementRequest.id}`,
                        charge_transaction_id: chargeTransaction.id,
                        charge_config_id: chargeTransaction.charge_config_id,
                        related_transaction_id: disbursementRequest.id,
                        related_transaction_type: 'disbursement',
                        deferred_charge: true,
                        processed_at: new Date().toISOString()
                      }
                    )

                    if (deferredBalanceResult.success) {
                      // Update charge transaction status to completed
                      const { error: pctUpdateError } = await supabase
                        .from('partner_charge_transactions')
                        .update({
                          status: 'completed',
                          wallet_balance_before: wallet.current_balance,
                          wallet_balance_after: deferredBalanceResult.newBalance,
                          metadata: {
                            ...(chargeTransaction.metadata || {}),
                            wallet_balance_before: wallet.current_balance,
                            wallet_balance_after: deferredBalanceResult.newBalance,
                            completed_at: new Date().toISOString(),
                            deferred_charge_processed: true
                          },
                          processed_at: new Date().toISOString(),
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', chargeTransaction.id)

                      if (pctUpdateError) {
                        console.error('[M-Pesa Callback] Error updating deferred charge transaction:', pctUpdateError)
                      }
                    } else {
                      console.error('[M-Pesa Callback] Failed to process deferred charge transaction:', deferredBalanceResult.error)
                    }
                  }
                }
              } else {
                const { error: pctUpdateError } = await supabase
                  .from('partner_charge_transactions')
                  .update({
                    status: 'completed',
                    wallet_balance_before: wallet.current_balance,
                    wallet_balance_after: newBalance,
                    metadata: {
                      wallet_balance_before: wallet.current_balance,
                      wallet_balance_after: newBalance,
                      completed_at: new Date().toISOString()
                    },
                    processed_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                  .eq('related_transaction_id', disbursementRequest.id)
                  .eq('status', 'pending')

                if (pctUpdateError && pctUpdateError.code !== 'PGRST116') {
                  console.error('[M-Pesa Callback] Error updating partner charge transaction status:', pctUpdateError)
                }
              }
            }
          }
        }
      } catch (walletError) {
        console.error('[M-Pesa Callback] Error processing wallet charge deduction:', walletError)
      }
    } else if (finalStatus === 'failed') {
      // Disbursement failed - mark pending transactions as failed
      try {
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
            console.error('[M-Pesa Callback] Error updating wallet transaction status to failed:', wtUpdateError)
          }

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
            console.error('[M-Pesa Callback] Error updating partner charge transaction status to failed:', pctUpdateError)
          }
        }
      } catch (walletError) {
        console.error('[M-Pesa Callback] Error processing failed wallet transaction:', walletError)
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

        if (!webhookResponse.ok) {
          console.error('[M-Pesa Callback] Webhook failed:', webhookResponse.status, webhookResponse.statusText)
        }
      } catch (webhookError) {
        console.error('[M-Pesa Callback] Error sending webhook:', webhookError)
      }
    }

    return NextResponse.json({ message: 'OK' }, { status: 200 })

  } catch (error) {
    console.error('[M-Pesa Callback] Error:', error)
    return NextResponse.json({ message: 'OK' }, { status: 200 })
  }
}