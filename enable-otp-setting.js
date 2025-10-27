// Enable OTP setting in system_settings
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function enableOTPSetting() {
  try {
    console.log('🔐 Enabling OTP Setting...');
    console.log('==========================');
    
    // Check if setting already exists
    const { data: existingSetting, error: checkError } = await supabase
      .from('system_settings')
      .select('*')
      .eq('setting_key', 'login_otp_enabled')
      .single();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.log('❌ Error checking existing setting:', checkError.message);
      return;
    }
    
    if (existingSetting) {
      console.log('✅ login_otp_enabled setting already exists:');
      console.log(`   Current value: ${existingSetting.setting_value}`);
      
      if (existingSetting.setting_value === 'true') {
        console.log('✅ OTP is already enabled');
        return;
      } else {
        console.log('🔄 Updating setting to enable OTP...');
        
        const { data: updateData, error: updateError } = await supabase
          .from('system_settings')
          .update({ setting_value: 'true' })
          .eq('setting_key', 'login_otp_enabled')
          .select();
        
        if (updateError) {
          console.log('❌ Error updating setting:', updateError.message);
          return;
        }
        
        console.log('✅ OTP setting updated successfully');
        console.log('   New value:', updateData[0].setting_value);
      }
    } else {
      console.log('➕ Creating new login_otp_enabled setting...');
      
      const { data: insertData, error: insertError } = await supabase
        .from('system_settings')
        .insert({
          setting_key: 'login_otp_enabled',
          setting_value: 'true',
          description: 'Enable OTP authentication for login',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (insertError) {
        console.log('❌ Error creating setting:', insertError.message);
        return;
      }
      
      console.log('✅ OTP setting created successfully');
      console.log('   Setting:', insertData[0].setting_key);
      console.log('   Value:', insertData[0].setting_value);
    }
    
    console.log('');
    console.log('🎉 OTP Authentication is now ENABLED!');
    console.log('=====================================');
    console.log('The system will now require OTP verification on every login attempt.');
    console.log('');
    console.log('📋 What this means:');
    console.log('1. Users will need to enter their email and password');
    console.log('2. System will send an OTP to their registered phone number');
    console.log('3. Users must enter the OTP to complete login');
    console.log('4. This applies to ALL users, including super admin');
    console.log('');
    console.log('🧪 Test the flow:');
    console.log('1. Logout from the current session');
    console.log('2. Try to login again');
    console.log('3. You should now be prompted for OTP verification');
    
  } catch (error) {
    console.error('❌ Failed to enable OTP setting:', error);
  }
}

enableOTPSetting();



