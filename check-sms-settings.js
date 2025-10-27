// Check SMS settings in database vs environment variables
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSMSSettings() {
  try {
    console.log('🔍 Checking SMS Settings...');
    console.log('=====================================');
    
    // Check environment variables
    console.log('📱 Environment Variables:');
    console.log('SUPER_ADMIN_SMS_USERNAME:', process.env.SUPER_ADMIN_SMS_USERNAME ? 'SET' : 'NOT SET');
    console.log('SUPER_ADMIN_SMS_API_KEY:', process.env.SUPER_ADMIN_SMS_API_KEY ? 'SET' : 'NOT SET');
    console.log('SUPER_ADMIN_SMS_SENDER_ID:', process.env.SUPER_ADMIN_SMS_SENDER_ID || 'NOT SET');
    console.log('');
    
    // Check database SMS settings
    console.log('🗄️ Database SMS Settings:');
    const { data: smsSettings, error } = await supabase
      .from('partner_sms_settings')
      .select('*');
    
    if (error) {
      console.log('❌ Error fetching SMS settings:', error.message);
    } else if (smsSettings && smsSettings.length > 0) {
      console.log('✅ Found', smsSettings.length, 'SMS settings in database:');
      smsSettings.forEach((setting, index) => {
        console.log(`  ${index + 1}. Partner ID: ${setting.partner_id}`);
        console.log(`     Sender ID: ${setting.damza_sender_id}`);
        console.log(`     Username: ${setting.damza_username ? 'ENCRYPTED' : 'NOT SET'}`);
        console.log(`     API Key: ${setting.damza_api_key ? 'ENCRYPTED' : 'NOT SET'}`);
        console.log(`     SMS Enabled: ${setting.sms_enabled}`);
        console.log('');
      });
    } else {
      console.log('❌ No SMS settings found in database');
    }
    
    // Check if OTP system is using database or environment
    console.log('🔍 OTP System Configuration:');
    console.log('The OTP system is currently using:');
    console.log('- Environment variables for SMS credentials');
    console.log('- Plain text API key and username');
    console.log('');
    console.log('SMS Campaigns are using:');
    console.log('- Database partner_sms_settings table');
    console.log('- Encrypted credentials that need decryption');
    console.log('');
    
    // Test decryption if database settings exist
    if (smsSettings && smsSettings.length > 0) {
      console.log('🧪 Testing credential decryption...');
      const testSetting = smsSettings[0];
      
      try {
        const passphrase = process.env.JWT_SECRET;
        if (!passphrase) {
          console.log('❌ JWT_SECRET not found for decryption');
        } else {
          // Try to decrypt (this is a simplified test)
          console.log('✅ JWT_SECRET found, decryption should work');
          console.log('📝 To test actual decryption, we need to implement the decryptData function');
        }
      } catch (error) {
        console.log('❌ Decryption test failed:', error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSMSSettings();


