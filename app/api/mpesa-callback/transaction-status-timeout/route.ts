import { NextRequest, NextResponse } from 'next/server'
import { log } from '@/lib/logger'

/**
 * M-Pesa Transaction Status Query Timeout Callback
 * This endpoint receives timeout notifications for transaction status queries
 */
export async function POST(request: NextRequest) {
  try {
    const callbackData = await request.json()
    
    log.warn('Transaction Status Query Timeout received', { callbackData })

    // M-Pesa timeout callback structure
    const { Result } = callbackData
    
    if (!Result) {
      log.warn('Invalid timeout callback data structure', { callbackData })
      return NextResponse.json({ message: 'Invalid callback data' }, { status: 400 })
    }

    const conversationId = Result.ConversationID
    const originatorConversationId = Result.OriginatorConversationID
    const resultCode = Result.ResultCode
    const resultDesc = Result.ResultDesc

    log.warn('Transaction status query timed out', {
      conversation_id: conversationId,
      originator_conversation_id: originatorConversationId,
      result_code: resultCode,
      result_desc: resultDesc
    })

    return NextResponse.json({
      success: true,
      message: 'Transaction status query timeout received',
      conversation_id: conversationId,
      originator_conversation_id: originatorConversationId,
      result_code: resultCode,
      result_description: resultDesc
    }, { status: 200 })

  } catch (error) {
    log.error('Error processing transaction status query timeout', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to process timeout callback',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Allow GET for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'M-Pesa Transaction Status Query Timeout Callback Endpoint',
    method: 'POST',
    description: 'This endpoint receives timeout notifications for transaction status queries'
  })
}

