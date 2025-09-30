import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { webhook_url, channel } = await request.json()

    if (!webhook_url) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      )
    }

    const testMessage = {
      channel: channel || '#mpesa-alerts',
      username: 'M-Pesa Monitor',
      icon_emoji: ':money_with_wings:',
      text: '🧪 **Test Message from M-Pesa Monitoring System**',
      attachments: [
        {
          color: 'good',
          fields: [
            {
              title: 'Test Status',
              value: '✅ Slack webhook is working correctly',
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date().toLocaleString(),
              short: true
            },
            {
              title: 'System',
              value: 'M-Pesa B2C Transaction Monitoring',
              short: false
            }
          ],
          footer: 'M-Pesa Vault System',
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    const response = await fetch(webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testMessage)
    })

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: 'Test message sent successfully to Slack'
      })
    } else {
      const errorText = await response.text()
      return NextResponse.json(
        { 
          error: 'Failed to send test message to Slack',
          details: errorText
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error testing Slack webhook:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
