// Debug the exact OTP SMS flow to see what's happening
require('dotenv').config();
const crypto = require('crypto');

// Simulate the exact OTP SMS flow
async function debugOTPSMSFlow() {
  try {
    console.log('🔍 Debugging OTP SMS Flow...');
    console.log('==============================');
    
    // Get credentials (same as OTP system)
    const username = process.env.SUPER_ADMIN_SMS_USERNAME;
    const apiKey = process.env.SUPER_ADMIN_SMS_API_KEY;
    const senderId = process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault';
    
    console.log('📱 OTP System Credentials:');
    console.log('Username:', username);
    console.log('API Key:', apiKey);
    console.log('Sender ID:', senderId);
    console.log('');
    
    // Check for test mode conditions (same as SMS campaigns)
    const isTestMode = !username || !apiKey || username.includes('test') || apiKey.includes('test') || username === '***encrypted***' || apiKey === '***encrypted***';
    
    console.log('🧪 Test Mode Detection:');
    console.log('!username:', !username);
    console.log('!apiKey:', !apiKey);
    console.log('username.includes("test"):', username?.includes('test'));
    console.log('apiKey.includes("test"):', apiKey?.includes('test'));
    console.log('username === "***encrypted***":', username === '***encrypted***');
    console.log('apiKey === "***encrypted***":', apiKey === '***encrypted***');
    console.log('isTestMode:', isTestMode);
    console.log('');
    
    if (isTestMode) {
      console.log('⚠️  TEST MODE DETECTED!');
      console.log('The OTP system would simulate SMS sending instead of sending real SMS.');
      console.log('This explains why you see "SUCCESS" but don\'t receive SMS.');
      return;
    }
    
    // If not in test mode, proceed with real SMS
    console.log('✅ Not in test mode, proceeding with real SMS...');
    
    // Test phone number
    const testPhone = '254726056444';
    const testMessage = 'OTP DEBUG TEST: This is a real SMS from the OTP system. If you receive this, the OTP SMS is working correctly.';
    
    // Format phone number (same as OTP system)
    let formattedPhone = testPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Create MD5 hash (same as OTP system)
    const md5Hash = crypto.createHash('md5').update(apiKey).digest('hex');
    
    // Generate unique SMS ID (same as OTP system)
    const smsId = `OTP_DEBUG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // AirTouch API URL (same as OTP system)
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/';
    
    // Build GET request URL with parameters (same as OTP system)
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: testMessage,
      username: username,
      password: md5Hash,
      sms_id: smsId
    });
    
    const getUrl = `${apiUrl}?${params.toString()}`;
    
    console.log('📱 Sending OTP Debug SMS...');
    console.log('Phone:', formattedPhone);
    console.log('Sender ID:', senderId);
    console.log('MD5 Hash:', md5Hash);
    console.log('SMS ID:', smsId);
    console.log('');
    
    const response = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('📱 AirTouch API Response:', data);

    if (response.ok && data.status_code === '1000') {
      console.log('✅ OTP Debug SMS sent successfully!');
      console.log('Message ID:', data.message_id || smsId);
      console.log('');
      console.log('📱 CHECK YOUR PHONE!');
      console.log('You should receive the OTP debug SMS.');
      console.log('If you receive it, the OTP system is working correctly.');
    } else {
      console.log('❌ OTP Debug SMS failed:');
      console.log('Error:', data.status_desc || `API Error: ${data.status_code}`);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugOTPSMSFlow();


