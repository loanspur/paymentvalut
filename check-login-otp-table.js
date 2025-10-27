// Check the structure of the login_otp_validations table
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkLoginOTPTable() {
  try {
    console.log('🔍 Checking login_otp_validations Table Structure...');
    console.log('====================================================');
    
    // Try to get the table structure by querying with limit 0
    const { data, error } = await supabase
      .from('login_otp_validations')
      .select('*')
      .limit(0);
    
    if (error) {
      console.log('❌ Error accessing login_otp_validations table:', error.message);
      
      if (error.message.includes('relation "login_otp_validations" does not exist')) {
        console.log('❌ The login_otp_validations table does not exist!');
        console.log('This explains why OTP SMS is not working.');
        console.log('');
        console.log('💡 Solution: Create the login_otp_validations table');
        return;
      }
    } else {
      console.log('✅ login_otp_validations table exists');
    }
    
    // Try to insert a test record to see what columns are available
    console.log('');
    console.log('🧪 Testing login OTP record creation...');
    
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Try with the fields the OTP system is using
    const { data: otpRecord, error: otpError } = await supabase
      .from('login_otp_validations')
      .insert({
        user_id: '63943c0b-d3a5-41fe-8051-9def89aa8113', // Super admin ID
        email: 'justmurenga@gmail.com',
        phone_number: '254726056444',
        otp_code: testOTP,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        max_attempts: 3
      })
      .select()
      .single();
    
    if (otpError) {
      console.log('❌ Failed to create login OTP record:', otpError.message);
      console.log('');
      console.log('💡 This explains why OTP SMS is not working!');
      console.log('The OTP system cannot create OTP records in the database.');
    } else {
      console.log('✅ Login OTP record created successfully');
      console.log('OTP ID:', otpRecord.id);
      console.log('Available columns:', Object.keys(otpRecord));
      
      // Clean up
      await supabase
        .from('login_otp_validations')
        .delete()
        .eq('id', otpRecord.id);
      console.log('🧹 Test record cleaned up');
    }
    
    // Check if there are any existing login OTP records
    console.log('');
    console.log('📊 Checking existing login OTP records...');
    const { data: existingOTPs, error: existingError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .limit(5);
    
    if (existingError) {
      console.log('❌ Error fetching existing login OTP records:', existingError.message);
    } else if (existingOTPs && existingOTPs.length > 0) {
      console.log('✅ Found', existingOTPs.length, 'existing login OTP records');
      console.log('Sample record:', existingOTPs[0]);
    } else {
      console.log('❌ No existing login OTP records found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkLoginOTPTable();


