require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testTimestampFix() {
  console.log('🧪 Testing timestamp fix...');
  console.log('=====================================');

  const notificationEndpoint = 'http://localhost:3000/api/ncba/paybill-notification';

  // Test with a new transaction
  const testNotification = {
    "TransType": "Pay Bill",
    "TransID": "TEST_TIMESTAMP_FIX",
    "FTRef": "FTC251027TEST",
    "TransTime": "20251027193000", // 7:30 PM EAT
    "TransAmount": "1.0",
    "BusinessShortCode": "880100",
    "BillRefNumber": "774451",
    "Narrative": "umoja",
    "Mobile": "254727638940",
    "name": "TEST USER",
    "Username": "paymentvault",
    "Password": "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
    "Hash": "test_hash_here"
  };

  console.log('📤 Sending test notification...');
  console.log('Current UTC time:', new Date().toISOString());

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
      
      // Now check the database to see the timestamps
      console.log('\n🔍 Checking database timestamps...');
      
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      const { data: transaction, error } = await supabase
        .from('c2b_transactions')
        .select('created_at, transaction_time')
        .eq('transaction_id', 'TEST_TIMESTAMP_FIX')
        .single();
        
      if (!error && transaction) {
        console.log('📊 Database timestamps:');
        console.log('- Created At:', transaction.created_at);
        console.log('- Transaction Time:', transaction.transaction_time);
        
        // Test the frontend formatting
        const formatDate = (dateString) => {
          if (!dateString) return 'Invalid Date'
          
          // Handle NCBA timestamp format (YYYYMMDDhhmmss)
          if (dateString.length === 14 && /^\d{14}$/.test(dateString)) {
            const year = dateString.substring(0, 4)
            const month = dateString.substring(4, 6)
            const day = dateString.substring(6, 8)
            const hour = dateString.substring(8, 10)
            const minute = dateString.substring(10, 12)
            const second = dateString.substring(12, 14)
            
            const isoString = `${year}-${month}-${day}T${hour}:${minute}:${second}`
            return new Date(isoString).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Africa/Nairobi'
            })
          }
          
          // Handle regular ISO date strings
          return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Africa/Nairobi'
          })
        }
        
        console.log('\n🎨 Frontend formatting:');
        console.log('- Transaction Time:', formatDate(transaction.transaction_time));
        console.log('- Created At:', formatDate(transaction.created_at));
      }
    } else {
      console.error('❌ Notification processing failed!');
    }

  } catch (error) {
    console.error('Fatal error sending test notification:', error);
  }
}

testTimestampFix();
