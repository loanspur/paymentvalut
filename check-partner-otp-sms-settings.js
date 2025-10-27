// Check if OTP for partner login is using partner SMS settings
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPartnerOTPSMSSettings() {
  try {
    console.log('🔍 Checking Partner OTP SMS Settings...');
    console.log('=======================================');
    
    // Step 1: Find the partner user admin@mpesavault.com
    console.log('👤 Step 1: Finding partner user admin@mpesavault.com...');
    const { data: partnerUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@mpesavault.com')
      .single();
    
    if (userError || !partnerUser) {
      console.log('❌ Partner user not found:', userError?.message);
      return;
    }
    
    console.log('✅ Partner user found:');
    console.log(`   Email: ${partnerUser.email}`);
    console.log(`   Role: ${partnerUser.role}`);
    console.log(`   Partner ID: ${partnerUser.partner_id}`);
    console.log(`   Phone: ${partnerUser.phone_number}`);
    console.log(`   Phone Verified: ${partnerUser.phone_verified}`);
    console.log(`   Is Active: ${partnerUser.is_active}`);
    console.log('');
    
    // Step 2: Check partner details
    console.log('🏢 Step 2: Checking partner details...');
    if (partnerUser.partner_id) {
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerUser.partner_id)
        .single();
      
      if (partnerError || !partner) {
        console.log('❌ Partner details not found:', partnerError?.message);
      } else {
        console.log('✅ Partner details found:');
        console.log(`   Name: ${partner.name}`);
        console.log(`   ID: ${partner.id}`);
        console.log(`   Short Code: ${partner.mpesa_shortcode}`);
        console.log(`   Environment: ${partner.mpesa_environment}`);
        console.log(`   Has Credentials: ${partner.consumer_key ? 'Yes' : 'No'}`);
        console.log(`   Is Active: ${partner.is_active}`);
        console.log('');
      }
    } else {
      console.log('❌ Partner user has no partner_id');
    }
    
    // Step 3: Check partner SMS settings
    console.log('📱 Step 3: Checking partner SMS settings...');
    if (partnerUser.partner_id) {
      const { data: smsSettings, error: smsError } = await supabase
        .from('partner_sms_settings')
        .select('*')
        .eq('partner_id', partnerUser.partner_id)
        .single();
      
      if (smsError) {
        console.log('❌ Partner SMS settings not found:', smsError.message);
        console.log('   This means the partner does not have SMS settings configured');
      } else {
        console.log('✅ Partner SMS settings found:');
        console.log(`   Partner ID: ${smsSettings.partner_id}`);
        console.log(`   Sender ID: ${smsSettings.damza_sender_id}`);
        console.log(`   Username: ${smsSettings.damza_username}`);
        console.log(`   API Key: ${smsSettings.damza_api_key ? 'SET' : 'NOT SET'}`);
        console.log(`   Password: ${smsSettings.damza_password ? 'SET' : 'NOT SET'}`);
        console.log(`   SMS Enabled: ${smsSettings.sms_enabled}`);
        console.log('');
      }
    }
    
    // Step 4: Check recent OTP records for this user
    console.log('📋 Step 4: Checking recent OTP records for admin@mpesavault.com...');
    const { data: otpRecords, error: otpError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .eq('email', 'admin@mpesavault.com')
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (otpError) {
      console.log('❌ Error fetching OTP records:', otpError.message);
    } else if (otpRecords && otpRecords.length > 0) {
      console.log(`✅ Found ${otpRecords.length} recent OTP records:`);
      otpRecords.forEach((record, index) => {
        console.log(`  ${index + 1}. OTP Code: ${record.otp_code}`);
        console.log(`     Phone: ${record.phone_number}`);
        console.log(`     Status: ${record.status}`);
        console.log(`     SMS Sent: ${record.sms_sent}`);
        console.log(`     Created: ${record.created_at}`);
        console.log(`     Expires: ${record.expires_at}`);
        console.log('');
      });
    } else {
      console.log('❌ No OTP records found for admin@mpesavault.com');
    }
    
    // Step 5: Check environment variables for fallback SMS settings
    console.log('🌐 Step 5: Checking environment variables for SMS settings...');
    const envSmsSettings = {
      superAdminSmsEnabled: process.env.SUPER_ADMIN_SMS_ENABLED === 'true',
      superAdminSenderId: process.env.SUPER_ADMIN_SMS_SENDER_ID,
      superAdminUsername: process.env.SUPER_ADMIN_SMS_USERNAME,
      superAdminApiKey: process.env.SUPER_ADMIN_SMS_API_KEY ? 'SET' : 'NOT SET',
      superAdminPassword: process.env.SUPER_ADMIN_SMS_PASSWORD ? 'SET' : 'NOT SET'
    };
    
    console.log('Environment SMS Settings:');
    console.log(`   SUPER_ADMIN_SMS_ENABLED: ${envSmsSettings.superAdminSmsEnabled}`);
    console.log(`   Sender ID: ${envSmsSettings.superAdminSenderId}`);
    console.log(`   Username: ${envSmsSettings.superAdminUsername}`);
    console.log(`   API Key: ${envSmsSettings.superAdminApiKey}`);
    console.log(`   Password: ${envSmsSettings.superAdminPassword}`);
    console.log('');
    
    // Step 6: Analyze the OTP SMS logic
    console.log('🔍 Step 6: Analyzing OTP SMS Logic...');
    console.log('=====================================');
    
    if (partnerUser.partner_id) {
      console.log('📋 OTP SMS Logic for Partner User:');
      console.log('1. User has partner_id:', partnerUser.partner_id);
      console.log('2. System will look for partner-specific SMS settings');
      
      // Check if SMS settings were found
      const { data: smsSettingsCheck2 } = await supabase
        .from('partner_sms_settings')
        .select('*')
        .eq('partner_id', partnerUser.partner_id)
        .single();
      
      if (!smsSettingsCheck2) {
        console.log('3. ❌ No partner SMS settings found');
        console.log('4. System will fall back to environment variables');
        console.log('5. Will use SUPER_ADMIN_SMS_* environment variables');
      } else {
        console.log('3. ✅ Partner SMS settings found');
        console.log('4. System will use partner-specific SMS settings');
        console.log('5. Will use partner\'s damza_* credentials');
      }
    } else {
      console.log('📋 OTP SMS Logic for Non-Partner User:');
      console.log('1. User has no partner_id');
      console.log('2. System will use environment variables');
      console.log('3. Will use SUPER_ADMIN_SMS_* environment variables');
    }
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    
    // Check if SMS settings were found (from the earlier query)
    let smsSettingsCheck = null;
    if (partnerUser.partner_id) {
      const { data: smsSettingsData } = await supabase
        .from('partner_sms_settings')
        .select('*')
        .eq('partner_id', partnerUser.partner_id)
        .single();
      smsSettingsCheck = smsSettingsData;
    }
    
    if (partnerUser.partner_id) {
      if (!smsSettingsCheck) {
        console.log('❌ ISSUE: Partner user has no SMS settings configured');
        console.log('   The OTP system is falling back to environment variables');
        console.log('   This means it\'s NOT using partner-specific SMS settings');
      } else {
        console.log('✅ GOOD: Partner user has SMS settings configured');
        console.log('   The OTP system should use partner-specific SMS settings');
      }
    } else {
      console.log('ℹ️ INFO: User is not associated with a partner');
      console.log('   The OTP system will use environment variables');
    }
    
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    
    if (partnerUser.partner_id && !smsSettingsCheck) {
      console.log('1. **Configure Partner SMS Settings**:');
      console.log('   Add SMS settings for partner ID:', partnerUser.partner_id);
      console.log('   This will ensure OTP uses partner-specific SMS credentials');
      console.log('');
      console.log('2. **Partner SMS Settings should include**:');
      console.log('   - damza_sender_id (partner\'s sender ID)');
      console.log('   - damza_username (partner\'s SMS username)');
      console.log('   - damza_api_key (partner\'s SMS API key)');
      console.log('   - damza_password (partner\'s SMS password)');
      console.log('   - sms_enabled = true');
    } else if (partnerUser.partner_id) {
      console.log('✅ Partner SMS settings are configured correctly');
      console.log('   OTP should use partner-specific SMS settings');
    } else {
      console.log('ℹ️ User is not a partner user');
      console.log('   OTP will use environment variables (expected behavior)');
    }
    
  } catch (error) {
    console.error('❌ Partner OTP SMS check failed:', error);
  }
}

checkPartnerOTPSMSSettings();
