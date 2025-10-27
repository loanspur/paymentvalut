// Compare working simulation vs failing actual OTP system
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function compareSimulationVsActual() {
  try {
    console.log('🔍 Comparing Simulation vs Actual OTP System...');
    console.log('================================================');
    
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
    
    console.log('👤 User Details:');
    console.log('Email:', user.email);
    console.log('Phone:', user.phone_number);
    console.log('Role:', user.role);
    console.log('Partner ID:', user.partner_id);
    console.log('');
    
    // Check recent OTP records to see what the actual system is doing
    console.log('📱 Recent OTP Records (Actual System):');
    const { data: recentOTPs, error: otpError } = await supabase
      .from('login_otp_validations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3);
    
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
    
    // Now let's simulate the exact same flow as the actual OTP system
    console.log('🧪 Simulating Exact OTP System Flow...');
    console.log('=====================================');
    
    // Step 1: Check SMS settings logic (same as actual OTP system)
    let smsSettings = null;
    
    if (user.role === 'super_admin') {
      const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true';
      console.log('SUPER_ADMIN_SMS_ENABLED:', superAdminSmsEnabled);
      
      if (superAdminSmsEnabled) {
        console.log('📱 Using environment variables for super admin SMS');
        
        smsSettings = {
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
    }
    
    console.log('');
    
    // Step 2: Create OTP record (same as actual OTP system)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryMinutes = 15;
    
    console.log('🔐 Creating OTP record (same as actual system)...');
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
    console.log('');
    
    // Step 3: Send SMS (exact same logic as actual OTP system)
    console.log('📱 Sending SMS (exact same logic as actual OTP system)...');
    
    if (smsSettings) {
      console.log('📱 Sending SMS OTP to:', user.phone_number);
      
      const smsMessage = `Your Payment Vault login OTP is: ${otpCode}. Valid for ${expiryMinutes} minutes. Do not share this code.`;
      
      // Determine if the SMS settings are encrypted (same logic as actual OTP system)
      const isEncrypted = !(user.role === 'super_admin' && process.env.SUPER_ADMIN_SMS_ENABLED === 'true');
      console.log('Is Encrypted:', isEncrypted);
      
      const smsResponse = await sendSMSViaAirTouch({
        phoneNumber: user.phone_number,
        message: smsMessage,
        senderId: smsSettings.damza_sender_id,
        username: smsSettings.damza_username,
        apiKey: smsSettings.damza_api_key,
        isEncrypted: isEncrypted
      });
      
      console.log('SMS Response:', smsResponse);
      
      if (smsResponse.success) {
        console.log('✅ SMS OTP sent successfully!');
        
        // Update OTP record (same as actual OTP system)
        await supabase
          .from('login_otp_validations')
          .update({ sms_sent: true })
          .eq('id', otpRecord.id);
        
        console.log('✅ OTP record updated with sms_sent: true');
        console.log('');
        console.log('📱 CHECK YOUR PHONE!');
        console.log('You should receive the OTP SMS with code:', otpCode);
      } else {
        console.log('❌ SMS OTP failed:', smsResponse.error);
      }
    } else {
      console.log('❌ No SMS settings found for user');
    }
    
    // Clean up
    await supabase
      .from('login_otp_validations')
      .delete()
      .eq('id', otpRecord.id);
    console.log('🧹 Test OTP record cleaned up');
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    console.log('If this simulation works but the actual OTP system doesn\'t,');
    console.log('then there might be an issue with:');
    console.log('1. The actual OTP system code not calling the SMS function');
    console.log('2. An error in the actual OTP system that\'s not being logged');
    console.log('3. A difference in how the actual system handles the request');
    console.log('4. The actual system might be using different credentials or settings');
    
  } catch (error) {
    console.error('❌ Comparison failed:', error);
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
    
    // Decrypt credentials if they are encrypted
    let decryptedUsername = username;
    let decryptedApiKey = apiKey;
    
    if (isEncrypted) {
      const passphrase = process.env.JWT_SECRET;
      if (!passphrase) {
        return {
          success: false,
          error: 'JWT_SECRET not found for decryption'
        };
      }
      
      // Use the same decryption method as SMS campaigns
      decryptedUsername = decryptData(username, passphrase);
      decryptedApiKey = decryptData(apiKey, passphrase);
    }
    
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
    const md5Hash = crypto.createHash('md5').update(decryptedApiKey).digest('hex');

    // Generate unique SMS ID
    const smsId = `OTP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Prepare parameters
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: formattedPhone,
      text: message,
      username: decryptedUsername,
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

// Decryption function (same as SMS campaigns)
function decryptData(encryptedData, passphrase) {
  try {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(passphrase, 'salt', 32);
    const textParts = encryptedData.split(':');
    
    if (textParts.length !== 2) {
      // Handle fallback base64 encoding
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    }
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encryptedText = textParts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Try base64 decoding as fallback
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8');
    } catch (fallbackError) {
      return encryptedData; // Return as-is if all decryption fails
    }
  }
}

compareSimulationVsActual();


