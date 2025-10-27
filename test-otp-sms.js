// Test script to verify OTP SMS functionality
// This script tests the SMS sending using the same method as successful SMS campaigns

const crypto = require('crypto');

// Load environment variables from .env file
require('dotenv').config();

// Test SMS sending function (same as working SMS campaigns)
async function testSMSSending() {
  try {
    // Use environment variables (same as successful SMS campaigns)
    const username = process.env.SUPER_ADMIN_SMS_USERNAME;
    const apiKey = process.env.SUPER_ADMIN_SMS_API_KEY;
    const senderId = process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault';
    
    console.log('🔍 SMS Configuration:');
    console.log('Username:', username ? 'SET' : 'NOT SET');
    console.log('API Key:', apiKey ? 'SET' : 'NOT SET');
    console.log('Sender ID:', senderId);
    
    if (!username || !apiKey) {
      console.error('❌ SMS credentials not found in environment variables');
      console.log('Please ensure these environment variables are set:');
      console.log('- SUPER_ADMIN_SMS_USERNAME');
      console.log('- SUPER_ADMIN_SMS_API_KEY');
      console.log('- SUPER_ADMIN_SMS_SENDER_ID (optional)');
      return;
    }

    // Test phone number (replace with your actual phone number)
    const testPhone = '254726056444'; // Replace with your phone number
    const testMessage = 'Test OTP SMS: 123456. This is a test message from Payment Vault.';
    
    // Format phone number
    let formattedPhone = testPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Create MD5 hash of API key (same as working SMS campaigns)
    const md5Hash = crypto.createHash('md5').update(apiKey).digest('hex');
    
    // Generate unique SMS ID
    const smsId = `TEST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // AirTouch API URL (same as working SMS campaigns)
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/';
    
    // Build GET request URL with parameters (same format as working SMS campaigns)
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: testMessage,
      username: username,
      password: md5Hash,
      sms_id: smsId
    });
    
    const getUrl = `${apiUrl}?${params.toString()}`;
    
    console.log('📱 Sending test SMS to:', formattedPhone);
    console.log('📱 API URL:', getUrl.replace(/password=[^&]+/, 'password=***'));
    
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

// Run the test
console.log('🧪 Testing OTP SMS functionality...');
console.log('=====================================');
testSMSSending();
