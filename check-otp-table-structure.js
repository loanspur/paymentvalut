// Check the actual structure of the otp_validations table
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkOTPTableStructure() {
  try {
    console.log('🔍 Checking OTP Table Structure...');
    console.log('===================================');
    
    // Try to get the table structure by querying with limit 0
    const { data, error } = await supabase
      .from('otp_validations')
      .select('*')
      .limit(0);
    
    if (error) {
      console.log('❌ Error accessing otp_validations table:', error.message);
      
      // Check if the table exists at all
      if (error.message.includes('relation "otp_validations" does not exist')) {
        console.log('❌ The otp_validations table does not exist!');
        console.log('This explains why OTP SMS is not working.');
        console.log('');
        console.log('💡 Solution: Create the otp_validations table');
        return;
      }
    } else {
      console.log('✅ otp_validations table exists');
    }
    
    // Try to insert a test record to see what columns are available
    console.log('');
    console.log('🧪 Testing OTP record creation...');
    
    const testOTP = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Try with minimal fields first
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_validations')
      .insert({
        user_id: '63943c0b-d3a5-41fe-8051-9def89aa8113', // Super admin ID
        phone_number: '254726056444',
        otp_code: testOTP,
        otp_type: 'login',
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      })
      .select()
      .single();
    
    if (otpError) {
      console.log('❌ Failed to create OTP record:', otpError.message);
      console.log('');
      console.log('💡 This explains why OTP SMS is not working!');
      console.log('The OTP system cannot create OTP records in the database.');
    } else {
      console.log('✅ OTP record created successfully');
      console.log('OTP ID:', otpRecord.id);
      console.log('Available columns:', Object.keys(otpRecord));
      
      // Clean up
      await supabase
        .from('otp_validations')
        .delete()
        .eq('id', otpRecord.id);
      console.log('🧹 Test record cleaned up');
    }
    
    // Check if there are any existing OTP records
    console.log('');
    console.log('📊 Checking existing OTP records...');
    const { data: existingOTPs, error: existingError } = await supabase
      .from('otp_validations')
      .select('*')
      .limit(5);
    
    if (existingError) {
      console.log('❌ Error fetching existing OTP records:', existingError.message);
    } else if (existingOTPs && existingOTPs.length > 0) {
      console.log('✅ Found', existingOTPs.length, 'existing OTP records');
      console.log('Sample record:', existingOTPs[0]);
    } else {
      console.log('❌ No existing OTP records found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkOTPTableStructure();



