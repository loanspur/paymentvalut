// Test webhook on deployed Vercel application
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testVercelWebhook() {
  console.log('🧪 Testing Webhook on Vercel...');
  
  // Your deployed Vercel URL
  const vercelUrl = 'https://paymentvalut-ju.vercel.app';
  const webhookUrl = `${vercelUrl}/api/mifos/webhook/loan-approval`;
  
  console.log(`📡 Testing webhook URL: ${webhookUrl}`);
  
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
    console.log('📤 Sending webhook payload to Vercel...');
    console.log('Payload:', JSON.stringify(webhookPayload, null, 2));
    
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
      console.log('🔍 Check your Vercel application:');
      console.log(`   - Loan Tracking: ${vercelUrl}/loan-tracking`);
      console.log(`   - Partners: ${vercelUrl}/partners`);
    } else {
      console.log('❌ Webhook test failed');
      console.log('Error details:', responseText);
    }

  } catch (error) {
    console.error('❌ Webhook test error:', error.message);
  }
}

// Run the test
testVercelWebhook();
