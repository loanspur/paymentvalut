import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Debugging callback processing...')
    
    // Get the most recent disbursement request
    const { data: recentDisbursement, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (disbursementError) {
      return NextResponse.json({
        error: 'Failed to fetch recent disbursement',
        details: disbursementError.message
      }, { status: 500 })
    }

    // Get recent callbacks
    const { data: recentCallbacks, error: callbackError } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)

    if (callbackError) {
      return NextResponse.json({
        error: 'Failed to fetch callbacks',
        details: callbackError.message
      }, { status: 500 })
    }

    // Check if conversation_id matches
    const matchingCallbacks = recentCallbacks?.filter(callback => 
      callback.conversation_id === recentDisbursement?.conversation_id
    )

    return NextResponse.json({
      message: 'Callback debug completed',
      timestamp: new Date().toISOString(),
      recent_disbursement: recentDisbursement ? {
        id: recentDisbursement.id,
        amount: recentDisbursement.amount,
        msisdn: recentDisbursement.msisdn,
        status: recentDisbursement.status,
        conversation_id: recentDisbursement.conversation_id,
        result_code: recentDisbursement.result_code,
        result_desc: recentDisbursement.result_desc,
        transaction_receipt: recentDisbursement.transaction_receipt,
        created_at: recentDisbursement.created_at,
        updated_at: recentDisbursement.updated_at
      } : null,
      recent_callbacks: recentCallbacks?.map(callback => ({
        id: callback.id,
        conversation_id: callback.conversation_id,
        callback_type: callback.callback_type,
        result_code: callback.result_code,
        result_desc: callback.result_desc,
        receipt_number: callback.receipt_number,
        transaction_amount: callback.transaction_amount,
        created_at: callback.created_at
      })) || [],
      matching_callbacks: matchingCallbacks?.map(callback => ({
        id: callback.id,
        conversation_id: callback.conversation_id,
        callback_type: callback.callback_type,
        result_code: callback.result_code,
        result_desc: callback.result_desc,
        receipt_number: callback.receipt_number,
        transaction_amount: callback.transaction_amount,
        created_at: callback.created_at
      })) || [],
      analysis: {
        disbursement_found: !!recentDisbursement,
        callbacks_found: recentCallbacks?.length || 0,
        matching_callbacks: matchingCallbacks?.length || 0,
        conversation_id_match: matchingCallbacks && matchingCallbacks.length > 0,
        status_issue: recentDisbursement?.status === 'accepted' ? 'Status not updated to success' : 'Status looks correct'
      }
    })

  } catch (error) {
    console.error('❌ Callback debug failed:', error)
    return NextResponse.json({
      error: 'Callback debug failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}