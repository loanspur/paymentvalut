// Test script to simulate a loan approval webhook from Mifos X
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testLoanApprovalWebhook() {
  console.log('🧪 Testing Loan Approval Webhook...');
  
  // Your webhook URL (update this to your actual deployed URL)
  const webhookUrl = 'http://localhost:3000/api/mifos/webhook/loan-approval';
  
  // Simulate the actual Mifos X webhook payload
  const webhookPayload = {
    officeId: 1,
    clientId: 1,
    loanId: 12345,
    resourceId: 12345,
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
      approvedOnDate: "22 October 2025",
      expectedDisbursementDate: "23 October 2025"
    }
  };

  try {
    console.log('📤 Sending webhook payload:', JSON.stringify(webhookPayload, null, 2));
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MifosX-Webhook/1.0'
      },
      body: JSON.stringify(webhookPayload)
    });

    console.log('📥 Webhook response status:', response.status);
    
    const responseText = await response.text();
    console.log('📥 Webhook response body:', responseText);

    if (response.ok) {
      console.log('✅ Webhook test successful!');
      console.log('🔍 Check your database for:');
      console.log('   - New disbursement record in disbursements table');
      console.log('   - Webhook delivery log in webhook_delivery_logs table');
      console.log('   - Any error logs in the console');
    } else {
      console.log('❌ Webhook test failed');
      console.log('Error details:', responseText);
    }

  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
  }
}

// Run the test
testLoanApprovalWebhook();
