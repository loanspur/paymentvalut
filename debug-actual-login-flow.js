// Debug the actual login flow to see what's different from our simulation
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugActualLoginFlow() {
  try {
    console.log('🔍 Debugging Actual Login Flow...');
    console.log('===================================');
    
    // Step 1: Check if there are any recent OTP records from actual login attempts
    console.log('📱 Step 1: Checking recent OTP records from actual login...');
    const { data: recentOTPs, error: otpError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (otpError) {
      console.log('❌ Error fetching OTP records:', otpError.message);
    } else if (recentOTPs && recentOTPs.length > 0) {
      console.log('✅ Found', recentOTPs.length, 'recent OTP records:');
      recentOTPs.forEach((otp, index) => {
        console.log(`  ${index + 1}. Phone: ${otp.phone_number}`);
        console.log(`     OTP Code: ${otp.otp_code}`);
        console.log(`     SMS Sent: ${otp.sms_sent}`);
        console.log(`     Status: ${otp.status}`);
        console.log(`     Created: ${otp.created_at}`);
        console.log(`     User ID: ${otp.user_id}`);
        console.log('');
      });
    } else {
      console.log('❌ No recent OTP records found');
    }
    
    // Step 2: Check if there are any failed OTP attempts
    console.log('🔍 Step 2: Checking for failed OTP attempts...');
    const { data: failedOTPs, error: failedError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .eq('sms_sent', false)
      .order('created_at', { ascending: false })
      .limit(3);
    
    if (failedError) {
      console.log('❌ Error fetching failed OTP records:', failedError.message);
    } else if (failedOTPs && failedOTPs.length > 0) {
      console.log('⚠️  Found', failedOTPs.length, 'OTP records where SMS was not sent:');
      failedOTPs.forEach((otp, index) => {
        console.log(`  ${index + 1}. Phone: ${otp.phone_number}`);
        console.log(`     OTP Code: ${otp.otp_code}`);
        console.log(`     SMS Sent: ${otp.sms_sent}`);
        console.log(`     Created: ${otp.created_at}`);
        console.log(`     User ID: ${otp.user_id}`);
        console.log('');
      });
    } else {
      console.log('✅ No failed OTP records found');
    }
    
    // Step 3: Check the super admin user details
    console.log('👤 Step 3: Checking super admin user details...');
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
    console.log('Is Active:', user.is_active);
    console.log('');
    
    // Step 4: Check if the user has the correct phone number format
    console.log('📱 Step 4: Checking phone number format...');
    const phoneNumber = user.phone_number;
    console.log('Stored Phone:', phoneNumber);
    
    // Format the phone number as it would be used in SMS
    let formattedPhone = phoneNumber?.replace(/\D/g, '');
    if (formattedPhone?.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (formattedPhone && !formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    
    console.log('Formatted for SMS:', formattedPhone);
    console.log('');
    
    // Step 5: Check SMS settings logic
    console.log('📱 Step 5: Checking SMS settings logic...');
    const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true';
    console.log('SUPER_ADMIN_SMS_ENABLED:', superAdminSmsEnabled);
    
    if (superAdminSmsEnabled) {
      console.log('✅ Using environment variables for super admin SMS');
      
      const smsSettings = {
        damza_sender_id: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
        damza_username: process.env.SUPER_ADMIN_SMS_USERNAME,
        damza_api_key: process.env.SUPER_ADMIN_SMS_API_KEY,
        damza_password: process.env.SUPER_ADMIN_SMS_PASSWORD,
        sms_enabled: true
      };
      
      console.log('SMS Settings:');
      console.log('  Sender ID:', smsSettings.damza_sender_id);
      console.log('  Username:', smsSettings.damza_username);
      console.log('  API Key:', smsSettings.damza_api_key ? 'SET' : 'NOT SET');
      console.log('  Password:', smsSettings.damza_password ? 'SET' : 'NOT SET');
      
      if (!smsSettings.damza_username || !smsSettings.damza_api_key) {
        console.log('❌ SMS environment variables not properly configured');
        return;
      }
    } else {
      console.log('❌ SUPER_ADMIN_SMS_ENABLED is not true');
      return;
    }
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    console.log('If the actual login is not sending SMS but our simulation works,');
    console.log('the issue might be:');
    console.log('1. The actual OTP system is not being called at all');
    console.log('2. The actual OTP system is failing silently');
    console.log('3. There\'s a difference in the user data or SMS settings');
    console.log('4. The JWT token is not being set properly in the actual login');
    console.log('');
    console.log('💡 Next steps:');
    console.log('1. Check server logs for debug messages when you try to log in');
    console.log('2. Check browser Network tab for API calls');
    console.log('3. Look for OTP generation API call in the Network tab');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

debugActualLoginFlow();



