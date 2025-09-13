import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { webhook_url, message } = await request.json()
    
    if (!webhook_url) {
      return NextResponse.json({ 
        error: 'Missing webhook_url' 
      }, { status: 400 })
    }

    const testMessage = message || {
      text: "🧪 **M-Pesa Balance Monitoring Test**",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🧪 *M-Pesa Balance Monitoring Test*\n\nThis is a test message to verify Slack integration is working correctly.\n\n✅ *Test Details:*\n• Timestamp: " + new Date().toISOString() + "\n• Source: M-Pesa Balance Monitoring System\n• Status: Test Successful"
          }
        },
        {
          type: "divider"
        },
        {
          type: "context",
          elements: [
            {
              type: "mrkdwn",
              text: "If you receive this message, your Slack webhook is configured correctly! 🎉"
            }
          ]
        }
      ]
    }

    console.log('🔗 Testing Slack webhook:', webhook_url)
    console.log('📤 Sending test message:', JSON.stringify(testMessage, null, 2))

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Slack webhook error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'Slack webhook failed', 
        status: response.status,
        details: errorText
      }, { status: 500 })
    }

    const responseText = await response.text()
    console.log('✅ Slack webhook success:', response.status, responseText)

    return NextResponse.json({
      message: 'Slack test message sent successfully',
      webhook_url: webhook_url,
      status: response.status,
      response: responseText,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error testing Slack:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const webhook_url = searchParams.get('webhook_url')
    
    if (!webhook_url) {
      return NextResponse.json({ 
        error: 'Missing webhook_url parameter' 
      }, { status: 400 })
    }

    // Send a simple test message
    const testMessage = {
      text: "🧪 M-Pesa Balance Monitoring Test",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: "🧪 *M-Pesa Balance Monitoring Test*\n\nThis is a test message to verify Slack integration is working correctly.\n\n✅ *Test Details:*\n• Timestamp: " + new Date().toISOString() + "\n• Source: M-Pesa Balance Monitoring System\n• Status: Test Successful"
          }
        }
      ]
    }

    console.log('🔗 Testing Slack webhook:', webhook_url)

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testMessage)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Slack webhook error:', response.status, errorText)
      return NextResponse.json({ 
        error: 'Slack webhook failed', 
        status: response.status,
        details: errorText
      }, { status: 500 })
    }

    const responseText = await response.text()
    console.log('✅ Slack webhook success:', response.status, responseText)

    return NextResponse.json({
      message: 'Slack test message sent successfully',
      webhook_url: webhook_url,
      status: response.status,
      response: responseText,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Error testing Slack:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
