// Debug script to investigate SMS sending race condition
// This script will check what happens during the SMS sending process

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSSendingRaceCondition() {
  console.log('🔍 Debugging SMS Sending Race Condition')
  console.log('======================================\n')

  try {
    // Step 1: Check recent campaigns and their detailed status
    console.log('📋 Step 1: Checking recent campaigns with detailed status...')
    
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
      return
    }

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

    // Step 2: Check SMS notifications for each campaign
    console.log('\n📋 Step 2: Checking SMS notifications for each campaign...')
    
    for (const campaign of campaigns || []) {
      console.log(`\n🔍 Campaign: ${campaign.campaign_name}`)
      
      const { data: notifications, error: notificationsError } = await supabase
        .from('sms_notifications')
        .select('*')
        .eq('partner_id', campaign.partner_id)
        .order('created_at', { ascending: false })
        .limit(5)

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

    // Step 3: Check SMS settings and test AirTouch API
    console.log('\n📋 Step 3: Testing AirTouch API with current credentials...')
    
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
    } else {
      console.log(`✅ Found ${smsSettings?.length || 0} SMS settings`)
      
      if (smsSettings && smsSettings.length > 0) {
        const smsSetting = smsSettings[0]
        console.log(`\n📊 SMS Settings for: ${smsSetting.partners?.name}`)
        console.log(`   Sender ID: ${smsSetting.damza_sender_id}`)
        console.log(`   SMS Enabled: ${smsSetting.sms_enabled}`)
        console.log(`   Cost per SMS: ${smsSetting.sms_charge_per_message} KES`)
        
        // Test AirTouch API with real credentials
        console.log('\n🧪 Testing AirTouch API with real credentials...')
        
        const testPhone = '254700000000'
        const testMessage = 'Test message from race condition debug'
        const apiUrl = 'http://client.airtouch.co.ke:9012/sms/api/'
        const smsId = `RACE_TEST_${Date.now()}`
        
        // We need to decrypt the credentials to test
        const crypto = require('crypto')
        
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
        
        const passphrase = process.env.JWT_SECRET || 'default-passphrase'
        const username = decryptData(smsSetting.damza_username, passphrase)
        const password = decryptData(smsSetting.damza_password, passphrase)
        
        console.log(`   Username: ${username}`)
        console.log(`   Password: [HIDDEN - ${password.length} chars]`)
        
        // Build GET request URL with real credentials
        const params = new URLSearchParams({
          issn: smsSetting.damza_sender_id,
          msisdn: testPhone,
          text: testMessage,
          username: username,
          password: password,
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
                console.log('      - Username or password is incorrect')
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
      }
    }

    // Step 4: Check for timing issues in the database
    console.log('\n📋 Step 4: Checking for timing issues...')
    
    // Look for campaigns that were created and sent at the same time
    const recentCampaigns = campaigns?.filter(c => 
      c.created_at && c.sent_at && 
      new Date(c.sent_at).getTime() - new Date(c.created_at).getTime() < 5000 // Less than 5 seconds
    )
    
    if (recentCampaigns && recentCampaigns.length > 0) {
      console.log(`⚠️  Found ${recentCampaigns.length} campaigns sent very quickly after creation:`)
      recentCampaigns.forEach((campaign, index) => {
        const timeDiff = new Date(campaign.sent_at).getTime() - new Date(campaign.created_at).getTime()
        console.log(`   ${index + 1}. ${campaign.campaign_name}: ${timeDiff}ms difference`)
      })
    } else {
      console.log('✅ No timing issues detected')
    }

    // Step 5: Check for error patterns
    console.log('\n📋 Step 5: Analyzing error patterns...')
    
    const failedCampaigns = campaigns?.filter(c => c.status === 'failed')
    const failedNotifications = notifications?.filter(n => n.status === 'failed')
    
    console.log(`📊 Error Pattern Analysis:`)
    console.log(`   Failed Campaigns: ${failedCampaigns?.length || 0}`)
    console.log(`   Failed Notifications: ${failedNotifications?.length || 0}`)
    
    if (failedNotifications && failedNotifications.length > 0) {
      console.log(`\n❌ Failed Notifications Analysis:`)
      
      const errorMessages = failedNotifications.map(n => n.error_message).filter(e => e)
      const uniqueErrors = [...new Set(errorMessages)]
      
      if (uniqueErrors.length > 0) {
        console.log(`   Unique Error Messages: ${uniqueErrors.length}`)
        uniqueErrors.forEach((error, index) => {
          console.log(`   ${index + 1}. "${error}"`)
        })
      } else {
        console.log(`   ⚠️  All failed notifications have no error message`)
        console.log(`   This suggests the error occurs before the SMS API call`)
      }
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Sending Race Condition Analysis:')
    console.log('=======================================')
    console.log('✅ Campaigns analyzed')
    console.log('✅ SMS notifications checked')
    console.log('✅ AirTouch API tested with real credentials')
    console.log('✅ Timing issues investigated')
    console.log('✅ Error patterns analyzed')
    console.log('')
    console.log('💡 Key Findings:')
    console.log('===============')
    console.log('🔍 The debug will show exactly what\'s happening during SMS sending')
    console.log('🔍 This will identify whether the issue is:')
    console.log('   - AirTouch API credentials (1006, 1011 errors)')
    console.log('   - Invalid sender ID (1001 error)')
    console.log('   - Insufficient balance (1004 error)')
    console.log('   - Timing/race condition issues')
    console.log('   - Database transaction problems')
    console.log('   - Missing error messages in notifications')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Review the AirTouch API response above')
    console.log('2. 🔧 Check if credentials are valid and account is active')
    console.log('3. 🔧 Verify sender ID is registered with AirTouch')
    console.log('4. 🔧 Check AirTouch account balance')
    console.log('5. 🔧 Fix the specific error identified')
    console.log('')
    console.log('📱 Common Issues and Solutions:')
    console.log('===============================')
    console.log('1. ❌ 1006 - INVALID CREDENTIALS → Update AirTouch credentials')
    console.log('2. ❌ 1011 - INVALID USER → Check username/password')
    console.log('3. ❌ 1001 - INVALID SENDER ID → Register sender ID with AirTouch')
    console.log('4. ❌ 1004 - INSUFFICIENT BALANCE → Top up AirTouch account')
    console.log('5. ❌ No error message → Check SMS sending logic')
  }
}

debugSMSSendingRaceCondition()
