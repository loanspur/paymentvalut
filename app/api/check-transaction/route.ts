import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get('conversation_id')
    
    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id parameter is required' },
        { status: 400 }
      )
    }

    console.log(`🔍 Checking transaction status for: ${conversationId}`)

    // Check disbursement request
    const { data: disbursement, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    if (disbursementError) {
      console.log('❌ Disbursement not found:', disbursementError)
      return NextResponse.json(
        { error: 'Transaction not found', details: disbursementError.message },
        { status: 404 }
      )
    }

    // Check M-Pesa callbacks
    const { data: callbacks, error: callbacksError } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    console.log('✅ Transaction found:', {
      disbursementId: disbursement.id,
      status: disbursement.status,
      amount: disbursement.amount,
      msisdn: disbursement.msisdn,
      callbacksCount: callbacks?.length || 0
    })

    return NextResponse.json({
      success: true,
      transaction: {
        id: disbursement.id,
        conversation_id: disbursement.conversation_id,
        status: disbursement.status,
        amount: disbursement.amount,
        msisdn: disbursement.msisdn,
        result_code: disbursement.result_code,
        result_desc: disbursement.result_desc,
        created_at: disbursement.created_at,
        updated_at: disbursement.updated_at
      },
      callbacks: callbacks || [],
      summary: {
        disbursement_status: disbursement.status,
        has_callbacks: (callbacks?.length || 0) > 0,
        latest_callback: callbacks?.[0] || null
      }
    })

  } catch (error) {
    console.error('❌ Error checking transaction:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
