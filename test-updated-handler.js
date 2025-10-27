// Test the updated NCBA notification handler with actual data
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testUpdatedNotificationHandler() {
  console.log('🧪 Testing updated NCBA notification handler...');
  console.log('==============================================');

  try {
    // Actual NCBA notification data from the server logs
    const actualNotification = {
      "TransType": "Pay Bill",
      "TransID": "TJR678LTWF",
      "FTRef": "FTC251027NYHH",
      "TransTime": "20251027180517",
      "TransAmount": "4.0",
      "BusinessShortCode": "880100",
      "BillRefNumber": "774451",
      "Narrative": "UMOJA",
      "Mobile": "254727638940",
      "name": "JUSTUS MURENGA WANJALA",
      "Username": "paymentvault",
      "Password": "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
      "Hash": "Y2U1NTk2MjcyZjRhYzJlMjBmMzhkODBmY2E3NzJmZjk0NmNlMGQyY2E5OGMwZTg2OTg4ZTQ1ZmMzYWNmOTJjYQ=="
    };

    console.log('📤 Sending actual NCBA notification to updated handler...');
    console.log('Notification data:', JSON.stringify(actualNotification, null, 2));
    console.log('');

    const response = await fetch('http://localhost:3000/api/ncba/paybill-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actualNotification)
    });

    const responseData = await response.json();
    
    console.log('📥 Response from updated notification handler:');
    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response:`, JSON.stringify(responseData, null, 2));
    console.log('');

    if (response.ok && responseData.ResultCode === "0") {
      console.log('✅ Notification processing successful!');
      console.log('✅ Transaction should now be in the database');
    } else {
      console.log('❌ Notification processing failed!');
      console.log('❌ Check the error message above');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testUpdatedNotificationHandler();
