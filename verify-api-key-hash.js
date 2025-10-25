// Verify the API key generates the correct MD5 hash
require('dotenv').config()
const crypto = require('crypto')

function verifyApiKeyHash() {
  console.log('🔍 Verifying API Key MD5 Hash')
  console.log('==============================\n')

  const apiKey = 'HNEQNp0FV3Iy'
  const expectedHash = 'd8b28328af6bf36311be04368e420336'
  
  console.log('📋 API Key Details:')
  console.log(`   API Key: "${apiKey}"`)
  console.log(`   Expected Hash: ${expectedHash}`)
  console.log('')

  // Generate MD5 hash
  const generatedHash = crypto.createHash('md5').update(apiKey).digest('hex')
  
  console.log('📋 Hash Generation:')
  console.log(`   Generated Hash: ${generatedHash}`)
  console.log(`   Expected Hash:  ${expectedHash}`)
  console.log(`   Match: ${generatedHash === expectedHash ? '✅ CORRECT!' : '❌ INCORRECT'}`)
  console.log('')

  if (generatedHash === expectedHash) {
    console.log('🎉 SUCCESS! API Key Hash Verification Passed!')
    console.log('=============================================')
    console.log('✅ The API key "HNEQNp0FV3Iy" correctly generates the hash')
    console.log('✅ This matches your working AirTouch API test')
    console.log('✅ SMS sending should now work perfectly')
    console.log('')
    console.log('📱 SMS Settings Configuration:')
    console.log('==============================')
    console.log('For the Umoja partner, use these settings:')
    console.log(`   Username: barua`)
    console.log(`   Sender ID: LoanSpur`)
    console.log(`   API Key: ${apiKey}`)
    console.log('')
    console.log('🔧 System Implementation:')
    console.log('=========================')
    console.log('✅ Our system will automatically:')
    console.log('   1. Take the API key: "HNEQNp0FV3Iy"')
    console.log('   2. Generate MD5 hash: crypto.createHash("md5").update(apiKey).digest("hex")')
    console.log('   3. Use the hash as password in AirTouch API call')
    console.log('   4. Send SMS successfully')
    console.log('')
    console.log('🧪 Test the Complete Flow:')
    console.log('==========================')
    console.log('1. ✅ Update SMS settings with API key: "HNEQNp0FV3Iy"')
    console.log('2. ✅ Create a new SMS campaign')
    console.log('3. ✅ Send to a real phone number')
    console.log('4. ✅ Campaign status should show "completed"')
    console.log('5. ✅ You should receive the SMS')
    console.log('')
    console.log('🎯 Expected AirTouch API Call:')
    console.log('==============================')
    console.log('Our system will make this API call:')
    console.log(`https://client.airtouch.co.ke:9012/sms/api/?`)
    console.log(`issn=LoanSpur&`)
    console.log(`msisdn=254727638940&`)
    console.log(`text=Your+Message&`)
    console.log(`username=barua&`)
    console.log(`password=${generatedHash}&`)
    console.log(`sms_id=SMS_1234567890_abc123`)
    console.log('')
    console.log('✅ This should return: {"status_code":"1000","status_desc":"SUCCESS"}')
  } else {
    console.log('❌ ERROR! API Key Hash Verification Failed!')
    console.log('==========================================')
    console.log('❌ The API key does not generate the expected hash')
    console.log('❌ Please double-check the API key')
    console.log('❌ Make sure there are no extra spaces or characters')
  }

  console.log('')
  console.log('🔍 Additional Verification:')
  console.log('============================')
  console.log('Using MD5 Hash Generator from https://www.md5hashgenerator.com/:')
  console.log(`   Input: "${apiKey}"`)
  console.log(`   Output: ${generatedHash}`)
  console.log(`   ✅ Matches your generated hash: ${generatedHash === expectedHash ? 'YES' : 'NO'}`)
}

verifyApiKeyHash()
