// Test the webhook handler locally
const http = require('http')

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

// Simulate the webhook handler logic locally
function simulateWebhookHandler(payload) {
  console.log('🧪 Simulating Webhook Handler Logic')
  console.log('===================================')
  console.log('')
  
  // Extract data from the actual Mifos X payload structure
  const { officeId, clientId, loanId, resourceId, changes } = payload

  // Validate required fields
  if (!loanId || !clientId || !officeId) {
    console.error('❌ Missing required fields:', { loanId, clientId, officeId })
    return {
      success: false,
      error: 'Missing required fields: loanId, clientId, or officeId',
      status: 400
    }
  }

  // Check if this is a loan approval
  const status = changes?.status
  if (!status || status.value !== 'Approved') {
    console.log('ℹ️ Not a loan approval webhook, ignoring')
    return {
      success: true,
      message: 'Not a loan approval webhook',
      status: 200
    }
  }

  // Check if waiting for disbursal
  if (!status.waitingForDisbursal) {
    console.log('ℹ️ Loan approved but not waiting for disbursal, ignoring')
    return {
      success: true,
      message: 'Loan not waiting for disbursal',
      status: 200
    }
  }

  console.log('✅ Valid loan approval webhook received')
  console.log('📊 Loan Details:', {
    loanId,
    clientId,
    officeId,
    approvedDate: changes.approvedOnDate,
    status: status.value
  })

  // Return success but indicate manual processing is needed
  return {
    success: true,
    message: 'Webhook received successfully. Manual processing required to fetch loan details from Mifos X API.',
    loanId,
    clientId,
    officeId,
    approvedDate: changes.approvedOnDate,
    requiresManualProcessing: true,
    nextSteps: [
      'Fetch loan details from Mifos X API using loanId',
      'Get client phone number from clientId',
      'Get loan amount and product information',
      'Process disbursement with complete data'
    ],
    status: 200
  }
}

// Test the simulation
console.log('📋 Testing with actual Mifos X payload:')
console.log(JSON.stringify(actualMifosPayload, null, 2))
console.log('')

const result = simulateWebhookHandler(actualMifosPayload)

console.log('')
console.log('📄 Webhook Handler Result:')
console.log(JSON.stringify(result, null, 2))

if (result.success && result.requiresManualProcessing) {
  console.log('')
  console.log('✅ Webhook handler logic is working correctly!')
  console.log('📋 Next steps:')
  result.nextSteps.forEach((step, index) => {
    console.log(`   ${index + 1}. ${step}`)
  })
}
