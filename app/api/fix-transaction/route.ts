import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    const { transactionId, status, resultCode, resultDesc, conversationId, receiptNumber } = await request.json()

    if (!transactionId) {
      return NextResponse.json({
        error: 'Transaction ID is required'
      }, { status: 400 })
    }

    // Update the transaction
    const updateData: any = {
      status: status || 'success',
      updated_at: new Date().toISOString()
    }

    if (resultCode) updateData.result_code = resultCode
    if (resultDesc) updateData.result_desc = resultDesc
    if (conversationId) updateData.conversation_id = conversationId
    if (receiptNumber) updateData.receipt_number = receiptNumber

    const { data, error } = await supabase
      .from('disbursement_requests')
      .update(updateData)
      .eq('id', transactionId)
      .select()

    if (error) {
      console.error('Error updating transaction:', error)
      return NextResponse.json({
        error: 'Failed to update transaction',
        details: error.message
      }, { status: 500 })
    }

    console.log('✅ Transaction updated successfully:', data)

    return NextResponse.json({
      success: true,
      message: 'Transaction updated successfully',
      data: data[0]
    })

  } catch (error) {
    console.error('Error in fix-transaction API:', error)
    return NextResponse.json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
