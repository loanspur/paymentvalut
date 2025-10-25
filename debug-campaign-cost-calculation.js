// Debug script to investigate campaign cost calculation issue
// This script will test the campaign cost calculation logic

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugCampaignCostCalculation() {
  console.log('🔍 Debugging Campaign Cost Calculation')
  console.log('=====================================\n')

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
    
    smsSettings?.forEach((setting, index) => {
      console.log(`\n📊 SMS Settings ${index + 1}:`)
      console.log(`   Partner ID: ${setting.partner_id}`)
      console.log(`   Partner Name: ${setting.partners?.name}`)
      console.log(`   Cost per SMS: ${setting.sms_charge_per_message} KES`)
    })

    if (!smsSettings || smsSettings.length === 0) {
      console.log('❌ No SMS settings found. Cannot test cost calculation.')
      return
    }

    const testPartnerId = smsSettings[0].partner_id
    const expectedCostPerSMS = smsSettings[0].sms_charge_per_message

    // Step 2: Test the exact query used in campaign creation
    console.log('\n📋 Step 2: Testing SMS settings query...')
    
    const { data: smsSettingsQuery, error: smsSettingsQueryError } = await supabase
      .from('partner_sms_settings')
      .select('sms_charge_per_message')
      .eq('partner_id', testPartnerId)
      .single()

    if (smsSettingsQueryError) {
      console.log('❌ Error in SMS settings query:', smsSettingsQueryError)
    } else {
      console.log('✅ SMS settings query successful:')
      console.log(`   Partner ID: ${testPartnerId}`)
      console.log(`   Cost per SMS: ${smsSettingsQuery?.sms_charge_per_message} KES`)
      console.log(`   Expected: ${expectedCostPerSMS} KES`)
      console.log(`   Match: ${smsSettingsQuery?.sms_charge_per_message === expectedCostPerSMS ? '✅ YES' : '❌ NO'}`)
    }

    // Step 3: Test cost calculation logic
    console.log('\n📋 Step 3: Testing cost calculation logic...')
    
    const recipientList = ['254700000000', '254700000001'] // 2 recipients
    const totalRecipients = recipientList.length
    const costPerSMS = smsSettingsQuery?.sms_charge_per_message || 0.50
    const estimatedCost = totalRecipients * costPerSMS

    console.log('🧮 Cost Calculation:')
    console.log(`   Recipients: ${recipientList}`)
    console.log(`   Total Recipients: ${totalRecipients}`)
    console.log(`   Cost per SMS: ${costPerSMS} KES`)
    console.log(`   Estimated Cost: ${estimatedCost} KES`)
    console.log(`   Expected Cost: ${totalRecipients * expectedCostPerSMS} KES`)

    // Step 4: Create a test campaign to see what happens
    console.log('\n📋 Step 4: Creating test campaign...')
    
    const testCampaign = {
      partner_id: testPartnerId,
      campaign_name: `Cost Calculation Debug - ${new Date().toISOString().slice(0, 19)}`,
      message_content: 'Debug test message for cost calculation',
      recipient_list: recipientList,
      status: 'draft'
    }

    // Simulate the campaign creation logic
    console.log('🔧 Simulating campaign creation logic...')
    
    // Get partner SMS settings to calculate correct cost (same as in API)
    const { data: campaignSmsSettings, error: campaignSmsSettingsError } = await supabase
      .from('partner_sms_settings')
      .select('sms_charge_per_message')
      .eq('partner_id', testCampaign.partner_id)
      .single()

    if (campaignSmsSettingsError) {
      console.log('❌ Error fetching SMS settings for campaign:', campaignSmsSettingsError)
    } else {
      console.log('✅ SMS settings fetched for campaign:')
      console.log(`   Cost per SMS: ${campaignSmsSettings?.sms_charge_per_message} KES`)
    }

    // Calculate total recipients and estimated cost (same as in API)
    const campaignTotalRecipients = testCampaign.recipient_list.length
    const campaignCostPerSMS = campaignSmsSettings?.sms_charge_per_message || 0.50
    const campaignEstimatedCost = campaignTotalRecipients * campaignCostPerSMS

    console.log('🧮 Campaign Cost Calculation:')
    console.log(`   Total Recipients: ${campaignTotalRecipients}`)
    console.log(`   Cost per SMS: ${campaignCostPerSMS} KES`)
    console.log(`   Estimated Cost: ${campaignEstimatedCost} KES`)

    // Create the campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('sms_bulk_campaigns')
      .insert({
        partner_id: testCampaign.partner_id,
        campaign_name: testCampaign.campaign_name,
        message_content: testCampaign.message_content,
        recipient_list: testCampaign.recipient_list,
        total_recipients: campaignTotalRecipients,
        total_cost: campaignEstimatedCost,
        status: testCampaign.status
      })
      .select()
      .single()

    if (campaignError) {
      console.log('❌ Error creating test campaign:', campaignError)
    } else {
      console.log('✅ Test campaign created:')
      console.log(`   Campaign ID: ${campaign.id}`)
      console.log(`   Total Recipients: ${campaign.total_recipients}`)
      console.log(`   Total Cost: ${campaign.total_cost} KES`)
      console.log(`   Expected Cost: ${campaignEstimatedCost} KES`)
      console.log(`   Cost Match: ${campaign.total_cost === campaignEstimatedCost ? '✅ YES' : '❌ NO'}`)
    }

    // Step 5: Check if there are any database constraints or triggers
    console.log('\n📋 Step 5: Checking for database issues...')
    
    // Check if there are any recent campaigns with incorrect costs
    const { data: recentCampaigns, error: recentCampaignsError } = await supabase
      .from('sms_bulk_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(3)

    if (recentCampaignsError) {
      console.log('❌ Error fetching recent campaigns:', recentCampaignsError)
    } else {
      console.log('📊 Recent campaigns cost analysis:')
      recentCampaigns?.forEach((campaign, index) => {
        const expectedCost = campaign.total_recipients * expectedCostPerSMS
        const costCorrect = campaign.total_cost === expectedCost
        console.log(`   ${index + 1}. ${campaign.campaign_name}`)
        console.log(`      Total Cost: ${campaign.total_cost} KES`)
        console.log(`      Expected: ${expectedCost} KES`)
        console.log(`      Correct: ${costCorrect ? '✅ YES' : '❌ NO'}`)
      })
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
  } finally {
    console.log('\n🎯 Campaign Cost Calculation Analysis:')
    console.log('=====================================')
    console.log('Based on the investigation:')
    console.log('')
    console.log('1. 💰 SMS Settings Query: Should work correctly')
    console.log('2. 🧮 Cost Calculation Logic: Should work correctly')
    console.log('3. 📊 Campaign Creation: Should use calculated cost')
    console.log('4. 🔍 Database Issues: Check for constraints or triggers')
    console.log('')
    console.log('💡 Possible Issues:')
    console.log('==================')
    console.log('1. 🔧 Database trigger overriding the cost')
    console.log('2. 🔧 Column default value in database')
    console.log('3. 🔧 Race condition in campaign creation')
    console.log('4. 🔧 Caching issue with SMS settings')
    console.log('')
    console.log('🚀 Next Steps:')
    console.log('==============')
    console.log('1. 🔧 Check database schema for total_cost column')
    console.log('2. 🔧 Check for any database triggers on sms_bulk_campaigns')
    console.log('3. 🔧 Verify the campaign creation API is using the updated code')
    console.log('4. 🔧 Test with a fresh campaign creation')
  }
}

debugCampaignCostCalculation()
