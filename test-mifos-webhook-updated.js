// Test the updated Mifos X webhook handler with the actual payload structure
const https = require('https')

// The actual payload structure captured from webhook.site
const actualMifosPayload = {
  "officeId": 2,
  "clientId": 2,
  "loanId": 3198,
  "resourceId": 3198,
  "changes": {
    "status": {
      "id": 200,
      "code": "loanStatusType.approved",
      "value": "Approved",
      "pendingApproval": false,
      "waitingForDisbursal": true,
      "active": false,
      "closedObligationsMet": false,
      "closedWrittenOff": false,
      "closedRescheduled": false,
      "closed": false,
      "overpaid": false
    },
    "locale": "en",
    "dateFormat": "dd MMMM yyyy",
    "approvedOnDate": "22 October 2025",
    "expectedDisbursementDate": {}
  }
}

async function testUpdatedWebhookHandler() {
  console.log('🧪 Testing Updated Mifos X Webhook Handler')
  console.log('==========================================')
  console.log('')
  
  // Test with your deployed webhook URL
  const webhookUrl = 'https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval'
  
  console.log('📡 Testing webhook URL:', webhookUrl)
  console.log('📋 Payload:', JSON.stringify(actualMifosPayload, null, 2))
  console.log('')
  
  try {
    const url = new URL(webhookUrl)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mifos-X-Webhook/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log(`📥 Response Status: ${res.statusCode}`)
        console.log(`📋 Response Headers:`, res.headers)
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data)
            console.log('📄 Response Body:', JSON.stringify(responseData, null, 2))
            resolve({ status: res.statusCode, data: responseData })
          } catch (e) {
            console.log('📄 Raw Response:', data)
            resolve({ status: res.statusCode, data })
          }
        })
      })

      req.on('error', (error) => {
        console.error('❌ Request error:', error.message)
        reject(error)
      })

      req.write(JSON.stringify(actualMifosPayload))
      req.end()
    })

    console.log('')
    if (response.status === 200) {
      console.log('✅ Webhook test successful!')
      console.log('📋 Response:', response.data)
      
      if (response.data.requiresManualProcessing) {
        console.log('')
        console.log('ℹ️  Manual processing required - this is expected!')
        console.log('📋 Next steps:')
        response.data.nextSteps?.forEach((step, index) => {
          console.log(`   ${index + 1}. ${step}`)
        })
      }
    } else {
      console.log('❌ Webhook test failed with status:', response.status)
      console.log('📋 Error:', response.data)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testUpdatedWebhookHandler()
