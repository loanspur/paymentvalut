// Simple MD5 hash verification
const crypto = require('crypto');

// Test with a sample API key to verify the hash calculation
function testMD5Hash(apiKey, expectedHash) {
  const md5Hash = crypto.createHash('md5').update(apiKey).digest('hex');
  
  console.log('🔍 Testing MD5 hash calculation...');
  console.log('API Key:', apiKey);
  console.log('Generated Hash:', md5Hash);
  console.log('Expected Hash: ', expectedHash);
  console.log('Match:', md5Hash === expectedHash ? '✅ YES' : '❌ NO');
  
  return md5Hash === expectedHash;
}

// Test the specific hash you provided
const expectedHash = 'd8b28328af6bf36311be04368e420336';

console.log('📊 Verifying MD5 hash: d8b28328af6bf36311be04368e420336');
console.log('================================================');

// Test with some common API key patterns
const testKeys = [
  'your_api_key_here',
  'test_api_key',
  'sms_api_key_123',
  'airtouch_api_key',
  'payment_vault_api',
  'super_admin_sms_key'
];

let foundMatch = false;

for (const testKey of testKeys) {
  if (testMD5Hash(testKey, expectedHash)) {
    console.log('🎉 Found matching API key!');
    foundMatch = true;
    break;
  }
  console.log('---');
}

if (!foundMatch) {
  console.log('❌ No match found with test keys.');
  console.log('💡 To verify your actual API key:');
  console.log('1. Set SUPER_ADMIN_SMS_API_KEY environment variable');
  console.log('2. Run: node verify-md5-hash.js');
  console.log('3. Or manually calculate: crypto.createHash("md5").update("YOUR_API_KEY").digest("hex")');
}

// Also show how to calculate MD5 hash manually
console.log('\n🔧 Manual MD5 calculation:');
console.log('const crypto = require("crypto");');
console.log('const hash = crypto.createHash("md5").update("YOUR_API_KEY").digest("hex");');
console.log('console.log(hash);');



