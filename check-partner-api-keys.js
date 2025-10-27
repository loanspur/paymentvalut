// Check partner API keys configuration
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPartnerAPIKeys() {
  try {
    console.log('🔑 Checking Partner API Keys...');
    console.log('===============================');
    
    // Step 1: Check partners table for API key hashes
    console.log('🏢 Step 1: Checking partners table...');
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('*');
    
    if (partnerError) {
      console.log('❌ Error fetching partners:', partnerError.message);
      return;
    }
    
    if (partners && partners.length > 0) {
      console.log(`✅ Found ${partners.length} partners:`);
      partners.forEach((partner, index) => {
        console.log(`  ${index + 1}. ${partner.name}`);
        console.log(`     ID: ${partner.id}`);
        console.log(`     Active: ${partner.is_active}`);
        console.log(`     API Key Hash: ${partner.api_key_hash || 'NOT SET'}`);
        console.log(`     Has Credentials: ${partner.consumer_key ? 'Yes' : 'No'}`);
        console.log(`     M-Pesa Configured: ${partner.is_mpesa_configured || false}`);
        console.log('');
      });
    } else {
      console.log('❌ No partners found');
    }
    
    // Step 2: Check if there are any API keys in environment variables
    console.log('🌐 Step 2: Checking environment variables for API keys...');
    const envApiKeys = Object.keys(process.env).filter(key => 
      key.includes('API_KEY') || key.includes('api_key')
    );
    
    if (envApiKeys.length > 0) {
      console.log('Found API key environment variables:');
      envApiKeys.forEach(key => {
        const value = process.env[key];
        console.log(`  ${key}: ${value ? 'SET' : 'NOT SET'}`);
        if (value) {
          console.log(`    Value: ${value.substring(0, 8)}...${value.substring(value.length - 4)}`);
        }
      });
    } else {
      console.log('❌ No API key environment variables found');
    }
    console.log('');
    
    // Step 3: Generate test API key hashes
    console.log('🔐 Step 3: Generating test API key hashes...');
    
    const testApiKeys = [
      'test-api-key-123',
      'kulman-api-key',
      'ussd-api-key',
      'default-api-key'
    ];
    
    console.log('Test API key hashes:');
    for (const apiKey of testApiKeys) {
      const hash = await hashAPIKey(apiKey);
      console.log(`  API Key: ${apiKey}`);
      console.log(`  Hash: ${hash}`);
      console.log('');
    }
    
    // Step 4: Check if any test hashes match partner hashes
    console.log('🔍 Step 4: Checking for matching hashes...');
    if (partners && partners.length > 0) {
      for (const partner of partners) {
        if (partner.api_key_hash) {
          console.log(`Checking partner: ${partner.name}`);
          console.log(`  Stored Hash: ${partner.api_key_hash}`);
          
          for (const apiKey of testApiKeys) {
            const hash = await hashAPIKey(apiKey);
            if (hash === partner.api_key_hash) {
              console.log(`  ✅ MATCH FOUND! API Key: ${apiKey}`);
            }
          }
          console.log('');
        }
      }
    }
    
    // Step 5: Check for any existing API key configurations
    console.log('📋 Step 5: Checking for API key configurations...');
    
    // Look for any documentation or config files that might contain API keys
    const possibleApiKeySources = [
      'KULMAN_USSD_INTEGRATION.md',
      'USSD_TRANSACTION_STATUS_API.md',
      'env.example'
    ];
    
    console.log('Checking possible API key sources:');
    for (const source of possibleApiKeySources) {
      try {
        const fs = require('fs');
        if (fs.existsSync(source)) {
          const content = fs.readFileSync(source, 'utf8');
          const apiKeyMatches = content.match(/api[_-]?key[:\s]*([a-zA-Z0-9_-]+)/gi);
          if (apiKeyMatches) {
            console.log(`  ${source}: Found ${apiKeyMatches.length} API key references`);
            apiKeyMatches.forEach(match => {
              console.log(`    ${match}`);
            });
          } else {
            console.log(`  ${source}: No API key references found`);
          }
        } else {
          console.log(`  ${source}: File not found`);
        }
      } catch (error) {
        console.log(`  ${source}: Error reading file`);
      }
    }
    
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    console.log('API Key Configuration Status:');
    console.log('');
    
    const partnersWithApiKeys = partners?.filter(p => p.api_key_hash) || [];
    if (partnersWithApiKeys.length === 0) {
      console.log('❌ ISSUE: No partners have API keys configured');
      console.log('   The USSD system cannot authenticate with the webhook endpoint');
    } else {
      console.log(`✅ ${partnersWithApiKeys.length} partners have API keys configured`);
    }
    
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    console.log('1. **Configure API Keys**: Set up API keys for partners in the database');
    console.log('2. **Share API Keys**: Provide the correct API keys to the USSD team');
    console.log('3. **Test Authentication**: Test webhook calls with the correct API keys');
    console.log('');
    console.log('To configure an API key for a partner:');
    console.log('1. Generate a secure API key (e.g., "kulman-ussd-api-key-2025")');
    console.log('2. Hash the API key using SHA-256');
    console.log('3. Store the hash in the partners.api_key_hash field');
    console.log('4. Share the plain text API key with the USSD team');
    
  } catch (error) {
    console.error('❌ API key check failed:', error);
  }
}

// Helper function to hash API key (same as in the disburse function)
async function hashAPIKey(apiKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

checkPartnerAPIKeys();



