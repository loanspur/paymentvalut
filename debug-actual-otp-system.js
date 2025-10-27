// Debug the actual OTP system to see what's different from our test
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugActualOTPSystem() {
  try {
    console.log('🔍 Debugging Actual OTP System...');
    console.log('===================================');
    
    // Check recent OTP records to see if any are being created
    console.log('📱 Checking Recent OTP Records...');
    const { data: recentOTPs, error: otpError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
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
    
    // Check if there are any failed OTP attempts
    console.log('🔍 Checking for Failed OTP Attempts...');
    const { data: failedOTPs, error: failedError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .eq('sms_sent', false)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (failedError) {
      console.log('❌ Error fetching failed OTP records:', failedError.message);
    } else if (failedOTPs && failedOTPs.length > 0) {
      console.log('⚠️  Found', failedOTPs.length, 'OTP records where SMS was not sent:');
      failedOTPs.forEach((otp, index) => {
        console.log(`  ${index + 1}. Phone: ${otp.phone_number}`);
        console.log(`     OTP Code: ${otp.otp_code}`);
        console.log(`     SMS Sent: ${otp.sms_sent}`);
        console.log(`     Created: ${otp.created_at}`);
        console.log('');
      });
    } else {
      console.log('✅ No failed OTP records found');
    }
    
    // Check the actual OTP system code to see if there are any differences
    console.log('🔍 Checking OTP System Configuration...');
    
    // Check if SUPER_ADMIN_SMS_ENABLED is still true
    const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true';
    console.log('SUPER_ADMIN_SMS_ENABLED:', superAdminSmsEnabled);
    
    // Check environment variables
    console.log('Environment Variables:');
    console.log('SUPER_ADMIN_SMS_USERNAME:', process.env.SUPER_ADMIN_SMS_USERNAME ? 'SET' : 'NOT SET');
    console.log('SUPER_ADMIN_SMS_API_KEY:', process.env.SUPER_ADMIN_SMS_API_KEY ? 'SET' : 'NOT SET');
    console.log('SUPER_ADMIN_SMS_SENDER_ID:', process.env.SUPER_ADMIN_SMS_SENDER_ID || 'NOT SET');
    
    // Check if there are any recent errors in the logs
    console.log('');
    console.log('🔍 Checking for Recent Errors...');
    console.log('Look for any error messages in the browser console or server logs');
    console.log('when you try to send OTP from the login page.');
    
    // Test the exact same flow as the OTP system
    console.log('');
    console.log('🧪 Testing Exact OTP System Flow Again...');
    
    // Get super admin user
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
    
    console.log('✅ Super admin user found:', user.email);
    console.log('Phone:', user.phone_number);
    
    // Create a new OTP record (this simulates what happens when you request OTP)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 15;
    
    console.log('🔐 Creating new OTP record...');
    const { data: otpRecord, error: createOtpError } = await supabase
      .from('login_otp_validations')
      .insert({
        user_id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        otp_code: otpCode,
        expires_at: new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString(),
        max_attempts: 3
      })
      .select()
      .single();
    
    if (createOtpError) {
      console.log('❌ Failed to create OTP record:', createOtpError.message);
      return;
    }
    
    console.log('✅ OTP record created:', otpRecord.id);
    console.log('OTP Code:', otpCode);
    
    // Now test SMS sending (this is what the OTP system should do)
    console.log('📱 Testing SMS sending...');
    
    const smsMessage = `Your Payment Vault login OTP is: ${otpCode}. Valid for ${expiryMinutes} minutes. Do not share this code.`;
    
    // Use the exact same SMS sending logic as the OTP system
    const smsResponse = await sendSMSViaAirTouch({
      phoneNumber: user.phone_number,
      message: smsMessage,
      senderId: process.env.SUPER_ADMIN_SMS_SENDER_ID || 'PaymentVault',
      username: process.env.SUPER_ADMIN_SMS_USERNAME,
      apiKey: process.env.SUPER_ADMIN_SMS_API_KEY,
      isEncrypted: false // Super admin uses environment variables (not encrypted)
    });
    
    console.log('SMS Response:', smsResponse);
    
    if (smsResponse.success) {
      console.log('✅ SMS sent successfully!');
      
      // Update OTP record
      await supabase
        .from('login_otp_validations')
        .update({ sms_sent: true })
        .eq('id', otpRecord.id);
      
      console.log('✅ OTP record updated with sms_sent: true');
      console.log('');
      console.log('📱 CHECK YOUR PHONE!');
      console.log('You should receive the OTP SMS with code:', otpCode);
    } else {
      console.log('❌ SMS sending failed:', smsResponse.error);
    }
    
    // Clean up
    await supabase
      .from('login_otp_validations')
      .delete()
      .eq('id', otpRecord.id);
    console.log('🧹 Test OTP record cleaned up');
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// SMS sending function (exact same as OTP system)
async function sendSMSViaAirTouch({
  phoneNumber,
  message,
  senderId,
  username,
  apiKey,
  isEncrypted = false
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

debugActualOTPSystem();
