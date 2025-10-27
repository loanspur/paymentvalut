require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function checkProductionStatus() {
  console.log('🔍 Checking Production Deployment Status...');
  console.log('===========================================');

  // Test a simple endpoint first to see if deployment is complete
  try {
    const healthResponse = await fetch('https://eazzypay.online/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Production server is responding:', healthData);
  } catch (error) {
    console.error('❌ Production server not responding:', error.message);
    return;
  }

  // Now test the NCBA notification endpoint
  const notificationEndpoint = 'https://eazzypay.online/api/ncba/paybill-notification';

  const testNotification = {
    "TransType": "Pay Bill",
    "TransID": "TEST123",
    "TransTime": "20251027181033",
    "TransAmount": "1.0",
    "BusinessShortCode": "880100",
    "BillRefNumber": "774451",
    "Narrative": "UMOJA",
    "Mobile": "254727638940",
    "name": "TEST USER",
    "Username": "paymentvault",
    "Password": "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
    "Hash": "test_hash"
  };

  console.log('\n📤 Testing NCBA notification endpoint...');
  
  try {
    const response = await fetch(notificationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testNotification),
    });

    const responseData = await response.json();

    console.log('📥 Response:');
    console.log('Status:', response.status);
    console.log('Response:', responseData);

    if (responseData.ResultDesc === 'Hash validation failed') {
      console.log('❌ Hash validation is still enabled - deployment not complete');
    } else if (responseData.ResultDesc === 'Partner not found') {
      console.log('✅ Hash validation is disabled! (Partner not found is expected for test data)');
    } else {
      console.log('✅ Hash validation appears to be disabled!');
    }

  } catch (error) {
    console.error('Error testing notification endpoint:', error);
  }
}

checkProductionStatus();
