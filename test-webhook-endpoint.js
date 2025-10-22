// Test script to verify webhook endpoint is accessible
const https = require('https')
const http = require('http')

const webhookUrl = 'https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval'

async function testWebhookEndpoint() {
  console.log('🔍 Testing webhook endpoint accessibility...')
  console.log('📡 URL:', webhookUrl)
  console.log('=' .repeat(60))

  try {
    // Test with a sample Mifos X webhook payload
    const samplePayload = {
      officeId: 1,
      clientId: 1,
      loanId: 3198, // Your loan ID
      resourceId: 3198,
      changes: {
        status: {
          id: 300,
          code: "loanStatusType.approved",
          value: "Approved",
          pendingApproval: false,
          waitingForDisbursal: true,
          active: false,
          closedObligationsMet: false,
          closedWrittenOff: false,
          closedRescheduled: false,
          closed: false,
          overpaid: false
        },
        locale: "en",
        dateFormat: "dd MMMM yyyy",
        approvedOnDate: "22 October 2024",
        expectedDisbursementDate: null
      }
    }

    console.log('📤 Sending test webhook payload...')
    console.log('Payload:', JSON.stringify(samplePayload, null, 2))

    const url = new URL(webhookUrl)
    const postData = JSON.stringify(samplePayload)
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'MifosX-Webhook/1.0'
      }
    }

    const client = url.protocol === 'https:' ? https : http

    const response = await new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: data
          })
        })
      })

      req.on('error', (error) => {
        reject(error)
      })

      req.write(postData)
      req.end()
    })

    console.log('📊 Response Status:', response.statusCode)
    console.log('📊 Response Headers:', response.headers)
    console.log('📊 Response Body:', response.body)

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Webhook endpoint is accessible and responding')
    } else {
      console.log('❌ Webhook endpoint returned error:', response.statusCode)
    }

  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error.message)
    
    if (error.code === 'ENOTFOUND') {
      console.log('💡 This suggests the domain is not accessible')
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 This suggests the server is not responding')
    }
  }
}

testWebhookEndpoint()
