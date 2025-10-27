// Test the exact OTP SMS flow to see where it's failing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Copy the exact decryptData function from the OTP system
function decryptData(encryptedData, passphrase) {
  try {
    const crypto = require('crypto')
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const textParts = encryptedData.split(':')
    
    if (textParts.length !== 2) {
      // Handle fallback base64 encoding
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    }
    
    const iv = Buffer.from(textParts[0], 'hex')
    const encryptedText = textParts[1]
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    // Try base64 decoding as fallback
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    } catch (fallbackError) {
      return encryptedData // Return as-is if all decryption fails
    }
  }
}

async function testOTPSMSDebug() {
  try {
    console.log('🔍 Testing OTP SMS Debug Flow...');
    console.log('===================================');
    
    // Step 1: Get super admin user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'super_admin')
      .limit(1)
      .single();
    
    if (userError || !user) {
      console.log('❌ No super admin user found');
      return;
    }
    
    console.log('✅ Super admin user found:');
    console.log('Email:', user.email);
    console.log('Phone:', user.phone_number);
    console.log('Role:', user.role);
    console.log('Partner ID:', user.partner_id);
    console.log('');
    
    // Step 2: Check environment variables
    console.log('🔍 Step 2: Checking environment variables...');
    const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true';
    console.log('SUPER_ADMIN_SMS_ENABLED:', superAdminSmsEnabled);
    
    if (!superAdminSmsEnabled) {
      console.log('❌ Super admin SMS not enabled');
      return;
    }
    
    const smsSettings = {
      damza_sender_id: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
      damza_username: process.env.SUPER_ADMIN_SMS_USERNAME,
      damza_api_key: process.env.SUPER_ADMIN_SMS_API_KEY,
      damza_password: process.env.SUPER_ADMIN_SMS_PASSWORD,
      sms_enabled: true
    };
    
    console.log('SMS Settings from Environment:');
    console.log('  Sender ID:', smsSettings.damza_sender_id);
    console.log('  Username:', smsSettings.damza_username);
    console.log('  API Key:', smsSettings.damza_api_key ? 'SET' : 'NOT SET');
    console.log('  Password:', smsSettings.damza_password ? 'SET' : 'NOT SET');
    console.log('');
    
    // Step 3: Test the encryption/decryption logic
    console.log('🔍 Step 3: Testing encryption/decryption logic...');
    
    // For super admin users, isEncrypted should be false
    const isEncrypted = !(user.role === 'super_admin' && process.env.SUPER_ADMIN_SMS_ENABLED === 'true');
    console.log('isEncrypted flag:', isEncrypted);
    
    let decryptedApiKey = smsSettings.damza_api_key;
    let decryptedUsername = smsSettings.damza_username;
    
    // Only decrypt if the data is encrypted (from database)
    if (isEncrypted) {
      console.log('🔓 Decrypting credentials...');
      const passphrase = process.env.JWT_SECRET;
      if (!passphrase) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      
      decryptedApiKey = decryptData(smsSettings.damza_api_key, passphrase);
      decryptedUsername = decryptData(smsSettings.damza_username, passphrase);
    } else {
      console.log('🔓 Using plain text credentials (no decryption needed)');
    }
    
    console.log('Final credentials:');
    console.log('  Username:', decryptedUsername);
    console.log('  API Key:', decryptedApiKey ? 'SET' : 'NOT SET');
    console.log('');
    
    // Step 4: Test phone number formatting
    console.log('🔍 Step 4: Testing phone number formatting...');
    let formattedPhone = user.phone_number.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    
    console.log('Original phone:', user.phone_number);
    console.log('Formatted phone:', formattedPhone);
    console.log('');
    
    // Step 5: Test MD5 hashing
    console.log('🔍 Step 5: Testing MD5 hashing...');
    const crypto = require('crypto');
    const md5Hash = crypto.createHash('md5').update(decryptedApiKey).digest('hex');
    console.log('MD5 hash of API key:', md5Hash);
    console.log('');
    
    // Step 6: Test the actual SMS API call
    console.log('🔍 Step 6: Testing actual SMS API call...');
    
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/';
    const smsId = `OTP_DEBUG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const testMessage = `Test OTP: 123456. This is a debug test from Payment Vault.`;
    
    const params = new URLSearchParams({
      issn: smsSettings.damza_sender_id,
      msisdn: formattedPhone,
      text: testMessage,
      username: decryptedUsername,
      password: md5Hash,
      sms_id: smsId
    });
    
    const getUrl = `${apiUrl}?${params.toString()}`;
    
    console.log('SMS API URL:', getUrl);
    console.log('SMS ID:', smsId);
    console.log('');
    
    console.log('📱 Making actual SMS API call...');
    const response = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log('AirTouch API Response:', data);
    
    if (response.ok && data.status_code === '1000') {
      console.log('✅ SMS sent successfully!');
      console.log('Message ID:', data.message_id || smsId);
    } else {
      console.log('❌ SMS failed:');
      console.log('Status Code:', data.status_code);
      console.log('Status Description:', data.status_desc);
      console.log('Response:', data);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testOTPSMSDebug();

