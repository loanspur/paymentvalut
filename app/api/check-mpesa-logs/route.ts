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
    console.log('🔍 Checking M-Pesa API logs...')
    
    // Get recent disbursements with their status
    const { data: recentDisbursements, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (disbursementError) {
      return NextResponse.json({ 
        error: 'Failed to fetch disbursements', 
        details: disbursementError 
      }, { status: 500 })
    }

    // Get all callbacks
    const { data: allCallbacks, error: callbackError } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (callbackError) {
      return NextResponse.json({ 
        error: 'Failed to fetch callbacks', 
        details: callbackError 
      }, { status: 500 })
    }

    // Analyze the data
    const analysis = {
      total_disbursements: recentDisbursements?.length || 0,
      disbursements_with_callbacks: 0,
      disbursements_without_callbacks: 0,
      successful_transactions: 0,
      failed_transactions: 0,
      pending_transactions: 0,
      callback_success_rate: 0
    }

    recentDisbursements?.forEach(disbursement => {
      const hasCallback = allCallbacks?.some(callback => 
        callback.conversation_id === disbursement.conversation_id ||
        callback.disbursement_id === disbursement.id
      )
      
      if (hasCallback) {
        analysis.disbursements_with_callbacks++
      } else {
        analysis.disbursements_without_callbacks++
      }

      if (disbursement.status === 'success') {
        analysis.successful_transactions++
      } else if (disbursement.status === 'failed') {
        analysis.failed_transactions++
      } else {
        analysis.pending_transactions++
      }
    })

    if (analysis.total_disbursements > 0) {
      analysis.callback_success_rate = (analysis.disbursements_with_callbacks / analysis.total_disbursements) * 100
    }

    return NextResponse.json({
      message: 'M-Pesa API logs analysis',
      analysis,
      recent_disbursements: recentDisbursements,
      recent_callbacks: allCallbacks,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error checking M-Pesa logs:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
