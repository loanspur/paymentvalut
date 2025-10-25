// Script to find the correct API key that generates the working hash
require('dotenv').config()
const crypto = require('crypto')

function findCorrectApiKey() {
  console.log('🔍 Finding Correct API Key for AirTouch')
  console.log('=======================================\n')

  // Your working password hash
  const workingHash = 'd8b28328af6bf36311be04368e420336'
  const workingUsername = 'barua'
  const workingSenderId = 'LoanSpur'
  
  console.log('📋 Working Credentials:')
  console.log(`   Username: ${workingUsername}`)
  console.log(`   Sender ID: ${workingSenderId}`)
  console.log(`   Password Hash: ${workingHash}`)
  console.log('')

  // Common API key patterns to test
  const possibleApiKeys = [
    // Direct variations
    workingUsername, // "barua"
    workingSenderId, // "LoanSpur"
    
    // Common patterns
    `${workingUsername}_api`,
    `${workingUsername}_key`,
    `${workingUsername}_secret`,
    `api_${workingUsername}`,
    `key_${workingUsername}`,
    `secret_${workingUsername}`,
    
    // Sender ID variations
    `${workingSenderId}_api`,
    `${workingSenderId}_key`,
    `${workingSenderId}_secret`,
    `api_${workingSenderId}`,
    `key_${workingSenderId}`,
    `secret_${workingSenderId}`,
    
    // Common API key formats
    'api_key',
    'secret_key',
    'access_key',
    'auth_key',
    'sms_key',
    'bulk_sms_key',
    
    // Numeric variations
    '123456',
    '12345678',
    '123456789',
    '1234567890',
    
    // Mixed variations
    `${workingUsername}123`,
    `${workingUsername}456`,
    `${workingSenderId}123`,
    `${workingSenderId}456`,
    
    // AirTouch specific
    'airtouch',
    'airtouch_key',
    'airtouch_api',
    'bulksms',
    'bulksms_key',
    'bulksms_api',
    
    // Loan/Financial specific
    'loan_key',
    'loan_api',
    'financial_key',
    'financial_api',
    'vault_key',
    'vault_api',
    
    // Simple variations
    'test',
    'demo',
    'prod',
    'production',
    'live',
    'main',
    'primary',
    'default',
    
    // Case variations
    workingUsername.toUpperCase(),
    workingUsername.toLowerCase(),
    workingSenderId.toUpperCase(),
    workingSenderId.toLowerCase(),
    
    // With special characters
    `${workingUsername}@123`,
    `${workingUsername}#123`,
    `${workingUsername}$123`,
    `${workingUsername}%123`,
  ]

  console.log('📋 Testing Possible API Keys:')
  console.log('=============================')
  
  let foundMatch = false
  const matches = []
  
  possibleApiKeys.forEach((apiKey, index) => {
    const hash = crypto.createHash('md5').update(apiKey).digest('hex')
    const matches = hash === workingHash
    
    if (matches) {
      foundMatch = true
      console.log(`   ${index + 1}. "${apiKey}" → ${hash} ✅ MATCH!`)
    } else {
      console.log(`   ${index + 1}. "${apiKey}" → ${hash} ❌`)
    }
  })
  
  console.log('')
  
  if (foundMatch) {
    console.log('🎉 SUCCESS! Found the correct API key!')
    console.log('=====================================')
    console.log('✅ The API key that generates the working hash has been identified')
    console.log('✅ You can now use this API key in your SMS settings')
    console.log('✅ SMS sending should work perfectly')
  } else {
    console.log('❌ No exact match found in common patterns')
    console.log('==========================================')
    console.log('💡 The API key might be:')
    console.log('   - A custom string provided by AirTouch')
    console.log('   - A combination not in our test patterns')
    console.log('   - A specific key from your AirTouch account')
    console.log('')
    console.log('🔧 Next Steps:')
    console.log('==============')
    console.log('1. Check your AirTouch account dashboard for the API key')
    console.log('2. Contact AirTouch support for the correct API key')
    console.log('3. Use the working credentials directly in SMS settings')
  }
  
  console.log('')
  console.log('📱 SMS Settings Configuration:')
  console.log('==============================')
  console.log('For the Umoja partner, use these settings:')
  console.log(`   Username: ${workingUsername}`)
  console.log(`   Sender ID: ${workingSenderId}`)
  console.log(`   API Key: [The key that generates hash ${workingHash}]`)
  console.log('')
  console.log('🔧 How to Update SMS Settings:')
  console.log('==============================')
  console.log('1. Go to SMS Settings page')
  console.log('2. Find the Umoja partner settings')
  console.log('3. Edit the settings')
  console.log('4. Update the API Key field with the correct value')
  console.log('5. Save the settings')
  console.log('6. Test SMS sending')
  
  console.log('')
  console.log('🧪 Test the Fix:')
  console.log('================')
  console.log('After updating the API key:')
  console.log('1. Create a new SMS campaign')
  console.log('2. Send to a real phone number')
  console.log('3. Check that campaign status shows "completed"')
  console.log('4. Verify you receive the SMS')
}

findCorrectApiKey()
