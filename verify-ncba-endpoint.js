// Comprehensive NCBA endpoint verification and troubleshooting
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function verifyNCBAEndpoint() {
  console.log('🔍 Comprehensive NCBA endpoint verification...');
  console.log('==============================================');

  try {
    // 1. Test local endpoint
    console.log('1️⃣ Testing local endpoint (localhost:3000)...');
    try {
      const localResponse = await fetch('http://localhost:3000/api/ncba/paybill-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'local' })
      });
      
      console.log(`   ✅ Local endpoint accessible: ${localResponse.status} ${localResponse.statusText}`);
      const localData = await localResponse.json();
      console.log(`   Response: ${JSON.stringify(localData)}`);
    } catch (error) {
      console.log(`   ❌ Local endpoint error: ${error.message}`);
    }
    console.log('');

    // 2. Test production endpoint
    console.log('2️⃣ Testing production endpoint (eazzypay.online)...');
    try {
      const prodResponse = await fetch('https://eazzypay.online/api/ncba/paybill-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: 'production' })
      });
      
      console.log(`   ✅ Production endpoint accessible: ${prodResponse.status} ${prodResponse.statusText}`);
      const prodData = await prodResponse.json();
      console.log(`   Response: ${JSON.stringify(prodData)}`);
    } catch (error) {
      console.log(`   ❌ Production endpoint error: ${error.message}`);
      console.log(`   This could be why NCBA notifications are not reaching your system!`);
    }
    console.log('');

    // 3. Test with real NCBA notification format on production
    console.log('3️⃣ Testing production endpoint with NCBA notification format...');
    try {
      const ncbaTestNotification = {
        TransType: "Pay Bill",
        TransID: "TEST_" + Date.now(),
        TransTime: "20251027170000",
        TransAmount: "10.00",
        BusinessShortCode: "880100",
        BillRefNumber: "774451 UMOJA",
        Mobile: "254727638940",
        name: "TEST USER",
        Username: "paymentvault",
        Password: "QWERTYUIOPLKJHGFDSAqwertyuioplkjhgfdsa123432",
        Hash: "test_hash"
      };

      const ncbaResponse = await fetch('https://eazzypay.online/api/ncba/paybill-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ncbaTestNotification)
      });
      
      console.log(`   Status: ${ncbaResponse.status} ${ncbaResponse.statusText}`);
      const ncbaData = await ncbaResponse.json();
      console.log(`   Response: ${JSON.stringify(ncbaData)}`);
      
      if (ncbaResponse.status === 200) {
        console.log('   ✅ Production endpoint is working correctly!');
      } else {
        console.log('   ❌ Production endpoint has issues!');
      }
    } catch (error) {
      console.log(`   ❌ NCBA test failed: ${error.message}`);
    }
    console.log('');

    // 4. Check if server is running and accessible
    console.log('4️⃣ Checking server status...');
    try {
      const healthResponse = await fetch('https://eazzypay.online/api/health', {
        method: 'GET'
      });
      
      console.log(`   ✅ Health endpoint accessible: ${healthResponse.status}`);
      const healthData = await healthResponse.json();
      console.log(`   Health status: ${JSON.stringify(healthData)}`);
    } catch (error) {
      console.log(`   ❌ Health check failed: ${error.message}`);
      console.log(`   This suggests the server might not be running or accessible!`);
    }
    console.log('');

    // 5. Test with different HTTP methods
    console.log('5️⃣ Testing different HTTP methods...');
    const methods = ['GET', 'POST', 'PUT', 'OPTIONS'];
    
    for (const method of methods) {
      try {
        const response = await fetch('https://eazzypay.online/api/ncba/paybill-notification', {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        console.log(`   ${method}: ${response.status} ${response.statusText}`);
      } catch (error) {
        console.log(`   ${method}: Error - ${error.message}`);
      }
    }
    console.log('');

    // 6. Summary and recommendations
    console.log('📋 ENDPOINT VERIFICATION SUMMARY:');
    console.log('==================================');
    console.log('');
    console.log('🔍 POSSIBLE ISSUES:');
    console.log('==================');
    console.log('1. Production server might not be running');
    console.log('2. Domain eazzypay.online might not be accessible');
    console.log('3. SSL certificate issues');
    console.log('4. Firewall blocking NCBA requests');
    console.log('5. Server configuration issues');
    console.log('');
    console.log('🔧 IMMEDIATE ACTIONS:');
    console.log('=====================');
    console.log('1. Check if your production server is running');
    console.log('2. Verify domain eazzypay.online is accessible');
    console.log('3. Check server logs for incoming requests');
    console.log('4. Test with a different external service');
    console.log('5. Contact your hosting provider');
    console.log('');
    console.log('💡 DEBUGGING STEPS:');
    console.log('===================');
    console.log('1. Run: curl -X POST https://eazzypay.online/api/ncba/paybill-notification');
    console.log('2. Check server logs: pm2 logs or docker logs');
    console.log('3. Verify DNS resolution: nslookup eazzypay.online');
    console.log('4. Test SSL: openssl s_client -connect eazzypay.online:443');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyNCBAEndpoint();
