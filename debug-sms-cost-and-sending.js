// Debug script to investigate SMS cost and sending issues
// This script will check SMS cost calculation and sending status

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSCostAndSending() {
  console.log('🔍 Debugging SMS Cost and Sending Issues')
  console.log('========================================\n')

  try {
    // Step 1: Check recent campaigns and their costs
    console.log('📋 Step 1: Checking recent SMS campaigns and costs...')
    
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
      console.log(`   Total Recipients: ${campaign.total_recipients || 0}`)
      console.log(`   Cost per Recipient: ${campaign.total_recipients > 0 ? (campaign.total_cost / campaign.total_recipients).toFixed(4) : 'N/A'} KES`)
      console.log(`   Created: ${campaign.created_at}`)
      console.log(`   Sent At: ${campaign.sent_at || 'Not sent'}`)
    })

    // Step 2: Check SMS settings and their costs
    console.log('\n📋 Step 2: Checking SMS settings and costs...')
    
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
      
      smsSettings?.forEach((setting, index) => {
        console.log(`\n📊 SMS Settings ${index + 1}:`)
        console.log(`   Partner: ${setting.partners?.name}`)
        console.log(`   Sender ID: ${setting.damza_sender_id}`)
        console.log(`   SMS Enabled: ${setting.sms_enabled}`)
        console.log(`   Cost per SMS: ${setting.sms_charge_per_message} KES`)
        console.log(`   Low Balance Threshold: ${setting.low_balance_threshold} KES`)
        console.log(`   API Key: ${setting.damza_api_key ? 'Set (encrypted)' : 'Not set'}`)
        console.log(`   Username: ${setting.damza_username ? 'Set (encrypted)' : 'Not set'}`)
        console.log(`   Password: ${setting.damza_password ? 'Set (encrypted)' : 'Not set'}`)
      })
    }

    // Step 3: Check SMS notifications and their costs
    console.log('\n📋 Step 3: Checking SMS notifications and costs...')
    
    const { data: notifications, error: notificationsError } = await supabase
      .from('sms_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (notificationsError) {
      console.log('❌ Error fetching notifications:', notificationsError)
    } else {
      console.log(`✅ Found ${notifications?.length || 0} SMS notifications`)
      
      const statusCounts = notifications?.reduce((acc, notif) => {
        acc[notif.status] = (acc[notif.status] || 0) + 1
        return acc
      }, {}) || {}

      console.log('📊 Status breakdown:')
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   ${status}: ${count}`)
      })

      // Show sample notifications with costs
      console.log('\n📊 Sample SMS notifications with costs:')
      notifications?.slice(0, 5).forEach((notif, index) => {
        console.log(`   ${index + 1}. Phone: ${notif.recipient_phone}`)
        console.log(`      Status: ${notif.status}`)
        console.log(`      SMS Cost: ${notif.sms_cost || 0} KES`)
        console.log(`      Message: ${notif.message_content?.substring(0, 50)}...`)
        console.log(`      Created: ${notif.created_at}`)
      })
    }

    // Step 4: Check partner wallets and balances
    console.log('\n📋 Step 4: Checking partner wallets and balances...')
    
    const { data: wallets, error: walletsError } = await supabase
      .from('partner_wallets')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code
        )
      `)

    if (walletsError) {
      console.log('❌ Error fetching wallets:', walletsError)
    } else {
      console.log(`✅ Found ${wallets?.length || 0} partner wallets`)
      
      wallets?.forEach((wallet, index) => {
        console.log(`\n📊 Wallet ${index + 1}:`)
        console.log(`   Partner: ${wallet.partners?.name}`)
        console.log(`   Current Balance: ${wallet.current_balance || 0} KES`)
        console.log(`   Last Updated: ${wallet.updated_at}`)
      })
    }

    // Step 5: Test SMS cost calculation
    console.log('\n📋 Step 5: Testing SMS cost calculation...')
    
    if (smsSettings && smsSettings.length > 0) {
      const smsSetting = smsSettings[0]
      const testMessage = 'This is a test message to calculate SMS cost'
      const messageLength = testMessage.length
      const costPerMessage = smsSetting.sms_charge_per_message || 0.50
      
      // Calculate SMS cost based on length
      const smsLength = messageLength
      const smsCount = Math.ceil(smsLength / 160) // Assuming 160 chars per SMS
      const calculatedCost = smsCount * costPerMessage
      
      console.log('🧮 SMS Cost Calculation:')
      console.log(`   Message: "${testMessage}"`)
      console.log(`   Message Length: ${messageLength} characters`)
      console.log(`   SMS Count: ${smsCount} (${messageLength} chars ÷ 160 = ${smsCount})`)
      console.log(`   Cost per SMS: ${costPerMessage} KES`)
      console.log(`   Total Cost: ${calculatedCost} KES`)
      
      // Check if this matches what's in the database
      const recentNotification = notifications?.[0]
      if (recentNotification) {
        console.log(`\n📊 Database vs Calculated Cost:`)
        console.log(`   Database SMS Cost: ${recentNotification.sms_cost || 0} KES`)
        console.log(`   Calculated Cost: ${calculatedCost} KES`)
        console.log(`   Match: ${(recentNotification.sms_cost || 0) === calculatedCost ? '✅ YES' : '❌ NO'}`)
      }
    }

    // Step 6: Check for cost calculation issues
    console.log('\n📋 Step 6: Analyzing cost calculation issues...')
    
    const costIssues = []
    
    // Check if campaigns have correct costs
    campaigns?.forEach((campaign, index) => {
      if (campaign.total_recipients > 0) {
        const expectedCost = campaign.total_recipients * (smsSettings?.[0]?.sms_charge_per_message || 0.50)
        const actualCost = campaign.total_cost || 0
        
        if (Math.abs(actualCost - expectedCost) > 0.01) { // Allow for small rounding differences
          costIssues.push({
            campaign: campaign.campaign_name,
            expected: expectedCost,
            actual: actualCost,
            recipients: campaign.total_recipients,
            costPerSMS: smsSettings?.[0]?.sms_charge_per_message || 0.50
          })
        }
      }
    })
    
    if (costIssues.length > 0) {
      console.log('❌ Cost calculation issues found:')
      costIssues.forEach((issue, index) => {
        console.log(`   ${index + 1}. Campaign: ${issue.campaign}`)
        console.log(`      Expected Cost: ${issue.expected} KES`)
        console.log(`      Actual Cost: ${issue.actual} KES`)
        console.log(`      Recipients: ${issue.recipients}`)
        console.log(`      Cost per SMS: ${issue.costPerSMS} KES`)
      })
    } else {
      console.log('✅ No cost calculation issues found')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 SMS Cost and Sending Analysis:')
    console.log('=================================')
    console.log('Based on the investigation, the issues are likely:')
    console.log('')
    console.log('1. 💰 SMS COST ISSUES:')
    console.log('   - Cost not being calculated correctly from partner settings')
    console.log('   - Campaign total_cost not matching recipient count × cost per SMS')
    console.log('   - SMS notifications not using correct cost per message')
    console.log('')
    console.log('2. 📱 SMS SENDING ISSUES:')
    console.log('   - API format still not correct')
    console.log('   - Credentials not working')
    console.log('   - AirTouch service issues')
    console.log('')
    console.log('3. 🔧 POSSIBLE FIXES:')
    console.log('   - Update SMS cost calculation logic')
    console.log('   - Ensure partner SMS settings are used for cost calculation')
    console.log('   - Fix API request format issues')
    console.log('   - Add better error handling and logging')
    
    console.log('\n💡 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Fix SMS cost calculation to use partner settings')
    console.log('2. 🔧 Update campaign cost calculation logic')
    console.log('3. 🔧 Fix SMS sending API format issues')
    console.log('4. 🔧 Add better error handling and logging')
    console.log('5. 🔧 Test with real credentials and phone numbers')
  }
}

debugSMSCostAndSending()
