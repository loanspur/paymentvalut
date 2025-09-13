import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Verifying callback URLs for Safaricom...')
    
    const callbackUrls = {
      result: "https://paymentvalut-ju.vercel.app/api/mpesa-callback/result",
      timeout: "https://paymentvalut-ju.vercel.app/api/mpesa-callback/timeout"
    }

    // Test both callback URLs with proper M-Pesa format
    const tests = []
    
    for (const [type, url] of Object.entries(callbackUrls)) {
      try {
        console.log(`Testing ${type} callback: ${url}`)
        
        // Simulate M-Pesa callback format
        const mpesaCallback = {
          Result: {
            ResultType: 0,
            ResultCode: 0,
            ResultDesc: "The service request is processed successfully.",
            OriginatorConversationID: "test-originator-id",
            ConversationID: "AG_20250913_verification_test",
            TransactionID: "test-transaction-id",
            ResultParameters: {
              ResultParameter: [
                { Key: "TransactionAmount", Value: "10" },
                { Key: "TransactionReceipt", Value: "test-receipt-verification" },
                { Key: "ReceiverPartyPublicName", Value: "254727638940" }
              ]
            }
          }
        }
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'M-Pesa'
          },
          body: JSON.stringify(mpesaCallback)
        })
        
        const responseText = await response.text()
        
        tests.push({
          type: type,
          url: url,
          status: response.status,
          accessible: response.ok,
          response: responseText,
          error: null
        })
        
        console.log(`${type} callback test: ${response.status} ${response.ok ? 'OK' : 'FAILED'}`)
        
      } catch (error) {
        tests.push({
          type: type,
          url: url,
          status: null,
          accessible: false,
          response: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        
        console.error(`${type} callback test failed:`, error)
      }
    }

    return NextResponse.json({
      message: 'Callback URL verification completed for Safaricom',
      timestamp: new Date().toISOString(),
      callback_urls: callbackUrls,
      tests: tests,
      summary: {
        total: tests.length,
        accessible: tests.filter(t => t.accessible).length,
        failed: tests.filter(t => !t.accessible).length
      },
      safaricom_requirements: {
        minimum_amount: "10 KES",
        callback_confirmation: "Required",
        result_url: callbackUrls.result,
        timeout_url: callbackUrls.timeout
      }
    })

  } catch (error) {
    console.error('❌ Callback verification failed:', error)
    return NextResponse.json({
      error: 'Callback verification failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
