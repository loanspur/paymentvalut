// Simulate Mifos X webhook payload for testing
const https = require('https')

// Common Mifos X webhook payload structures
const possiblePayloads = [
  // Structure 1: Simple format
  {
    id: 12345,
    accountNo: "000000123",
    status: {
      id: 300,
      code: "loanStatusType.approved",
      value: "Approved"
    },
    clientId: 67890,
    clientName: "John Doe",
    loanProductId: 1,
    loanProductName: "Personal Loan",
    principal: 5000,
    approvedPrincipal: 5000,
    currency: {
      code: "KES",
      name: "Kenyan Shilling"
    },
    timeline: {
      approvedOnDate: ["22", "10", "2024"],
      approvedByUsername: "admin"
    }
  },
  
  // Structure 2: Detailed format
  {
    loanId: 12345,
    loanAccountNo: "000000123",
    loanStatus: "APPROVED",
    clientId: 67890,
    clientName: "John Doe",
    clientPhone: "254712345678",
    productId: 1,
    productName: "Personal Loan",
    loanAmount: 5000,
    currency: "KES",
    approvedDate: "2024-10-22T10:30:00Z",
    approvedBy: "admin",
    interestRate: 12.5,
    termInMonths: 12
  },
  
  // Structure 3: Minimal format
  {
    loanId: 12345,
    clientId: 67890,
    amount: 5000,
    status: "approved",
    approvedAt: "2024-10-22T10:30:00Z"
  }
]

async function testWebhookWithPayload(payload, webhookUrl) {
  console.log(`🧪 Testing webhook with payload structure ${payloads.indexOf(payload) + 1}`)
  console.log('Payload:', JSON.stringify(payload, null, 2))
  
  const url = new URL(webhookUrl)
  const options = {
    hostname: url.hostname,
    port: url.port || (url.protocol === 'https:' ? 443 : 80),
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mifos-X-Webhook/1.0',
      'X-Mifos-Event': 'loan.approved'
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`📥 Response Status: ${res.statusCode}`)
      
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data)
          console.log('📄 Response:', JSON.stringify(responseData, null, 2))
        } catch (e) {
          console.log('📄 Raw Response:', data)
        }
        resolve({ status: res.statusCode, data })
      })
    })

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message)
      reject(error)
    })

    req.write(JSON.stringify(payload))
    req.end()
  })
}

async function testAllPayloadStructures() {
  console.log('🔍 Testing Different Mifos X Webhook Payload Structures')
  console.log('====================================================')
  console.log('')
  
  // Test with webhook.site URL (replace with your actual URL)
  const webhookUrl = 'https://webhook.site/12345678-1234-1234-1234-123456789abc'
  
  console.log('📋 Testing with webhook.site URL:', webhookUrl)
  console.log('')
  
  for (let i = 0; i < possiblePayloads.length; i++) {
    try {
      await testWebhookWithPayload(possiblePayloads[i], webhookUrl)
      console.log('')
      
      if (i < possiblePayloads.length - 1) {
        console.log('⏳ Waiting 2 seconds before next test...')
        await new Promise(resolve => setTimeout(resolve, 2000))
        console.log('')
      }
    } catch (error) {
      console.error('❌ Test failed:', error.message)
    }
  }
  
  console.log('✅ All payload structure tests completed!')
  console.log('')
  console.log('📋 Next Steps:')
  console.log('1. Check your webhook.site page to see which payload structure worked')
  console.log('2. Use the working structure to configure your Mifos X webhook')
  console.log('3. Test with a real loan approval in Mifos X')
}

// Instructions
console.log('🔍 Mifos X Webhook Payload Testing Tool')
console.log('=====================================')
console.log('')
console.log('This tool will test different possible webhook payload structures')
console.log('that Mifos X might send when a loan is approved.')
console.log('')
console.log('📋 Setup Instructions:')
console.log('1. Go to https://webhook.site/')
console.log('2. Copy your unique webhook URL')
console.log('3. Update the webhookUrl variable in this script')
console.log('4. Run: node simulate-mifos-webhook.js')
console.log('')
console.log('🎯 What This Tests:')
console.log('- Different payload structures Mifos X might use')
console.log('- Field name variations (loanId vs id, etc.)')
console.log('- Data format differences')
console.log('')
console.log('📞 Current webhook URL:', 'https://webhook.site/12345678-1234-1234-1234-123456789abc')
console.log('')
console.log('⚠️  Update the webhookUrl variable above with your actual webhook.site URL!')
console.log('')

// Uncomment the line below to run the tests
// testAllPayloadStructures()

