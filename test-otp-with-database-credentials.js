// Test OTP SMS using database credentials (same as working SMS campaigns)
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Decryption function (same as SMS campaigns)
function decryptData(encryptedData, passphrase) {
  try {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(passphrase, 'salt', 32);
    const textParts = encryptedData.split(':');
    
    if (textParts.length !== 2) {
      // Handle fallback base64 encoding
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = textParts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Try base64 decoding as fallback
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch (fallbackError) {
      return encryptedData; // Return as-is if all decryption fails
    }
  }
}

async function testOTPWithDatabaseCredentials() {
  try {
    console.log('🧪 Testing OTP SMS with Database Credentials...');
    console.log('================================================');
    
    // Get database SMS settings (same as working SMS campaigns)
    const { data: smsSettings, error } = await supabase
      .from('partner_sms_settings')
      .select('*')
      .eq('sms_enabled', true)
      .limit(1)
      .single();
    
    if (error || !smsSettings) {
      console.log('❌ No SMS settings found in database');
      return;
    }
    
    console.log('🗄️ Database SMS Settings:');
    console.log('Sender ID:', smsSettings.damza_sender_id);
    console.log('Username:', smsSettings.damza_username ? 'ENCRYPTED' : 'NOT SET');
    console.log('API Key:', smsSettings.damza_api_key ? 'ENCRYPTED' : 'NOT SET');
    console.log('');
    
    // Decrypt credentials (same as SMS campaigns)
    const passphrase = process.env.JWT_SECRET;
    if (!passphrase) {
      console.log('❌ JWT_SECRET not found for decryption');
      return;
    }
    
    const decryptedUsername = decryptData(smsSettings.damza_username, passphrase);
    const decryptedApiKey = decryptData(smsSettings.damza_api_key, passphrase);
    
    console.log('🔓 Decrypted Credentials:');
    console.log('Username:', decryptedUsername);
    console.log('API Key:', decryptedApiKey);
    console.log('');
    
    // Test phone number
    const testPhone = '254726056444';
    const testMessage = 'OTP DATABASE TEST: This SMS uses the same database credentials as working SMS campaigns. If you receive this, the OTP system should work with database credentials.';
    
    // Format phone number
    let formattedPhone = testPhone.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Create MD5 hash
    const md5Hash = crypto.createHash('md5').update(decryptedApiKey).digest('hex');
    
    // Generate unique SMS ID
    const smsId = `OTP_DB_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // AirTouch API URL
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/';
    
    // Build GET request URL with parameters
    const params = new URLSearchParams({
      issn: smsSettings.damza_sender_id,
      msisdn: formattedPhone,
      text: testMessage,
      username: decryptedUsername,
      password: md5Hash,
      sms_id: smsId
    });
    
    const getUrl = `${apiUrl}?${params.toString()}`;
    
    console.log('📱 Sending OTP SMS with Database Credentials...');
    console.log('Phone:', formattedPhone);
    console.log('Sender ID:', smsSettings.damza_sender_id);
    console.log('Username:', decryptedUsername);
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
      console.log('✅ OTP SMS with database credentials sent successfully!');
      console.log('Message ID:', data.message_id || smsId);
      console.log('');
      console.log('📱 CHECK YOUR PHONE!');
      console.log('You should receive the OTP database test SMS.');
      console.log('If you receive it, the OTP system should use database credentials instead of environment variables.');
    } else {
      console.log('❌ OTP SMS with database credentials failed:');
      console.log('Error:', data.status_desc || `API Error: ${data.status_code}`);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOTPWithDatabaseCredentials();



