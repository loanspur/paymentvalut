import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing M-Pesa callback simulation...')
    
    // Simulate a successful M-Pesa callback
    const mockCallback = {
      Result: {
        ResultType: 0,
        ResultCode: 0,
        ResultDesc: "The service request is processed successfully.",
        OriginatorConversationID: "AG_1757671748809_pq1l321mi",
        ConversationID: "AG_1757671748809_pq1l321mi",
        TransactionID: "NEF61H8J60",
        ResultParameters: {
          ResultParameter: [
            {
              Key: "TransactionReceipt",
              Value: "NEF61H8J60"
            },
            {
              Key: "TransactionAmount",
              Value: "10.00"
            },
            {
              Key: "B2CWorkingAccountAvailableFunds",
              Value: "50000.00"
            },
            {
              Key: "B2CUtilityAccountAvailableFunds",
              Value: "25000.00"
            },
            {
              Key: "B2CChargesPaidAccountAvailableFunds",
              Value: "5000.00"
            },
            {
              Key: "TransactionCompletedDateTime",
              Value: "12.09.2025 13:12:41"
            },
            {
              Key: "ReceiverPartyPublicName",
              Value: "254727638940 - John Doe"
            },
            {
              Key: "B2CRecipientIsRegisteredCustomer",
              Value: "Y"
            },
            {
              Key: "B2CChargesPaidAccountAvailableFunds",
              Value: "5000.00"
            },
            {
              Key: "B2CUtilityAccountAvailableFunds",
              Value: "25000.00"
            },
            {
              Key: "B2CWorkingAccountAvailableFunds",
              Value: "50000.00"
            }
          ]
        },
        ReferenceData: {
          ReferenceItem: {
            Key: "Occasion",
            Value: "37e77147-921d-4aba-9e0c-1664b8280469"
          }
        }
      }
    }
    
    // Send the mock callback to the M-Pesa result endpoint
    const callbackUrl = 'https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-result'
    
    console.log('Sending mock callback to:', callbackUrl)
    console.log('Callback data:', JSON.stringify(mockCallback, null, 2))
    
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(mockCallback)
    })
    
    const responseText = await response.text()
    
    return NextResponse.json({
      message: 'Mock callback sent',
      callback_url: callbackUrl,
      response_status: response.status,
      response_text: responseText,
      mock_callback: mockCallback
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
    return NextResponse.json({
      error: 'Failed to send mock callback',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
