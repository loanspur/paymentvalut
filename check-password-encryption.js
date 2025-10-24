const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

console.log('🔍 Checking Password Encryption');
console.log('==================================================\n');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPasswordEncryption() {
  try {
    console.log('📋 Step 1: Checking if Mifos password is encrypted...');
    
    const { data: partners, error } = await supabase
      .from('partners')
      .select('mifos_password, encrypted_credentials, security_credential')
      .ilike('name', '%umoja%magharibi%')
      .eq('is_active', true)
      .single();
    
    if (error) {
      console.log('❌ Error fetching partner:', error.message);
      return;
    }
    
    if (!partners) {
      console.log('❌ No partner found');
      return;
    }
    
    console.log('📊 Password fields:');
    console.log(`   mifos_password: ${partners.mifos_password ? `[${partners.mifos_password.length} chars]` : '[EMPTY]'}`);
    console.log(`   encrypted_credentials: ${partners.encrypted_credentials ? `[${partners.encrypted_credentials.length} chars]` : '[EMPTY]'}`);
    console.log(`   security_credential: ${partners.security_credential ? `[${partners.security_credential.length} chars]` : '[EMPTY]'}`);
    
    // Check if password looks encrypted (base64 or hex)
    if (partners.mifos_password) {
      const password = partners.mifos_password;
      console.log('\n📋 Password analysis:');
      console.log(`   Length: ${password.length}`);
      console.log(`   First 20 chars: ${password.substring(0, 20)}`);
      console.log(`   Last 20 chars: ${password.substring(password.length - 20)}`);
      
      // Check if it's base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      const isBase64 = base64Regex.test(password) && password.length % 4 === 0;
      console.log(`   Looks like Base64: ${isBase64}`);
      
      // Check if it's hex
      const hexRegex = /^[0-9a-fA-F]+$/;
      const isHex = hexRegex.test(password);
      console.log(`   Looks like Hex: ${isHex}`);
      
      // Check if it contains special characters that suggest it's plain text
      const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
      console.log(`   Has special characters: ${hasSpecialChars}`);
      
      if (hasSpecialChars && !isBase64 && !isHex) {
        console.log('✅ Password appears to be plain text (not encrypted)');
      } else {
        console.log('🔒 Password appears to be encrypted');
      }
    }
    
  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

async function testWithPlainPassword() {
  try {
    console.log('\n📋 Step 2: Testing with plain password...');
    
    const { data: partners, error } = await supabase
      .from('partners')
      .select('*')
      .ilike('name', '%umoja%magharibi%')
      .eq('is_active', true)
      .single();
    
    if (error || !partners) {
      console.log('❌ Error fetching partner');
      return;
    }
    
    // Try with the stored password as-is
    const https = require('https');
    
    const authUrl = `${partners.mifos_host_url}${partners.mifos_api_endpoint}/authentication`;
    console.log(`📡 Testing auth with stored password at: ${authUrl}`);
    
    const authResponse = await new Promise((resolve, reject) => {
      const req = https.request(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Fineract-Platform-TenantId': partners.mifos_tenant_id
        },
        timeout: 30000
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data: data });
          }
        });
      });
      
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Request timeout')));
      
      req.write(JSON.stringify({
        username: partners.mifos_username,
        password: partners.mifos_password
      }));
      
      req.end();
    });
    
    console.log(`📡 Auth Status: ${authResponse.status}`);
    if (authResponse.status === 200) {
      console.log('✅ Authentication successful with stored password');
      return true;
    } else {
      console.log('❌ Authentication failed with stored password');
      console.log('📊 Response:', JSON.stringify(authResponse.data, null, 2));
      return false;
    }
    
  } catch (error) {
    console.log('❌ Error testing authentication:', error.message);
    return false;
  }
}

async function runPasswordCheck() {
  console.log('🚀 Starting password encryption check...\n');
  
  await checkPasswordEncryption();
  const authSuccess = await testWithPlainPassword();
  
  console.log('\n🏁 Password check completed');
  if (authSuccess) {
    console.log('✅ Password is working correctly');
  } else {
    console.log('❌ Password authentication is failing');
    console.log('💡 Possible issues:');
    console.log('   1. Password might be encrypted and needs decryption');
    console.log('   2. Password might be incorrect in the database');
    console.log('   3. User account might be locked or disabled');
    console.log('   4. Tenant ID might be incorrect');
  }
}

// Run the check
runPasswordCheck().catch(error => {
  console.log('\n💥 Check failed:', error.message);
});


