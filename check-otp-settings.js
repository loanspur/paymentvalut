// Check OTP settings and authentication flow
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOTPSettings() {
  try {
    console.log('🔍 Checking OTP Settings and Authentication Flow...');
    console.log('==================================================');
    
    // Step 1: Check system settings for OTP
    console.log('⚙️ Step 1: Checking system settings...');
    const { data: systemSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('*');
    
    if (settingsError) {
      console.log('❌ Error fetching system settings:', settingsError.message);
    } else if (systemSettings && systemSettings.length > 0) {
      console.log(`✅ Found ${systemSettings.length} system settings:`);
      systemSettings.forEach((setting, index) => {
        console.log(`  ${index + 1}. ${setting.setting_key}: ${setting.setting_value}`);
      });
    } else {
      console.log('❌ No system settings found');
    }
    console.log('');
    
    // Step 2: Check if login_otp_enabled setting exists
    console.log('🔐 Step 2: Checking OTP enabled setting...');
    const { data: otpSetting, error: otpError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'login_otp_enabled')
      .single();
    
    if (otpError) {
      console.log('❌ login_otp_enabled setting not found:', otpError.message);
      console.log('   This means OTP is not configured in the system');
    } else {
      console.log('✅ login_otp_enabled setting found:');
      console.log(`   Value: ${otpSetting.setting_value}`);
      console.log(`   Enabled: ${otpSetting.setting_value === 'true'}`);
    }
    console.log('');
    
    // Step 3: Check super admin user verification status
    console.log('👤 Step 3: Checking super admin user verification status...');
    const { data: superAdmin, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'super_admin')
      .limit(1)
      .single();
    
    if (userError || !superAdmin) {
      console.log('❌ No super admin user found');
    } else {
      console.log('✅ Super admin user found:');
      console.log(`   Email: ${superAdmin.email}`);
      console.log(`   Phone: ${superAdmin.phone_number}`);
      console.log(`   Email Verified: ${superAdmin.email_verified}`);
      console.log(`   Phone Verified: ${superAdmin.phone_verified}`);
      console.log(`   Email Verified At: ${superAdmin.email_verified_at || 'Not verified'}`);
      console.log(`   Phone Verified At: ${superAdmin.phone_verified_at || 'Not verified'}`);
      console.log(`   Is Active: ${superAdmin.is_active}`);
    }
    console.log('');
    
    // Step 4: Check recent login OTP records
    console.log('📱 Step 4: Checking recent login OTP records...');
    const { data: otpRecords, error: otpRecordsError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (otpRecordsError) {
      console.log('❌ Error fetching OTP records:', otpRecordsError.message);
    } else if (otpRecords && otpRecords.length > 0) {
      console.log(`✅ Found ${otpRecords.length} recent OTP records:`);
      otpRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. User: ${record.email}`);
        console.log(`     Phone: ${record.phone_number}`);
        console.log(`     Status: ${record.status}`);
        console.log(`     SMS Sent: ${record.sms_sent}`);
        console.log(`     Created: ${record.created_at}`);
        console.log(`     Expires: ${record.expires_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No OTP records found');
    }
    
    // Step 5: Check if system_settings table exists
    console.log('🗄️ Step 5: Checking system_settings table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('system_settings')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.log('❌ system_settings table error:', tableError.message);
    } else {
      console.log('✅ system_settings table exists and is accessible');
    }
    console.log('');
    
    console.log('🔍 ANALYSIS:');
    console.log('============');
    console.log('OTP Authentication Status:');
    console.log('');
    
    // Analysis
    if (!otpSetting) {
      console.log('❌ ISSUE: login_otp_enabled setting not configured');
      console.log('   The system does not know whether to require OTP on login');
      console.log('   This is why OTP is not being triggered');
    } else if (otpSetting.setting_value !== 'true') {
      console.log('❌ ISSUE: OTP is disabled in system settings');
      console.log('   login_otp_enabled is set to:', otpSetting.setting_value);
      console.log('   OTP will not be required on login');
    } else {
      console.log('✅ OTP is enabled in system settings');
    }
    
    if (superAdmin) {
      if (!superAdmin.email_verified) {
        console.log('⚠️ WARNING: Super admin email is not verified');
        console.log('   This might affect the authentication flow');
      }
      if (!superAdmin.phone_verified) {
        console.log('⚠️ WARNING: Super admin phone is not verified');
        console.log('   This might affect OTP delivery');
      }
    }
    
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. **Enable OTP in System Settings**:');
    console.log('   INSERT INTO system_settings (setting_key, setting_value) VALUES (\'login_otp_enabled\', \'true\');');
    console.log('');
    console.log('2. **Verify Super Admin Account**:');
    console.log('   Ensure email and phone are verified for proper OTP flow');
    console.log('');
    console.log('3. **Test OTP Flow**:');
    console.log('   After enabling OTP, test the complete login flow');
    
  } catch (error) {
    console.error('❌ OTP settings check failed:', error);
  }
}

checkOTPSettings();



