// Test the complete OTP system flow to see where it might be failing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testOTPSystemFlow() {
  try {
    console.log('🧪 Testing Complete OTP System Flow...');
    console.log('=======================================');
    
    // Step 1: Check if super admin user exists
    console.log('👤 Step 1: Checking super admin user...');
    const { data: superAdmin, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'super_admin')
      .limit(1)
      .single();
    
    if (userError || !superAdmin) {
      console.log('❌ No super admin user found');
      return;
    }
    
    console.log('✅ Super admin user found:', superAdmin.email);
    console.log('Partner ID:', superAdmin.partner_id);
    console.log('');
    
    // Step 2: Check SMS settings logic
    console.log('📱 Step 2: Checking SMS settings logic...');
    
    // Check if SUPER_ADMIN_SMS_ENABLED is true
    const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true';
    console.log('SUPER_ADMIN_SMS_ENABLED:', superAdminSmsEnabled);
    
    if (superAdminSmsEnabled) {
      console.log('✅ Using environment variables for super admin SMS');
      
      // Check environment variables
      const smsSettings = {
        damza_sender_id: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
        damza_username: process.env.SUPER_ADMIN_SMS_USERNAME,
        damza_api_key: process.env.SUPER_ADMIN_SMS_API_KEY,
        damza_password: process.env.SUPER_ADMIN_SMS_PASSWORD,
        sms_enabled: true
      };
      
      console.log('SMS Settings:');
      console.log('  Sender ID:', smsSettings.damza_sender_id);
      console.log('  Username:', smsSettings.damza_username ? 'SET' : 'NOT SET');
      console.log('  API Key:', smsSettings.damza_api_key ? 'SET' : 'NOT SET');
      console.log('  Password:', smsSettings.damza_password ? 'SET' : 'NOT SET');
      
      if (!smsSettings.damza_username || !smsSettings.damza_api_key) {
        console.log('❌ SMS environment variables not properly configured');
        return;
      }
      
      console.log('✅ SMS environment variables are properly configured');
    } else {
      console.log('❌ SUPER_ADMIN_SMS_ENABLED is not true');
      console.log('This would cause the OTP system to fail');
      return;
    }
    
    console.log('');
    
    // Step 3: Check if OTP generation would work
    console.log('🔐 Step 3: Testing OTP generation...');
    
    // Generate a test OTP
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    console.log('Generated OTP:', testOTP);
    
    // Check if we can create an OTP record
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_validations')
      .insert({
        user_id: superAdmin.id,
        phone_number: '254726056444',
        otp_code: testOTP,
        otp_type: 'login',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        is_used: false
      })
      .select()
      .single();
    
    if (otpError) {
      console.log('❌ Failed to create OTP record:', otpError.message);
      return;
    }
    
    console.log('✅ OTP record created successfully');
    console.log('OTP ID:', otpRecord.id);
    console.log('');
    
    // Step 4: Test SMS sending (simulate the OTP system)
    console.log('📱 Step 4: Testing SMS sending (simulating OTP system)...');
    
    const testMessage = `Your Payment Vault login OTP is: ${testOTP}. Valid for 15 minutes. Do not share this code.`;
    const testPhone = '254726056444';
    
    // This is the exact same logic as the OTP system
    const smsResponse = await sendSMSViaAirTouch({
      phoneNumber: testPhone,
      message: testMessage,
      senderId: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
      username: process.env.SUPER_ADMIN_SMS_USERNAME,
      apiKey: process.env.SUPER_ADMIN_SMS_API_KEY
    });
    
    console.log('SMS Response:', smsResponse);
    
    if (smsResponse.success) {
      console.log('✅ SMS sent successfully!');
      console.log('Reference:', smsResponse.reference);
      console.log('');
      console.log('📱 CHECK YOUR PHONE!');
      console.log('You should receive the OTP SMS with code:', testOTP);
    } else {
      console.log('❌ SMS sending failed:', smsResponse.error);
    }
    
    // Clean up test OTP record
    await supabase
      .from('otp_validations')
      .delete()
      .eq('id', otpRecord.id);
    
    console.log('🧹 Test OTP record cleaned up');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// SMS sending function (same as OTP system)
async function sendSMSViaAirTouch({
  phoneNumber,
  message,
  senderId,
  username,
  apiKey
}) {
  try {
    const crypto = require('crypto');
    
    // Format phone number
    let formattedPhone = phoneNumber.replace(/\D/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    }
    if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // AirTouch API URL
    const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/';
    
    // Create MD5 hash of API key
    const md5Hash = crypto.createHash('md5').update(apiKey).digest('hex');

    // Generate unique SMS ID
    const smsId = `OTP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare parameters
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: message,
      username: username,
      password: md5Hash,
      sms_id: smsId
    });

    const getUrl = `${apiUrl}?${params.toString()}`;

    console.log(`📱 Sending SMS to ${formattedPhone} via AirTouch API (GET)`);

    const response = await fetch(getUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    console.log('AirTouch API Response:', data);

    if (response.ok && data.status_code === '1000') {
      return {
        success: true,
        reference: data.message_id || smsId
      };
    } else {
      // Enhanced error handling
      if (data.status_code === '1011' || data.status_desc === 'INVALID USER') {
        return {
          success: false,
          error: 'Invalid AirTouch credentials. Please check username and password.'
        };
      } else if (data.status_code === '1004' || data.status_desc?.includes('BALANCE')) {
        return {
          success: false,
          error: 'Insufficient AirTouch account balance.'
        };
      } else if (data.status_code === '1001' || data.status_desc?.includes('SENDER')) {
        return {
          success: false,
          error: 'Invalid sender ID. Please check if sender ID is registered with AirTouch.'
        };
      } else {
        return {
          success: false,
          error: data.status_desc || `API Error: ${data.status_code}`
        };
      }
    }
  } catch (error) {
    console.error('AirTouch SMS Error:', error);
    return {
      success: false,
      error: 'SMS sending failed'
    };
  }
}

testOTPSystemFlow();


