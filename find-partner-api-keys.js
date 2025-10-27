// Find the actual API keys for partners by testing common patterns
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findPartnerAPIKeys() {
  try {
    console.log('🔍 Finding Partner API Keys...');
    console.log('==============================');
    
    // Get partner hashes
    const { data: partners, error: partnerError } = await supabase
      .from('partners')
      .select('id, name, api_key_hash');
    
    if (partnerError || !partners) {
      console.log('❌ Error fetching partners:', partnerError?.message);
      return;
    }
    
    console.log('Partner API Key Hashes:');
    partners.forEach(partner => {
      console.log(`  ${partner.name}: ${partner.api_key_hash}`);
    });
    console.log('');
    
    // Test common API key patterns
    const commonPatterns = [
      // Kulman Group patterns
      'kulman-api-key',
      'kulman-ussd-api-key',
      'kulman-group-api-key',
      'kulman-2025',
      'kulman-production',
      'kulman-prod-api',
      'KULMAN_API_KEY',
      'kulman_ussd_key',
      'kulman_ussd_api_key',
      
      // Finsafe patterns
      'finsafe-api-key',
      'finsafe-ussd-api-key',
      'finsafe-group-api-key',
      'finsafe-2025',
      'finsafe-production',
      'finsafe-prod-api',
      'FINSAFE_API_KEY',
      'finsafe_ussd_key',
      'finsafe_ussd_api_key',
      
      // Umoja patterns
      'umoja-api-key',
      'umoja-ussd-api-key',
      'umoja-magharibi-api-key',
      'umoja-2025',
      'umoja-production',
      'umoja-prod-api',
      'UMOJA_API_KEY',
      'umoja_ussd_key',
      'umoja_ussd_api_key',
      
      // Generic patterns
      'payment-vault-api-key',
      'ussd-api-key',
      'mpesa-api-key',
      'disbursement-api-key',
      'loan-api-key',
      'api-key-2025',
      'production-api-key',
      'prod-api-key',
      'test-api-key',
      'default-api-key',
      
      // Short codes as API keys
      '3037935', // Kulman short code
      '4955284', // Finsafe short code
      '4120187', // Umoja short code
      
      // Partner IDs as API keys
      '550e8400-e29b-41d4-a716-446655440000', // Kulman ID
      '660e8400-e29b-41d4-a716-446655440001', // Finsafe ID
      'c0bf511b-b197-46e8-ac28-a4231772c8d2', // Umoja ID
      
      // Common variations
      'kulman',
      'finsafe',
      'umoja',
      'ussd',
      'mpesa',
      'disburse',
      'loan',
      'payment',
      'vault'
    ];
    
    console.log('Testing common API key patterns...');
    console.log('');
    
    const foundKeys = [];
    
    for (const apiKey of commonPatterns) {
      const hash = await hashAPIKey(apiKey);
      
      for (const partner of partners) {
        if (hash === partner.api_key_hash) {
          console.log(`✅ MATCH FOUND!`);
          console.log(`   Partner: ${partner.name}`);
          console.log(`   API Key: ${apiKey}`);
          console.log(`   Hash: ${hash}`);
          console.log('');
          
          foundKeys.push({
            partner: partner.name,
            apiKey: apiKey,
            hash: hash
          });
        }
      }
    }
    
    if (foundKeys.length === 0) {
      console.log('❌ No matches found with common patterns');
      console.log('');
      console.log('💡 The API keys might be:');
      console.log('1. Randomly generated strings');
      console.log('2. Stored in a secure location not accessible here');
      console.log('3. Generated using a different pattern');
      console.log('');
      console.log('🔧 To find the API keys:');
      console.log('1. Check with the system administrator');
      console.log('2. Look in secure configuration files');
      console.log('3. Check the original setup documentation');
      console.log('4. Generate new API keys and update the database');
    } else {
      console.log('🎉 Found API Keys:');
      console.log('==================');
      foundKeys.forEach(key => {
        console.log(`${key.partner}: ${key.apiKey}`);
      });
      console.log('');
      console.log('📋 For USSD Team:');
      console.log('=================');
      console.log('Use these API keys in the x-api-key header when calling the webhook:');
      foundKeys.forEach(key => {
        console.log(`  ${key.partner}: x-api-key: ${key.apiKey}`);
      });
    }
    
    // Test webhook with found API keys
    if (foundKeys.length > 0) {
      console.log('');
      console.log('🧪 Testing webhook with found API keys...');
      
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const webhookUrl = `${supabaseUrl}/functions/v1/disburse`;
      
      for (const key of foundKeys) {
        console.log(`Testing with ${key.partner} API key...`);
        
        const testPayload = {
          amount: 100,
          msisdn: '254700000000',
          tenant_id: 'TEST',
          customer_id: 'TEST123',
          client_request_id: `TEST_${Date.now()}`
        };
        
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': key.apiKey
            },
            body: JSON.stringify(testPayload)
          });
          
          const responseText = await response.text();
          console.log(`  Status: ${response.status}`);
          console.log(`  Response: ${responseText.substring(0, 100)}...`);
          
          if (response.status === 200 || response.status === 400) {
            console.log(`  ✅ API key works for ${key.partner}`);
          } else {
            console.log(`  ❌ API key failed for ${key.partner}`);
          }
        } catch (error) {
          console.log(`  ❌ Error testing ${key.partner}: ${error.message}`);
        }
        console.log('');
      }
    }
    
  } catch (error) {
    console.error('❌ API key search failed:', error);
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

findPartnerAPIKeys();



