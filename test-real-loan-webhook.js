// Test webhook with a real loan ID from your Mifos X system
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testRealLoanWebhook() {
  console.log('🧪 Testing Webhook with Real Loan ID...');
  
  const vercelUrl = 'https://paymentvalut-ju.vercel.app';
  const webhookUrl = `${vercelUrl}/api/mifos/webhook/loan-approval`;
  
  // Using your real loan data
  const realLoanId = 3198; // Your approved loan ID
  const realClientId = 1; // We'll need to find the actual client ID
  const realOfficeId = 1; // We'll need to find the actual office ID
  
  console.log(`📡 Testing with Loan ID: ${realLoanId}, Client ID: ${realClientId}, Office ID: ${realOfficeId}`);
  
  const webhookPayload = {
    officeId: realOfficeId,
    clientId: realClientId,
    loanId: realLoanId,
    resourceId: realLoanId,
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
    console.log('📤 Sending webhook payload...');
    
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
      console.log('🔍 Check your Loan Tracking dashboard:');
      console.log(`   ${vercelUrl}/loan-tracking`);
    } else {
      console.log('❌ Webhook test failed');
      console.log('Error details:', responseText);
    }

  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
  }
}

// Instructions
console.log('📋 INSTRUCTIONS:');
console.log('1. Go to your Mifos X system: https://system.loanspur.com');
console.log('2. Find a real loan and note its ID, Client ID, and Office ID');
console.log('3. Update the variables in this script:');
console.log('   - realLoanId: Replace 123 with actual loan ID');
console.log('   - realClientId: Replace 456 with actual client ID');
console.log('   - realOfficeId: Replace 1 with actual office ID');
console.log('4. Run: node test-real-loan-webhook.js');
console.log('');

// Run the test
testRealLoanWebhook();
