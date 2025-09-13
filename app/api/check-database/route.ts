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
    console.log('🔍 Checking database for recent transactions...')
    
    // Get recent disbursement requests
    const { data: disbursements, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

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
      .limit(5)

    if (callbackError) {
      return NextResponse.json({
        error: 'Failed to fetch callbacks',
        details: callbackError.message
      }, { status: 500 })
    }

    // Look for the 11 KES transaction
    const recentTransaction = disbursements?.find(d => 
      d.amount === 11 || 
      d.conversation_id?.includes('AG_20250913') ||
      d.created_at && new Date(d.created_at) > new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
    )

    return NextResponse.json({
      message: 'Database check completed',
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
      recent_transaction: recentTransaction ? {
        id: recentTransaction.id,
        amount: recentTransaction.amount,
        msisdn: recentTransaction.msisdn,
        status: recentTransaction.status,
        conversation_id: recentTransaction.conversation_id,
        result_code: recentTransaction.result_code,
        result_desc: recentTransaction.result_desc,
        transaction_receipt: recentTransaction.transaction_receipt,
        created_at: recentTransaction.created_at,
        updated_at: recentTransaction.updated_at
      } : null,
      summary: {
        total_disbursements: disbursements?.length || 0,
        total_callbacks: callbacks?.length || 0,
        recent_transaction_found: !!recentTransaction
      }
    })

  } catch (error) {
    console.error('❌ Database check failed:', error)
    return NextResponse.json({
      error: 'Database check failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
