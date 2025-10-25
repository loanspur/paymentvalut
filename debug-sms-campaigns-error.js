// Debug script to investigate SMS campaigns API errors
// Run this script to get detailed error information

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function debugSMSCampaignsError() {
  console.log('🔍 SMS Campaigns Error Debug')
  console.log('============================\n')

  try {
    // Test 1: Check if we can query the table directly
    console.log('📋 Test 1: Direct database query...')
    
    const { data, error } = await supabase
      .from('sms_bulk_campaigns')
      .select(`
        *,
        partners:partner_id (
          id,
          name,
          short_code,
          is_active
        ),
        sms_templates:template_id (
          id,
          template_name,
          template_content,
          template_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      console.log('❌ Database query error:', error)
      console.log('Error details:', JSON.stringify(error, null, 2))
    } else {
      console.log('✅ Database query successful')
      console.log(`Found ${data?.length || 0} campaigns`)
      if (data && data.length > 0) {
        console.log('Sample campaign:', JSON.stringify(data[0], null, 2))
      }
    }

    // Test 2: Check if partners table exists and has data
    console.log('\n📋 Test 2: Checking partners table...')
    
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name, short_code, is_active')
      .limit(5)

    if (partnersError) {
      console.log('❌ Partners query error:', partnersError)
    } else {
      console.log('✅ Partners query successful')
      console.log(`Found ${partners?.length || 0} partners`)
      if (partners && partners.length > 0) {
        console.log('Sample partner:', JSON.stringify(partners[0], null, 2))
      }
    }

    // Test 3: Check if sms_templates table exists and has data
    console.log('\n📋 Test 3: Checking sms_templates table...')
    
    const { data: templates, error: templatesError } = await supabase
      .from('sms_templates')
      .select('id, template_name, template_content, template_type')
      .limit(5)

    if (templatesError) {
      console.log('❌ SMS templates query error:', templatesError)
    } else {
      console.log('✅ SMS templates query successful')
      console.log(`Found ${templates?.length || 0} templates`)
      if (templates && templates.length > 0) {
        console.log('Sample template:', JSON.stringify(templates[0], null, 2))
      }
    }

    // Test 4: Try to create a test campaign
    console.log('\n📋 Test 4: Testing campaign creation...')
    
    if (partners && partners.length > 0) {
      const testCampaign = {
        partner_id: partners[0].id,
        campaign_name: 'Test Campaign',
        message_content: 'This is a test message',
        recipient_list: ['254700000000'],
        total_recipients: 1,
        total_cost: 0.50,
        status: 'draft'
      }

      const { data: newCampaign, error: createError } = await supabase
        .from('sms_bulk_campaigns')
        .insert(testCampaign)
        .select()
        .single()

      if (createError) {
        console.log('❌ Campaign creation error:', createError)
        console.log('Error details:', JSON.stringify(createError, null, 2))
      } else {
        console.log('✅ Campaign creation successful')
        console.log('Created campaign:', JSON.stringify(newCampaign, null, 2))
        
        // Clean up test campaign
        await supabase
          .from('sms_bulk_campaigns')
          .delete()
          .eq('id', newCampaign.id)
        console.log('🧹 Test campaign cleaned up')
      }
    } else {
      console.log('⚠️ No partners found, skipping campaign creation test')
    }

  } catch (error) {
    console.error('❌ Debug failed:', error.message)
    console.error('Stack trace:', error.stack)
  } finally {
    console.log('\n🎯 Debug Summary:')
    console.log('=================')
    console.log('If you see database errors above, the issue is with the database schema or permissions.')
    console.log('If you see successful queries, the issue is likely with the API endpoint logic.')
    console.log('Check the server logs for more detailed error information.')
  }
}

debugSMSCampaignsError()
