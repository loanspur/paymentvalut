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
    console.log('🔍 Checking transaction status...')
    
    // Get recent disbursement requests
    const { data: disbursements, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (disbursementError) {
      return NextResponse.json({
        error: 'Failed to fetch disbursements',
        details: disbursementError.message
      }, { status: 500 })
    }

    // Get recent M-Pesa callbacks
    const { data: callbacks, error: callbackError } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (callbackError) {
      return NextResponse.json({
        error: 'Failed to fetch callbacks',
        details: callbackError.message
      }, { status: 500 })
    }

    // Look for the specific transaction from the test
    const testTransaction = disbursements?.find(d => 
      d.conversation_id?.includes('AG_20250913') || 
      d.occasion?.includes('FIXED_TEST')
    )

    return NextResponse.json({
      message: 'Transaction status check completed',
      timestamp: new Date().toISOString(),
      recent_disbursements: disbursements?.map(d => ({
        id: d.id,
        amount: d.amount,
        msisdn: d.msisdn,
        status: d.status,
        conversation_id: d.conversation_id,
        result_code: d.result_code,
        result_desc: d.result_desc,
        transaction_receipt: d.transaction_receipt,
        created_at: d.created_at,
        updated_at: d.updated_at
      })) || [],
      recent_callbacks: callbacks?.map(c => ({
        id: c.id,
        conversation_id: c.conversation_id,
        callback_type: c.callback_type,
        result_code: c.result_code,
        result_desc: c.result_desc,
        receipt_number: c.receipt_number,
        transaction_amount: c.transaction_amount,
        created_at: c.created_at
      })) || [],
      test_transaction: testTransaction ? {
        id: testTransaction.id,
        amount: testTransaction.amount,
        msisdn: testTransaction.msisdn,
        status: testTransaction.status,
        conversation_id: testTransaction.conversation_id,
        result_code: testTransaction.result_code,
        result_desc: testTransaction.result_desc,
        transaction_receipt: testTransaction.transaction_receipt,
        created_at: testTransaction.created_at,
        updated_at: testTransaction.updated_at
      } : null
    })

  } catch (error) {
    console.error('❌ Transaction status check failed:', error)
    return NextResponse.json({
      error: 'Transaction status check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
