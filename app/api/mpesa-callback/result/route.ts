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

    console.log('✅ M-Pesa callback processed successfully')
    return NextResponse.json({ message: 'OK' }, { status: 200 })

  } catch (error) {
    console.error('❌ Error processing M-Pesa callback:', error)
    return NextResponse.json({ message: 'OK' }, { status: 200 })
  }
}