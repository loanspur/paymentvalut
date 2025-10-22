// Quick test script to verify webhook configuration
const https = require('https')

const webhookUrl = 'https://paymentvalut-ju.vercel.app/api/mifos/webhook/loan-approval'

async function quickWebhookTest() {
  console.log('🧪 Quick Webhook Test')
  console.log('=' .repeat(50))
  console.log('📡 Testing webhook endpoint...')
  console.log('URL:', webhookUrl)
  console.log('')

  try {
    const samplePayload = {
      officeId: 1,
      clientId: 1,
      loanId: 9999, // Test loan ID
      resourceId: 9999,
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

    const url = new URL(webhookUrl)
    const postData = JSON.stringify(samplePayload)
    
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'MifosX-Webhook-Test/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
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
    console.log('📊 Response Body:', response.body)

    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('✅ Webhook endpoint is working correctly!')
      console.log('')
      console.log('🎯 Next Steps:')
      console.log('1. Configure webhook in Mifos X admin panel')
      console.log('2. Approve a real loan in Mifos X')
      console.log('3. Monitor Vercel logs for webhook activity')
      console.log('4. Check loan tracking dashboard for new records')
    } else {
      console.log('❌ Webhook endpoint returned error:', response.statusCode)
    }

  } catch (error) {
    console.error('❌ Error testing webhook:', error.message)
  }
}

quickWebhookTest()
