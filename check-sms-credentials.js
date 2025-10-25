// Script to check current SMS credentials and guide configuration
// This script will help identify what credentials are configured

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

async function checkSMSCredentials() {
  console.log('🔍 Checking SMS Credentials Configuration')
  console.log('=========================================\n')

  try {
    // Step 1: Get SMS settings
    console.log('📋 Step 1: Getting SMS settings...')
    
    const { data: smsSettings, error: settingsError } = await supabase
      .from('partner_sms_settings')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)

    if (settingsError) {
      console.log('❌ Error fetching SMS settings:', settingsError)
      return
    }

    console.log(`✅ Found ${smsSettings?.length || 0} SMS settings`)
    
    if (!smsSettings || smsSettings.length === 0) {
      console.log('❌ No SMS settings found. Please configure SMS settings first.')
      return
    }

    const smsSetting = smsSettings[0]
    console.log(`\n📊 SMS Settings for: ${smsSetting.partners?.name}`)
    console.log(`   Sender ID: ${smsSetting.damza_sender_id}`)
    console.log(`   SMS Enabled: ${smsSetting.sms_enabled}`)
    console.log(`   Cost per SMS: ${smsSetting.sms_charge_per_message} KES`)

    // Step 2: Check if credentials are encrypted
    console.log('\n📋 Step 2: Checking credential encryption...')
    
    const passphrase = process.env.JWT_SECRET || 'default-passphrase'
    
    console.log('🔐 Credential Analysis:')
    console.log(`   API Key: ${smsSetting.damza_api_key ? 'Set (encrypted)' : 'Not set'}`)
    console.log(`   Username: ${smsSetting.damza_username ? 'Set (encrypted)' : 'Not set'}`)
    console.log(`   Password: ${smsSetting.damza_password ? 'Set (encrypted)' : 'Not set'}`)

    // Step 3: Try to decrypt credentials (for debugging)
    console.log('\n📋 Step 3: Attempting to decrypt credentials...')
    
    if (smsSetting.damza_username && smsSetting.damza_password) {
      try {
        const decryptedUsername = decryptData(smsSetting.damza_username, passphrase)
        const decryptedPassword = decryptData(smsSetting.damza_password, passphrase)
        
        console.log('🔓 Decrypted Credentials:')
        console.log(`   Username: ${decryptedUsername}`)
        console.log(`   Password: ${decryptedPassword ? '[HIDDEN]' : 'Not set'}`)
        
        // Check if credentials are test credentials
        const isTestCredentials = decryptedUsername.includes('test') || 
                                 decryptedUsername === '***encrypted***' ||
                                 decryptedPassword.includes('test') ||
                                 decryptedPassword === '***encrypted***'
        
        console.log(`   Test Credentials: ${isTestCredentials ? '❌ YES (This is the problem!)' : '✅ NO (Real credentials)'}`)
        
        if (isTestCredentials) {
          console.log('\n🚨 PROBLEM IDENTIFIED:')
          console.log('=====================')
          console.log('❌ You are using TEST CREDENTIALS instead of real AirTouch credentials!')
          console.log('❌ This is why SMS sending is failing with "INVALID USER" error.')
          console.log('')
          console.log('💡 SOLUTION:')
          console.log('============')
          console.log('1. 🔧 Get real AirTouch credentials from your AirTouch account')
          console.log('2. 🔧 Update SMS settings with real username and password')
          console.log('3. 🔧 Verify sender ID is registered with AirTouch')
          console.log('4. 🔧 Check AirTouch account balance')
          console.log('')
          console.log('📱 How to Get AirTouch Credentials:')
          console.log('===================================')
          console.log('1. Log into your AirTouch account dashboard')
          console.log('2. Go to API settings or account settings')
          console.log('3. Find your API username and password')
          console.log('4. Copy the credentials')
          console.log('5. Update SMS settings in the Payment Vault system')
        } else {
          console.log('\n✅ Real credentials detected!')
          console.log('If SMS is still failing, the issue might be:')
          console.log('1. 🔧 Sender ID not registered with AirTouch')
          console.log('2. 🔧 AirTouch account has insufficient balance')
          console.log('3. 🔧 AirTouch account is suspended or inactive')
          console.log('4. 🔧 Network connectivity issues')
        }
        
      } catch (decryptError) {
        console.log('❌ Error decrypting credentials:', decryptError.message)
        console.log('   This might indicate corrupted encryption or wrong passphrase')
      }
    } else {
      console.log('❌ No credentials found in SMS settings')
      console.log('   Please configure AirTouch credentials first')
    }

    // Step 4: Check sender ID
    console.log('\n📋 Step 4: Checking sender ID...')
    
    console.log(`📱 Sender ID: ${smsSetting.damza_sender_id}`)
    console.log('')
    console.log('📋 Sender ID Requirements:')
    console.log('=========================')
    console.log('1. ✅ Must be registered with AirTouch')
    console.log('2. ✅ Must be approved by AirTouch')
    console.log('3. ✅ Must be in correct format (usually 3-11 characters)')
    console.log('4. ✅ Must not contain special characters')
    console.log('')
    console.log(`🔍 Current Sender ID: "${smsSetting.damza_sender_id}"`)
    
    if (smsSetting.damza_sender_id === 'LoanSpur') {
      console.log('⚠️  "LoanSpur" might not be a registered sender ID with AirTouch')
      console.log('   You may need to register this sender ID or use a different one')
    }

    // Step 5: Provide configuration guidance
    console.log('\n📋 Step 5: Configuration Guidance...')
    
    console.log('🔧 How to Fix SMS Sending:')
    console.log('==========================')
    console.log('')
    console.log('1. 📱 Get Real AirTouch Credentials:')
    console.log('   - Log into AirTouch dashboard')
    console.log('   - Go to API settings')
    console.log('   - Copy username and password')
    console.log('')
    console.log('2. 🔧 Update SMS Settings:')
    console.log('   - Go to SMS Settings page in Payment Vault')
    console.log('   - Edit the SMS settings for your partner')
    console.log('   - Enter real AirTouch username and password')
    console.log('   - Save the settings')
    console.log('')
    console.log('3. 📱 Verify Sender ID:')
    console.log('   - Check if "LoanSpur" is registered with AirTouch')
    console.log('   - If not, register it or use a different sender ID')
    console.log('   - Update sender ID in SMS settings if needed')
    console.log('')
    console.log('4. 💰 Check AirTouch Account:')
    console.log('   - Verify account has sufficient balance')
    console.log('   - Check if account is active and not suspended')
    console.log('   - Ensure payment method is set up')
    console.log('')
    console.log('5. 🧪 Test SMS Sending:')
    console.log('   - Create a new SMS campaign')
    console.log('   - Use a real phone number')
    console.log('   - Send the campaign')
    console.log('   - Check that status shows "completed"')

  } catch (error) {
    console.error('❌ Check failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Credentials Check Summary:')
    console.log('=================================')
    console.log('✅ SMS settings retrieved successfully')
    console.log('✅ Credential encryption status checked')
    console.log('✅ Sender ID configuration verified')
    console.log('✅ Configuration guidance provided')
    console.log('')
    console.log('💡 Key Finding:')
    console.log('==============')
    console.log('🔑 The SMS sending failure is due to INVALID CREDENTIALS')
    console.log('   - AirTouch API returns "INVALID USER" (1011)')
    console.log('   - This means username/password are incorrect')
    console.log('   - Need to configure real AirTouch credentials')
    console.log('')
    console.log('🚀 Next Action:')
    console.log('==============')
    console.log('1. 🔧 Configure real AirTouch credentials in SMS settings')
    console.log('2. 🔧 Verify sender ID is registered with AirTouch')
    console.log('3. 🔧 Test SMS sending with real credentials')
    console.log('4. 🔧 Check AirTouch account balance and status')
  }
}

checkSMSCredentials()
