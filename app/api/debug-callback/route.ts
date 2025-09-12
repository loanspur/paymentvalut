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
    console.log('🔍 Debugging callback data...')
    
    // Get the latest disbursement
    const { data: latestDisbursement, error: disbursementError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (disbursementError) {
      return NextResponse.json({ 
        error: 'Failed to fetch disbursement', 
        details: disbursementError 
      }, { status: 500 })
    }

    console.log('Latest disbursement:', latestDisbursement)

    // Get all callbacks for this disbursement
    const { data: callbacks, error: callbackError } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .or(`disbursement_id.eq.${latestDisbursement.id},conversation_id.eq.${latestDisbursement.conversation_id}`)
      .order('created_at', { ascending: false })

    if (callbackError) {
      return NextResponse.json({ 
        error: 'Failed to fetch callbacks', 
        details: callbackError 
      }, { status: 500 })
    }

    // Get all callbacks (for debugging)
    const { data: allCallbacks, error: allCallbackError } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      message: 'Callback debug data',
      latest_disbursement: latestDisbursement,
      callbacks_for_disbursement: callbacks || [],
      all_recent_callbacks: allCallbacks || [],
      disbursement_id: latestDisbursement.id,
      conversation_id: latestDisbursement.conversation_id,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error debugging callbacks:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
