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
    console.log('🔍 Checking M-Pesa callbacks for balance data...')
    
    // Get the latest callbacks
    const { data: callbacks, error } = await supabase
      .from('mpesa_callbacks')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const response = {
      message: `Found ${callbacks.length} M-Pesa callbacks`,
      callbacks: callbacks.map(callback => ({
        id: callback.id,
        conversation_id: callback.conversation_id,
        originator_conversation_id: callback.originator_conversation_id,
        result_code: callback.result_code,
        result_desc: callback.result_desc,
        transaction_id: callback.transaction_id,
        amount: callback.amount,
        phone_number: callback.phone_number,
        created_at: callback.created_at,
        raw_response: callback.raw_response
      }))
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to check callbacks',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
