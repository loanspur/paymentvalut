// Verify MD5 hash of API key
const crypto = require('crypto');

// Load environment variables from .env file
require('dotenv').config();

// Get the API key from environment variables
const apiKey = process.env.SUPER_ADMIN_SMS_API_KEY;

if (!apiKey) {
  console.log('❌ SUPER_ADMIN_SMS_API_KEY not found in environment variables');
  console.log('Please set the environment variable first');
  process.exit(1);
}

console.log('🔍 Verifying MD5 hash of API key...');
console.log('API Key:', apiKey);
console.log('API Key Length:', apiKey.length);

// Create MD5 hash
const md5Hash = crypto.createHash('md5').update(apiKey).digest('hex');

console.log('📊 MD5 Hash Result:');
console.log('Generated Hash:', md5Hash);
console.log('Expected Hash:  d8b28328af6bf36311be04368e420336');
console.log('Match:', md5Hash === 'd8b28328af6bf36311be04368e420336' ? '✅ YES' : '❌ NO');

if (md5Hash === 'd8b28328af6bf36311be04368e420336') {
  console.log('🎉 MD5 hash matches! The API key is correct.');
} else {
  console.log('⚠️  MD5 hash does not match. Please check the API key.');
}
