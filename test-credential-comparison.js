// Test credential comparison between environment variables and database
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

async function testCredentialComparison() {
  try {
    console.log('🔍 Testing Credential Comparison...');
    console.log('=====================================');
    
    // Get environment variables
    const envUsername = process.env.SUPER_ADMIN_SMS_USERNAME;
    const envApiKey = process.env.SUPER_ADMIN_SMS_API_KEY;
    const envSenderId = process.env.SUPER_ADMIN_SMS_SENDER_ID;
    
    console.log('📱 Environment Variables:');
    console.log('Username:', envUsername);
    console.log('API Key:', envApiKey);
    console.log('Sender ID:', envSenderId);
    console.log('');
    
    // Get database SMS settings
    const { data: smsSettings, error } = await supabase
      .from('partner_sms_settings')
      .select('*')
      .eq('damza_sender_id', envSenderId) // Match by sender ID
      .single();
    
    if (error || !smsSettings) {
      console.log('❌ No matching SMS settings found in database for sender ID:', envSenderId);
      return;
    }
    
    console.log('🗄️ Database SMS Settings (encrypted):');
    console.log('Username:', smsSettings.damza_username);
    console.log('API Key:', smsSettings.damza_api_key);
    console.log('Sender ID:', smsSettings.damza_sender_id);
    console.log('');
    
    // Decrypt database credentials
    const passphrase = process.env.JWT_SECRET;
    if (!passphrase) {
      console.log('❌ JWT_SECRET not found for decryption');
      return;
    }
    
    console.log('🔓 Decrypting database credentials...');
    const decryptedUsername = decryptData(smsSettings.damza_username, passphrase);
    const decryptedApiKey = decryptData(smsSettings.damza_api_key, passphrase);
    
    console.log('🗄️ Decrypted Database Credentials:');
    console.log('Username:', decryptedUsername);
    console.log('API Key:', decryptedApiKey);
    console.log('');
    
    // Compare credentials
    console.log('🔍 Credential Comparison:');
    console.log('Username Match:', envUsername === decryptedUsername ? '✅ YES' : '❌ NO');
    console.log('API Key Match:', envApiKey === decryptedApiKey ? '✅ YES' : '❌ NO');
    console.log('Sender ID Match:', envSenderId === smsSettings.damza_sender_id ? '✅ YES' : '❌ NO');
    console.log('');
    
    if (envUsername === decryptedUsername && envApiKey === decryptedApiKey) {
      console.log('🎉 CREDENTIALS MATCH!');
      console.log('The environment variables are the same as the decrypted database credentials.');
      console.log('This means the OTP system should work with the same credentials as SMS campaigns.');
    } else {
      console.log('⚠️  CREDENTIALS DO NOT MATCH!');
      console.log('The environment variables are different from the database credentials.');
      console.log('This explains why OTP SMS might not work while SMS campaigns do.');
    }
    
    // Test MD5 hash with both credentials
    console.log('');
    console.log('🧪 Testing MD5 Hash with both credentials:');
    
    const envMd5 = crypto.createHash('md5').update(envApiKey).digest('hex');
    const dbMd5 = crypto.createHash('md5').update(decryptedApiKey).digest('hex');
    
    console.log('Environment API Key MD5:', envMd5);
    console.log('Database API Key MD5:   ', dbMd5);
    console.log('MD5 Match:', envMd5 === dbMd5 ? '✅ YES' : '❌ NO');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testCredentialComparison();



