import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔔 M-Pesa validation callback received')
    
    const validationData = await request.json()
    console.log('Validation data:', JSON.stringify(validationData, null, 2))

    // For B2C validation, we typically accept all transactions
    // You can add validation logic here if needed (e.g., check amounts, phone numbers, etc.)
    
    const response = {
      ResultCode: 0,
      ResultDesc: "Accept the service request successfully."
    }

    console.log('✅ Validation callback processed:', response)
    return NextResponse.json(response, { status: 200 })

  } catch (error) {
    console.error('❌ Error processing validation callback:', error)
    
    // Return error response to M-Pesa
    const errorResponse = {
      ResultCode: 1,
      ResultDesc: "Reject the service request."
    }
    
    return NextResponse.json(errorResponse, { status: 200 })
  }
}
