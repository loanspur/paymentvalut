// Test real SMS sending (not test mode) to see if we get actual delivery
require('dotenv').config();
const crypto = require('crypto');

// Load environment variables
const username = process.env.SUPER_ADMIN_SMS_USERNAME;
const apiKey = process.env.SUPER_ADMIN_SMS_API_KEY;
const senderId = process.env.SUPER_ADMIN_SMS_SENDER_ID;

async function testRealSMSSending() {
  try {
    console.log('🧪 Testing REAL SMS Sending (No Test Mode)...');
    console.log('===============================================');
    
    // Test phone number
    const testPhone = '254726056444';
    const testMessage = 'REAL SMS TEST: This should be delivered to your phone. If you receive this, the SMS system is working correctly.';
    
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
    const smsId = `REAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
    
    console.log('📱 Sending REAL SMS to:', formattedPhone);
    console.log('📱 Sender ID:', senderId);
    console.log('📱 Username:', username);
    console.log('📱 API Key MD5:', md5Hash);
    console.log('📱 SMS ID:', smsId);
    console.log('📱 Message:', testMessage);
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
      console.log('✅ SMS sent successfully!');
      console.log('Message ID:', data.message_id || smsId);
      console.log('');
      console.log('📱 CHECK YOUR PHONE NOW!');
      console.log('You should receive an SMS with the message above.');
      console.log('If you receive it, the SMS system is working correctly.');
      console.log('If you don\'t receive it, there might be an issue with:');
      console.log('1. AirTouch account balance');
      console.log('2. Sender ID registration');
      console.log('3. Phone number format');
      console.log('4. Network issues');
    } else {
      console.log('❌ SMS sending failed:');
      if (data.status_code === '1011' || data.status_desc === 'INVALID USER') {
        console.log('Error: Invalid AirTouch credentials. Please check username and password.');
      } else if (data.status_code === '1004' || data.status_desc?.includes('BALANCE')) {
        console.log('Error: Insufficient AirTouch account balance.');
      } else if (data.status_code === '1001' || data.status_desc?.includes('SENDER')) {
        console.log('Error: Invalid sender ID. Please check if sender ID is registered with AirTouch.');
      } else {
        console.log('Error:', data.status_desc || `API Error: ${data.status_code}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testRealSMSSending();



