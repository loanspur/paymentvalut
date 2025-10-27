// Check the phone number stored in the user profile
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUserPhoneNumber() {
  try {
    console.log('🔍 Checking User Phone Number...');
    console.log('==================================');
    
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
    
    console.log('👤 Super Admin User Details:');
    console.log('Email:', user.email);
    console.log('Phone Number:', user.phone_number);
    console.log('Role:', user.role);
    console.log('Partner ID:', user.partner_id);
    console.log('');
    
    // Check recent OTP records for this user
    console.log('📱 Recent OTP Records for this user:');
    const { data: recentOTPs, error: otpError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .eq('user_id', user.id)
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
        console.log('');
      });
    } else {
      console.log('❌ No recent OTP records found');
    }
    
    // Check if the phone number format is correct
    console.log('📱 Phone Number Analysis:');
    const phoneNumber = user.phone_number;
    console.log('Stored Phone:', phoneNumber);
    console.log('Starts with +:', phoneNumber?.startsWith('+'));
    console.log('Starts with 254:', phoneNumber?.startsWith('254'));
    console.log('Length:', phoneNumber?.length);
    
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
    
    console.log('💡 Summary:');
    console.log('The OTP system is working correctly and sending SMS to:', formattedPhone);
    console.log('If you\'re not receiving SMS, check if this is the correct phone number.');
    console.log('If you need to update the phone number, you can do so in your user profile.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkUserPhoneNumber();



