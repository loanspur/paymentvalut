require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testProductionFix() {
  console.log('🧪 Testing Production NCBA Notification Fix...');
  console.log('==============================================');

  const notificationEndpoint = 'https://eazzypay.online/api/ncba/paybill-notification';

  // Actual NCBA notification data from your logs
  const actualNotification = {
    "TransType": "Pay Bill",
    "TransID": "TJR678LW1Y",
    "FTRef": "FTC251027OBBE",
    "TransTime": "20251027181033",
    "TransAmount": "5.0",
    "BusinessShortCode": "880100",
    "BillRefNumber": "774451",
    "Narrative": "UMOJA",
    "Mobile": "254727638940",
    "name": "JUSTUS MURENGA WANJALA",
    "Username": "paymentvault",
    "Password": "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
    "Hash": "ZDQxNWFmNDZmZDYyMzcwMzlhMzFlNWYwYjdjNWY0NDkzNDg0MzQ3ODFlN2IwNjhhNTQxY2M4OTUxMTc4YjRhMQ=="
  };

  console.log('📤 Sending actual NCBA notification to production...');
  console.log('Transaction ID:', actualNotification.TransID);
  console.log('Amount:', actualNotification.TransAmount);
  console.log('Partner:', actualNotification.Narrative);

  try {
    const response = await fetch(notificationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actualNotification),
    });

    const responseData = await response.json();

    console.log('\n📥 Response from production notification handler:');
    console.log('Status:', response.status);
    console.log('Response:', responseData);

    if (response.ok && responseData.ResultCode === "0") {
      console.log('✅ SUCCESS! Notification processing worked!');
      console.log('🎉 The hash validation fix is working on production!');
    } else {
      console.error('❌ FAILED! Notification processing still has issues.');
      console.error('This suggests the deployment may not have completed yet or there are other issues.');
    }

  } catch (error) {
    console.error('Fatal error sending test notification:', error);
  }
}

testProductionFix();
