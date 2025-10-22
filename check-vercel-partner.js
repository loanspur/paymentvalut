// Check partner configuration on Vercel deployment
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkVercelPartner() {
  console.log('🔍 Checking partner configuration on Vercel...');
  
  const vercelUrl = 'https://paymentvalut-ju.vercel.app';
  
  try {
    // Test the webhook endpoint
    console.log('📡 Testing webhook endpoint...');
    const webhookResponse = await fetch(`${vercelUrl}/api/mifos/webhook/loan-approval`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        officeId: 1,
        clientId: 1,
        loanId: 99999,
        resourceId: 99999,
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
      })
    });

    const webhookResult = await webhookResponse.text();
    console.log('📥 Webhook response:', webhookResult);

    // Test the health endpoint
    console.log('\n🏥 Testing health endpoint...');
    const healthResponse = await fetch(`${vercelUrl}/api/health`);
    const healthResult = await healthResponse.text();
    console.log('📥 Health response:', healthResult);

    console.log('\n📋 Next steps:');
    console.log('1. Go to your deployed app: https://paymentvalut-ju.vercel.app');
    console.log('2. Navigate to Partners page');
    console.log('3. Edit your partner');
    console.log('4. Enable Mifos X Integration');
    console.log('5. Fill in all Mifos X credentials');
    console.log('6. Save the partner');
    console.log('7. Test the connection');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkVercelPartner();
