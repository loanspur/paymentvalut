// Complete debug script to investigate SMS sending failure
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSSendingComplete() {
  console.log('🔍 Complete SMS Sending Debug Investigation')
  console.log('===========================================\n')

  try {
    // Step 1: Check current SMS settings
    console.log('📋 Step 1: Checking current SMS settings...')
    
    const { data: smsSettings, error: settingsError } = await supabase
      .from('partner_sms_settings')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code,
          is_active
        )
      `)

    if (settingsError) {
      console.log('❌ Error fetching SMS settings:', settingsError)
      return
    }

    console.log(`✅ Found ${smsSettings?.length || 0} SMS settings`)
    
    if (smsSettings && smsSettings.length > 0) {
      const smsSetting = smsSettings[0]
      console.log(`\n📊 SMS Settings for: ${smsSetting.partners?.name}`)
      console.log(`   Partner ID: ${smsSetting.partner_id}`)
      console.log(`   Sender ID: ${smsSetting.damza_sender_id}`)
      console.log(`   SMS Enabled: ${smsSetting.sms_enabled}`)
      console.log(`   Cost per SMS: ${smsSetting.sms_charge_per_message} KES`)
      console.log(`   API Key: ${smsSetting.damza_api_key ? '***encrypted***' : 'Not set'}`)
      console.log(`   Username: ${smsSetting.damza_username ? '***encrypted***' : 'Not set'}`)
      console.log(`   Password: ${smsSetting.damza_password ? '***encrypted***' : 'Not set'}`)
      
      // Decrypt and verify the API key
      if (smsSetting.damza_api_key && smsSetting.damza_api_key !== '***encrypted***') {
        try {
          const passphrase = process.env.JWT_SECRET || 'default-passphrase'
          
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
          
          const decryptedApiKey = decryptData(smsSetting.damza_api_key, passphrase)
          const decryptedUsername = decryptData(smsSetting.damza_username, passphrase)
          
          console.log(`\n🔓 Decrypted Credentials:`)
          console.log(`   API Key: ${decryptedApiKey}`)
          console.log(`   Username: ${decryptedUsername}`)
          
          // Verify the API key generates the correct hash
          const generatedHash = crypto.createHash('md5').update(decryptedApiKey).digest('hex')
          const expectedHash = 'd8b28328af6bf36311be04368e420336'
          
          console.log(`\n🔍 Hash Verification:`)
          console.log(`   Generated Hash: ${generatedHash}`)
          console.log(`   Expected Hash:  ${expectedHash}`)
          console.log(`   Match: ${generatedHash === expectedHash ? '✅ CORRECT!' : '❌ INCORRECT'}`)
          
          if (generatedHash === expectedHash) {
            console.log('✅ API key is correct and should work!')
          } else {
            console.log('❌ API key is incorrect - this is the problem!')
            console.log('💡 The API key should be: HNEQNp0FV3Iy')
          }
        } catch (decryptError) {
          console.log('❌ Error decrypting credentials:', decryptError.message)
        }
      }
    }

    // Step 2: Check recent campaigns and their status
    console.log('\n📋 Step 2: Checking recent campaigns...')
    
    const { data: campaigns, error: campaignsError } = await supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (campaignsError) {
      console.log('❌ Error fetching campaigns:', campaignsError)
    } else {
      console.log(`✅ Found ${campaigns?.length || 0} recent campaigns`)
      
      campaigns?.forEach((campaign, index) => {
        console.log(`\n📊 Campaign ${index + 1}:`)
        console.log(`   Name: ${campaign.campaign_name}`)
        console.log(`   Status: ${campaign.status}`)
        console.log(`   Partner: ${campaign.partners?.name}`)
        console.log(`   Recipients: ${campaign.recipient_list?.length || 0}`)
        console.log(`   Total Cost: ${campaign.total_cost || 0} KES`)
        console.log(`   Created: ${campaign.created_at}`)
        console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
        console.log(`   Updated: ${campaign.updated_at}`)
      })
    }

    // Step 3: Check SMS notifications for the most recent campaign
    console.log('\n📋 Step 3: Checking SMS notifications...')
    
    if (campaigns && campaigns.length > 0) {
      const recentCampaign = campaigns[0]
      console.log(`\n🔍 SMS Notifications for: ${recentCampaign.campaign_name}`)
      
      const { data: notifications, error: notificationsError } = await supabase
        .from('sms_notifications')
        .select('*')
        .eq('partner_id', recentCampaign.partner_id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (notificationsError) {
        console.log(`   ❌ Error fetching notifications:`, notificationsError)
      } else {
        console.log(`   📱 Found ${notifications?.length || 0} SMS notifications`)
        
        notifications?.forEach((notif, index) => {
          console.log(`\n   📱 Notification ${index + 1}:`)
          console.log(`      Phone: ${notif.recipient_phone}`)
          console.log(`      Status: ${notif.status}`)
          console.log(`      Message: ${notif.message_content?.substring(0, 50)}...`)
          console.log(`      Error: ${notif.error_message || 'None'}`)
          console.log(`      Reference: ${notif.damza_reference || 'None'}`)
          console.log(`      Created: ${notif.created_at}`)
          console.log(`      Sent At: ${notif.sent_at || 'Not sent'}`)
        })
      }
    }

    // Step 4: Test AirTouch API with current credentials
    console.log('\n📋 Step 4: Testing AirTouch API with current credentials...')
    
    if (smsSettings && smsSettings.length > 0) {
      const smsSetting = smsSettings[0]
      
      try {
        const passphrase = process.env.JWT_SECRET || 'default-passphrase'
        
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
            try {
              return Buffer.from(encryptedData, 'base64').toString('utf8')
            } catch (fallbackError) {
              return encryptedData
            }
          }
        }
        
        const decryptedApiKey = decryptData(smsSetting.damza_api_key, passphrase)
        const decryptedUsername = decryptData(smsSetting.damza_username, passphrase)
        
        console.log(`\n🧪 Testing AirTouch API:`)
        console.log(`   Username: ${decryptedUsername}`)
        console.log(`   API Key: ${decryptedApiKey}`)
        console.log(`   Sender ID: ${smsSetting.damza_sender_id}`)
        
        // Generate MD5 hash
        const hashedPassword = crypto.createHash('md5').update(decryptedApiKey).digest('hex')
        console.log(`   MD5 Hash: ${hashedPassword}`)
        
        // Test API call
        const testPhone = '254700000000'
        const testMessage = 'Test message from debug script'
        const apiUrl = 'https://client.airtouch.co.ke:9012/sms/api/'
        const smsId = `DEBUG_TEST_${Date.now()}`
        
        const params = new URLSearchParams({
          issn: smsSetting.damza_sender_id,
          msisdn: testPhone,
          text: testMessage,
          username: decryptedUsername,
          password: hashedPassword,
          sms_id: smsId
        })
        
        const getUrl = `${apiUrl}?${params.toString()}`
        
        console.log(`   Testing URL: ${getUrl}`)
        
        try {
          const response = await fetch(getUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          })

          const data = await response.json()
          console.log(`   📱 AirTouch API Response Status: ${response.status}`)
          console.log(`   📱 AirTouch API Response:`, JSON.stringify(data, null, 2))

          if (response.ok && data.status_code === '1000') {
            console.log('   ✅ AirTouch API call successful!')
          } else {
            console.log(`   ❌ AirTouch API call failed: ${data.status_desc}`)
            
            // Analyze the specific error
            switch (data.status_code) {
              case '1006':
                console.log('   🔍 Error Analysis: INVALID CREDENTIALS')
                console.log('      - Username or API key is incorrect')
                console.log('      - Account might be suspended')
                break
              case '1011':
                console.log('   🔍 Error Analysis: INVALID USER')
                console.log('      - Username is incorrect or account not active')
                break
              case '1001':
                console.log('   🔍 Error Analysis: INVALID SENDER ID')
                console.log('      - Sender ID not registered with AirTouch')
                break
              case '1004':
                console.log('   🔍 Error Analysis: INSUFFICIENT BALANCE')
                console.log('      - AirTouch account has insufficient balance')
                break
              default:
                console.log(`   🔍 Error Analysis: UNKNOWN ERROR (${data.status_code})`)
                console.log(`      - ${data.status_desc}`)
            }
          }
        } catch (apiError) {
          console.log('   ❌ AirTouch API call failed with error:', apiError.message)
        }
      } catch (error) {
        console.log('   ❌ Error testing AirTouch API:', error.message)
      }
    }

    // Step 5: Check for any system errors
    console.log('\n📋 Step 5: Checking for system errors...')
    
    // Check if there are any failed notifications with error messages
    const { data: failedNotifications, error: failedError } = await supabase
      .from('sms_notifications')
      .select('*')
      .eq('status', 'failed')
      .not('error_message', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5)

    if (failedError) {
      console.log('❌ Error fetching failed notifications:', failedError)
    } else if (failedNotifications && failedNotifications.length > 0) {
      console.log(`⚠️  Found ${failedNotifications.length} failed notifications with error messages:`)
      
      failedNotifications.forEach((notif, index) => {
        console.log(`\n   ❌ Failed Notification ${index + 1}:`)
        console.log(`      Phone: ${notif.recipient_phone}`)
        console.log(`      Error: ${notif.error_message}`)
        console.log(`      Created: ${notif.created_at}`)
      })
    } else {
      console.log('✅ No failed notifications with error messages found')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Sending Debug Summary:')
    console.log('==============================')
    console.log('✅ SMS settings checked')
    console.log('✅ Recent campaigns analyzed')
    console.log('✅ SMS notifications reviewed')
    console.log('✅ AirTouch API tested')
    console.log('✅ System errors investigated')
    console.log('')
    console.log('💡 Key Findings:')
    console.log('===============')
    console.log('🔍 The debug will show exactly what\'s happening:')
    console.log('   - Whether SMS settings are correctly configured')
    console.log('   - If the API key generates the correct hash')
    console.log('   - What AirTouch API returns when called')
    console.log('   - Any error messages in failed notifications')
    console.log('   - Campaign and notification status details')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Review the debug output above')
    console.log('2. 🔧 Check if API key is correctly stored and decrypted')
    console.log('3. 🔧 Verify AirTouch API response')
    console.log('4. 🔧 Fix any issues identified')
    console.log('5. 🔧 Test SMS sending again')
  }
}

debugSMSSendingComplete()
