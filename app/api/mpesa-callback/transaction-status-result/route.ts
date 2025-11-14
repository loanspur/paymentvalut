import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { log } from '@/lib/logger'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * M-Pesa Transaction Status Query Result Callback
 * This endpoint receives the result of a transaction status query
 */
export async function POST(request: NextRequest) {
  try {
    const callbackData = await request.json()
    
    log.info('Transaction Status Query Result received', { callbackData })

    // M-Pesa Transaction Status Query response structure
    const { Result } = callbackData
    
    if (!Result) {
      log.warn('Invalid callback data structure', { callbackData })
      return NextResponse.json({ message: 'Invalid callback data' }, { status: 400 })
    }

    const conversationId = Result.ConversationID
    const originatorConversationId = Result.OriginatorConversationID
    const resultCode = Result.ResultCode
    const resultDesc = Result.ResultDesc
    const transactionId = Result.TransactionID

    // Extract transaction details from ResultParameters
    let transactionReceipt = null
    let transactionAmount = null
    let transactionDate = null
    let utilityAccountBalance = null
    let workingAccountBalance = null
    let chargesAccountBalance = null
    let receiverPartyPublicName = null

    if (Result.ResultParameters?.ResultParameter) {
      for (const param of Result.ResultParameters.ResultParameter) {
        switch (param.Key) {
          case 'TransactionReceipt':
            transactionReceipt = param.Value
            break
          case 'TransactionAmount':
            transactionAmount = parseFloat(param.Value)
            break
          case 'TransactionDate':
            transactionDate = param.Value
            break
          case 'B2CUtilityAccountAvailableFunds':
            utilityAccountBalance = parseFloat(param.Value)
            break
          case 'B2CWorkingAccountAvailableFunds':
            workingAccountBalance = parseFloat(param.Value)
            break
          case 'B2CChargesPaidAccountAvailableFunds':
            chargesAccountBalance = parseFloat(param.Value)
            break
          case 'ReceiverPartyPublicName':
            receiverPartyPublicName = param.Value
            break
        }
      }
    }

    // Determine transaction status
    const status = resultCode === 0 ? 'success' : 'failed'

    // Store the query result in database
    await supabase
      .from('mpesa_callbacks')
      .insert({
        callback_type: 'transaction_status_query',
        conversation_id: conversationId,
        originator_conversation_id: originatorConversationId,
        transaction_id: transactionId,
        receipt_number: transactionReceipt,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate,
        result_code: resultCode.toString(),
        result_desc: resultDesc,
        raw_callback_data: callbackData
      })

    // Try to find and update the disbursement request
    const { data: disbursementRequest } = await supabase
      .from('disbursement_requests')
      .select('id, partner_id, status')
      .or(`conversation_id.eq.${conversationId},originator_conversation_id.eq.${originatorConversationId},conversation_id.eq.${originatorConversationId},originator_conversation_id.eq.${conversationId}`)
      .single()

    if (disbursementRequest) {
      // Update the disbursement request with the query result
      await supabase
        .from('disbursement_requests')
        .update({
          status: status,
          result_code: resultCode.toString(),
          result_desc: resultDesc,
          transaction_id: transactionId,
          receipt_number: transactionReceipt,
          transaction_amount: transactionAmount,
          transaction_date: transactionDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', disbursementRequest.id)

      log.info('Disbursement request updated with transaction status', {
        disbursement_id: disbursementRequest.id,
        status,
        result_code: resultCode
      })
    }

    // Prepare response summary
    const response = {
      success: true,
      message: 'Transaction status query result received',
      transaction: {
        conversation_id: conversationId,
        originator_conversation_id: originatorConversationId,
        transaction_id: transactionId,
        receipt_number: transactionReceipt,
        status: status,
        result_code: resultCode,
        result_description: resultDesc,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate,
        receiver_name: receiverPartyPublicName,
        balances: {
          utility_account: utilityAccountBalance,
          working_account: workingAccountBalance,
          charges_account: chargesAccountBalance
        }
      },
      disbursement_updated: !!disbursementRequest
    }

    log.info('Transaction status query processed successfully', response)

    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    log.error('Error processing transaction status query result', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process transaction status query result',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'M-Pesa Transaction Status Query Result Callback Endpoint',
    method: 'POST',
    description: 'This endpoint receives transaction status query results from M-Pesa'
  })
}

