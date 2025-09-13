import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing callback simulation...')
    
    // Simulate M-Pesa result callback
    const resultCallbackData = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        OriginatorConversationID: "test-originator-id",
        ConversationID: "AG_20250913_test123",
        TransactionID: "test-transaction-id",
        ResultParameters: {
          ResultParameter: [
            { Key: "TransactionAmount", Value: "1" },
            { Key: "TransactionReceipt", Value: "test-receipt-123" },
            { Key: "ReceiverPartyPublicName", Value: "254727638940" }
          ]
        }
      }
    }

    // Test result callback
    const resultResponse = await fetch('https://paymentvalut-ju.vercel.app/api/mpesa-callback/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(resultCallbackData)
    })

    const resultData = await resultResponse.text()

    return NextResponse.json({
      message: 'Callback simulation test completed',
      timestamp: new Date().toISOString(),
      result_callback: {
        status: resultResponse.status,
        statusText: resultResponse.statusText,
        response: resultData
      }
    })

  } catch (error) {
    console.error('❌ Callback simulation failed:', error)
    return NextResponse.json({
      error: 'Callback simulation failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
