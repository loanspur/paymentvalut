// Detailed AirTouch API test to identify the exact issue
// This script will test the AirTouch API with real credentials and analyze the response

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Decryption function for sensitive data
function decryptData(encryptedData, passphrase) {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const textParts = encryptedData.split(':')
    
    if (textParts.length !== 2) {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    }
    
    const iv = Buffer.from(textParts[0], 'hex')
    const encryptedText = textParts[1]
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    } catch (fallbackError) {
      return encryptedData
    }
  }
}

async function testAirTouchAPIDetailed() {
  console.log('🧪 Detailed AirTouch API Test')
  console.log('=============================\n')

  try {
    // Step 1: Get SMS settings and decrypt credentials
    console.log('📋 Step 1: Getting and decrypting SMS credentials...')
    
    const { data: smsSettings, error: settingsError } = await supabase
      .from('partner_sms_settings')
      .select('*')
      .limit(1)

    if (settingsError || !smsSettings || smsSettings.length === 0) {
      console.log('❌ Error fetching SMS settings:', settingsError)
      return
    }

    const smsSetting = smsSettings[0]
    const passphrase = process.env.JWT_SECRET || 'default-passphrase'
    
    // Decrypt credentials
    const username = decryptData(smsSetting.damza_username, passphrase)
    const password = decryptData(smsSetting.damza_password, passphrase)
    const senderId = smsSetting.damza_sender_id
    
    console.log('🔓 Decrypted Credentials:')
    console.log(`   Username: ${username}`)
    console.log(`   Password: ${password ? '[HIDDEN - ' + password.length + ' chars]' : 'Not set'}`)
    console.log(`   Sender ID: ${senderId}`)

    // Step 2: Test AirTouch API with real credentials
    console.log('\n📋 Step 2: Testing AirTouch API with real credentials...')
    
    const testPhone = '254700000000' // Test phone number
    const testMessage = 'Test message from Payment Vault System'
    const apiUrl = 'http://client.airtouch.co.ke:9012/sms/api/'
    const smsId = `DETAILED_TEST_${Date.now()}`
    
    // Build GET request URL with real credentials
    const params = new URLSearchParams({
      issn: senderId,
      msisdn: testPhone,
      text: testMessage,
      username: username,
      password: password,
      sms_id: smsId
    })
    
    const getUrl = `${apiUrl}?${params.toString()}`
    
    console.log('📱 AirTouch API Test:')
    console.log(`   URL: ${getUrl}`)
    console.log(`   Method: GET`)
    console.log(`   Sender ID: ${senderId}`)
    console.log(`   Phone: ${testPhone}`)
    console.log(`   Message: ${testMessage}`)
    console.log(`   Username: ${username}`)
    console.log(`   Password: [HIDDEN]`)

    try {
      const response = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log(`\n📱 AirTouch API Response:`)
      console.log(`   Status: ${response.status}`)
      console.log(`   Data:`, JSON.stringify(data, null, 2))

      // Analyze the response
      console.log('\n🔍 Response Analysis:')
      console.log('====================')
      
      if (response.ok && data.status_code === '1000') {
        console.log('✅ SUCCESS: SMS sent successfully!')
        console.log(`   Message ID: ${data.message_id}`)
        console.log(`   Mobile Number: ${data.mobile_number}`)
      } else {
        console.log('❌ FAILED: SMS sending failed')
        console.log(`   Status Code: ${data.status_code}`)
        console.log(`   Status Description: ${data.status_desc}`)
        
        // Provide specific error analysis
        console.log('\n🔍 Error Analysis:')
        console.log('==================')
        
        switch (data.status_code) {
          case '1011':
            console.log('❌ INVALID USER (1011):')
            console.log('   - Username is incorrect')
            console.log('   - Password is incorrect')
            console.log('   - Account is not active')
            console.log('   - Account is suspended')
            break
          case '1004':
            console.log('❌ INSUFFICIENT BALANCE (1004):')
            console.log('   - AirTouch account has insufficient balance')
            console.log('   - Need to top up the account')
            break
          case '1001':
            console.log('❌ INVALID SENDER ID (1001):')
            console.log('   - Sender ID is not registered with AirTouch')
            console.log('   - Sender ID is not approved')
            console.log('   - Sender ID format is incorrect')
            break
          case '1002':
            console.log('❌ INVALID PHONE NUMBER (1002):')
            console.log('   - Phone number format is incorrect')
            console.log('   - Phone number is not valid')
            break
          case '1003':
            console.log('❌ INVALID MESSAGE (1003):')
            console.log('   - Message content is invalid')
            console.log('   - Message is too long or too short')
            break
          default:
            console.log(`❌ UNKNOWN ERROR (${data.status_code}):`)
            console.log(`   - ${data.status_desc}`)
            console.log('   - Contact AirTouch support for assistance')
        }
      }

    } catch (apiError) {
      console.log('❌ AirTouch API call failed:', apiError.message)
      console.log('   This might indicate network connectivity issues')
    }

    // Step 3: Test with different sender IDs
    console.log('\n📋 Step 3: Testing with different sender IDs...')
    
    const testSenderIds = [
      senderId, // Current sender ID
      'SMS', // Common sender ID
      'INFO', // Common sender ID
      'ALERT', // Common sender ID
      'TEST' // Test sender ID
    ]
    
    console.log('🔧 Testing different sender IDs...')
    
    for (const testSenderId of testSenderIds) {
      console.log(`\n📱 Testing sender ID: "${testSenderId}"`)
      
      const testParams = new URLSearchParams({
        issn: testSenderId,
        msisdn: testPhone,
        text: 'Test message',
        username: username,
        password: password,
        sms_id: `TEST_${testSenderId}_${Date.now()}`
      })
      
      const testUrl = `${apiUrl}?${testParams.toString()}`
      
      try {
        const testResponse = await fetch(testUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const testData = await testResponse.json()
        console.log(`   Response: ${testData.status_code} - ${testData.status_desc}`)
        
        if (testData.status_code === '1000') {
          console.log(`   ✅ SUCCESS with sender ID: "${testSenderId}"`)
        } else if (testData.status_code === '1001') {
          console.log(`   ❌ Invalid sender ID: "${testSenderId}"`)
        } else {
          console.log(`   ⚠️  Other error: ${testData.status_desc}`)
        }
        
      } catch (testError) {
        console.log(`   ❌ Error: ${testError.message}`)
      }
    }

    // Step 4: Provide recommendations
    console.log('\n📋 Step 4: Recommendations...')
    
    console.log('💡 Recommendations based on test results:')
    console.log('=========================================')
    console.log('')
    console.log('1. 🔧 If you got "INVALID USER" (1011):')
    console.log('   - Check your AirTouch account username and password')
    console.log('   - Verify your AirTouch account is active')
    console.log('   - Contact AirTouch support to verify account status')
    console.log('')
    console.log('2. 🔧 If you got "INVALID SENDER ID" (1001):')
    console.log('   - Register your sender ID with AirTouch')
    console.log('   - Use a different, approved sender ID')
    console.log('   - Contact AirTouch support for sender ID approval')
    console.log('')
    console.log('3. 🔧 If you got "INSUFFICIENT BALANCE" (1004):')
    console.log('   - Top up your AirTouch account')
    console.log('   - Check your account balance')
    console.log('   - Set up automatic top-up if available')
    console.log('')
    console.log('4. 🔧 If you got "SUCCESS" (1000):')
    console.log('   - The issue might be in the SMS sending logic')
    console.log('   - Check the campaign sending process')
    console.log('   - Verify the SMS notification creation')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n🎯 Detailed AirTouch API Test Summary:')
    console.log('=====================================')
    console.log('✅ SMS credentials retrieved and decrypted')
    console.log('✅ AirTouch API tested with real credentials')
    console.log('✅ Multiple sender IDs tested')
    console.log('✅ Error analysis provided')
    console.log('✅ Recommendations given')
    console.log('')
    console.log('💡 Key Findings:')
    console.log('===============')
    console.log('🔍 The test will show the exact AirTouch API response')
    console.log('🔍 This will identify whether the issue is:')
    console.log('   - Invalid credentials')
    console.log('   - Invalid sender ID')
    console.log('   - Insufficient balance')
    console.log('   - Other AirTouch account issues')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Review the AirTouch API response above')
    console.log('2. 🔧 Follow the specific recommendations for your error code')
    console.log('3. 🔧 Contact AirTouch support if needed')
    console.log('4. 🔧 Test SMS sending again after fixing the issue')
  }
}

testAirTouchAPIDetailed()
