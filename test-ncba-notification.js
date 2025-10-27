// Test NCBA notification handler with sample data from the email
require('dotenv').config();

async function testNCBANotification() {
  console.log('🧪 Testing NCBA notification handler...');
  console.log('=====================================');

  try {
    // Sample notification data based on the email
    const sampleNotification = {
      TransType: "Pay Bill",
      TransID: "TJR678LH5T",
      TransTime: "20251027161400",
      TransAmount: "5.00",
      BusinessShortCode: "880100",
      BillRefNumber: "774451 UMOJA",
      Mobile: "254727638940",
      name: "JUSTUS MURENGA",
      Username: "paymentvault",
      Password: "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
      Hash: "sample_hash_here" // This would be the actual hash from NCBA
    };

    console.log('📤 Sending test notification to NCBA handler...');
    console.log('Sample notification data:');
    console.log(JSON.stringify(sampleNotification, null, 2));
    console.log('');

    // Send POST request to the notification handler
    const response = await fetch('http://localhost:3000/api/ncba/paybill-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sampleNotification)
    });

    const responseData = await response.json();
    
    console.log('📥 Response from notification handler:');
    console.log(`Status: ${response.status}`);
    console.log(`Response:`, JSON.stringify(responseData, null, 2));
    console.log('');

    if (response.ok && responseData.ResultCode === "0") {
      console.log('✅ Notification processed successfully!');
      console.log('');
      console.log('🔍 Now checking if the transaction was recorded...');
      
      // Check if C2B transaction was created
      const c2bResponse = await fetch('http://localhost:3000/api/c2b/transactions?search=TJR678LH5T&limit=5');
      if (c2bResponse.ok) {
        const c2bData = await c2bResponse.json();
        console.log(`📊 Found ${c2bData.data?.length || 0} C2B transactions with reference TJR678LH5T`);
        if (c2bData.data && c2bData.data.length > 0) {
          console.log('✅ C2B transaction was created!');
          console.log('Transaction details:', JSON.stringify(c2bData.data[0], null, 2));
        }
      }

      // Check if wallet was credited
      const walletResponse = await fetch('http://localhost:3000/api/wallet/balance?partner_id=c0bf511b-b197-46e8-ac28-a4231772c8d2');
      if (walletResponse.ok) {
        const walletData = await walletResponse.json();
        console.log(`💰 UMOJA wallet balance: KES ${walletData.balance}`);
      }

    } else {
      console.log('❌ Notification processing failed!');
      console.log('This suggests there may be other issues with the notification handler.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('');
    console.log('💡 This might be because:');
    console.log('1. The server is not running on localhost:3000');
    console.log('2. The notification handler has other validation issues');
    console.log('3. The hash validation is failing');
  }
}

// Run the test
testNCBANotification();
