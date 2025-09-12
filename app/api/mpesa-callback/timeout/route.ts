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
    console.log('⏰ M-Pesa timeout callback received at cbsvault.co.ke')
    
    const callbackData = await request.json()
    console.log('Timeout callback data:', JSON.stringify(callbackData, null, 2))

    // Extract conversation ID and other relevant data
    const conversationId = callbackData?.Result?.ConversationID || callbackData?.ConversationID
    const originatorConversationId = callbackData?.Result?.OriginatorConversationID || callbackData?.OriginatorConversationID

    // Find the disbursement request
    const { data: disbursementRequest, error: findError } = await supabase
      .from('disbursement_requests')
      .select('*')
      .eq('conversation_id', conversationId)
      .single()

    if (!findError && disbursementRequest) {
      // Update the disbursement request status to timeout
      await supabase
        .from('disbursement_requests')
        .update({
          status: 'failed',
          result_code: 'TIMEOUT',
          result_desc: 'Transaction timeout',
          updated_at: new Date().toISOString()
        })
        .eq('id', disbursementRequest.id)

      console.log(`⏰ Updated disbursement ${disbursementRequest.id} to timeout status`)
    }

    // Log the timeout callback
    await supabase
      .from('mpesa_callbacks')
      .insert({
        partner_id: disbursementRequest?.partner_id || null,
        disbursement_id: disbursementRequest?.id || null,
        callback_type: 'timeout',
        conversation_id: conversationId,
        originator_conversation_id: originatorConversationId,
        result_code: 'TIMEOUT',
        result_desc: 'Transaction timeout',
        raw_callback_data: callbackData
      })

    console.log('✅ M-Pesa timeout callback processed successfully')
    return NextResponse.json({ message: 'OK' }, { status: 200 })

  } catch (error) {
    console.error('❌ Error processing M-Pesa timeout callback:', error)
    return NextResponse.json({ message: 'OK' }, { status: 200 })
  }
}