// Test both sender IDs to see which one works
require('dotenv').config();
const crypto = require('crypto');

// Load environment variables
const username = process.env.SUPER_ADMIN_SMS_USERNAME;
const apiKey = process.env.SUPER_ADMIN_SMS_API_KEY;

async function testSenderID(senderId, testName) {
  try {
    console.log(`🧪 Testing ${testName} (Sender ID: ${senderId})...`);
    console.log('=====================================');
    
    // Test phone number
    const testPhone = '254726056444';
    const testMessage = `${testName} TEST: Testing sender ID ${senderId}. If you receive this, this sender ID is working.`;
    
    // Format phone number
    let formattedPhone = testPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Create MD5 hash
    const md5Hash = crypto.createHash('md5').update(apiKey).digest('hex');
    
    // Generate unique SMS ID
    const smsId = `${testName.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // AirTouch API URL
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/';
    
    // Build GET request URL with parameters
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: testMessage,
      username: username,
      password: md5Hash,
      sms_id: smsId
    });
    
    const getUrl = `${apiUrl}?${params.toString()}`;
    
    console.log(`📱 Sending SMS with ${senderId} sender ID...`);
    
    const response = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('📱 AirTouch API Response:', data);

    if (response.ok && data.status_code === '1000') {
      console.log(`✅ ${testName} SMS sent successfully!`);
      console.log('Message ID:', data.message_id || smsId);
      return { success: true, senderId, messageId: data.message_id || smsId };
    } else {
      console.log(`❌ ${testName} SMS sending failed:`);
      if (data.status_code === '1011' || data.status_desc === 'INVALID USER') {
        console.log('Error: Invalid AirTouch credentials.');
      } else if (data.status_code === '1004' || data.status_desc?.includes('BALANCE')) {
        console.log('Error: Insufficient AirTouch account balance.');
      } else if (data.status_code === '1001' || data.status_desc?.includes('SENDER')) {
        console.log('Error: Invalid sender ID. Sender ID not registered with AirTouch.');
      } else {
        console.log('Error:', data.status_desc || `API Error: ${data.status_code}`);
      }
      return { success: false, senderId, error: data.status_desc || data.status_code };
    }
    
  } catch (error) {
    console.error(`❌ ${testName} test failed:`, error);
    return { success: false, senderId, error: error.message };
  }
}

async function testBothSenderIDs() {
  console.log('🔍 Testing Both Sender IDs...');
  console.log('===============================');
  
  // Test LoanSpur (current OTP system)
  const loanSpurResult = await testSenderID('LoanSpur', 'LoanSpur');
  console.log('');
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test KulmanGroup (working SMS campaigns)
  const kulmanResult = await testSenderID('KulmanGroup', 'KulmanGroup');
  console.log('');
  
  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  console.log('LoanSpur (OTP System):', loanSpurResult.success ? '✅ SUCCESS' : '❌ FAILED');
  if (!loanSpurResult.success) {
    console.log('  Error:', loanSpurResult.error);
  }
  console.log('KulmanGroup (SMS Campaigns):', kulmanResult.success ? '✅ SUCCESS' : '❌ FAILED');
  if (!kulmanResult.success) {
    console.log('  Error:', kulmanResult.error);
  }
  
  console.log('');
  console.log('📱 CHECK YOUR PHONE!');
  console.log('You should receive SMS from the working sender ID.');
  console.log('If you receive SMS from KulmanGroup but not LoanSpur,');
  console.log('then we need to update the OTP system to use KulmanGroup sender ID.');
}

testBothSenderIDs();



