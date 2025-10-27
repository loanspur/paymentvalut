require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testFailedTransaction() {
  console.log('🧪 Testing the failed transaction fix...');
  console.log('=====================================');

  const notificationEndpoint = 'http://localhost:3000/api/ncba/paybill-notification';

  // Exact data from the failed transaction log
  const testNotification = {
    "TransType": "Pay Bill",
    "TransID": "TJR678M4TL",
    "FTRef": "FTC251027PHHJ",
    "TransTime": "20251027190952",
    "TransAmount": "2.0",
    "BusinessShortCode": "880100",
    "BillRefNumber": "774451",
    "Narrative": "umoja", // This was lowercase in the original notification
    "Mobile": "254727638940",
    "name": "JUSTUS MURENGA WANJALA",
    "Username": "paymentvault",
    "Password": "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
    "Hash": "MDdiZGM1Mzg2NjZiZWE2MTA3M2VkN2FhNmRlNjY1YzFhNWMzMzU5ZTlmMWQyNWNiMTdjNmRmYzE3MDhhZTlkYQ=="
  };

  console.log('📤 Sending test notification with lowercase "umoja"...');
  console.log('Sample notification data:', JSON.stringify(testNotification, null, 2));

  try {
    const response = await fetch(notificationEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testNotification),
    });

    const responseData = await response.json();

    console.log('\n📥 Response from notification handler:');
    console.log('Status:', response.status);
    console.log('Response:', responseData);

    if (response.ok && responseData.ResultCode === "0") {
      console.log('✅ Notification processing successful!');
      console.log('🎉 The case-insensitive fix worked!');
    } else {
      console.error('❌ Notification processing failed!');
      console.error('This suggests there may be other issues.');
    }

  } catch (error) {
    console.error('Fatal error sending test notification:', error);
  }
}

testFailedTransaction();
