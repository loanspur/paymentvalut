import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Manual callback processor started...')
    
    const { disbursementId, resultCode = 0, resultDesc = "The service request is processed successfully.", transactionReceipt } = await request.json()

    if (!disbursementId) {
      return NextResponse.json({
        error: 'disbursementId is required'
      }, { status: 400 })
    }

    // Get the disbursement request
    const { data: disbursementRequest, error: findError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('id', disbursementId)
      .single()

    if (findError || !disbursementRequest) {
      return NextResponse.json({
        error: 'Disbursement not found',
        details: findError?.message
      }, { status: 404 })
    }

    // Determine the final status based on result code
    let finalStatus = 'failed'
    if (resultCode === 0) {
      finalStatus = 'success'
    } else if (resultCode === 1) {
      finalStatus = 'pending'
    }

    // Update the disbursement request
    const { error: updateError } = await supabase
      .from('disbursement_requests')
      .update({
        status: finalStatus,
        result_code: resultCode.toString(),
        result_desc: resultDesc,
        transaction_receipt: transactionReceipt || `MANUAL_${Date.now()}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', disbursementId)

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update disbursement',
        details: updateError.message
      }, { status: 500 })
    }

    // Log the manual callback
    await supabase
      .from('mpesa_callbacks')
      .insert({
        partner_id: disbursementRequest.partner_id,
        disbursement_id: disbursementId,
        callback_type: 'manual',
        conversation_id: disbursementRequest.conversation_id,
        result_code: resultCode.toString(),
        result_desc: resultDesc,
        receipt_number: transactionReceipt || `MANUAL_${Date.now()}`,
        transaction_amount: disbursementRequest.amount,
        raw_callback_data: {
          manual: true,
          processed_at: new Date().toISOString()
        }
      })

    console.log(`✅ Manually updated disbursement ${disbursementId} to status: ${finalStatus}`)

    return NextResponse.json({
      message: 'Manual callback processed successfully',
      disbursement_id: disbursementId,
      status: finalStatus,
      result_code: resultCode,
      result_desc: resultDesc,
      transaction_receipt: transactionReceipt || `MANUAL_${Date.now()}`
    })

  } catch (error) {
    console.error('❌ Manual callback processor failed:', error)
    return NextResponse.json({
      error: 'Manual callback processor failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get recent disbursements that need manual processing
    const { data: disbursements, error } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('status', 'accepted')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch disbursements',
        details: error.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Disbursements needing manual processing',
      disbursements: disbursements?.map(d => ({
        id: d.id,
        amount: d.amount,
        msisdn: d.msisdn,
        status: d.status,
        conversation_id: d.conversation_id,
        created_at: d.created_at
      })) || []
    })

  } catch (error) {
    console.error('❌ Failed to fetch disbursements:', error)
    return NextResponse.json({
      error: 'Failed to fetch disbursements',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
