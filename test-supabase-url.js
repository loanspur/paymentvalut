const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

async function testSupabaseUrl() {
  console.log('🔍 Testing Supabase URL accessibility...')
  console.log('')
  
  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/loan-polling`
  console.log('📡 Testing URL:', edgeFunctionUrl)
  console.log('')
  
  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'x-api-key': supabaseServiceKey
      },
      body: JSON.stringify({})
    })
    
    console.log('✅ URL is accessible')
    console.log('📊 Status:', response.status, response.statusText)
    
    const data = await response.json()
    console.log('📋 Response:', JSON.stringify(data, null, 2))
    
  } catch (error) {
    console.log('❌ URL is not accessible')
    console.log('📋 Error:', error.message)
    
    if (error.message.includes('DNS')) {
      console.log('')
      console.log('🔧 DNS Lookup Error Solutions:')
      console.log('1. Check if the Supabase URL is correct')
      console.log('2. Try using a different DNS server')
      console.log('3. Check if there are any network restrictions')
      console.log('4. Verify the Supabase project is active')
    }
  }
  
  console.log('')
  console.log('🌐 Alternative URLs to try in cron-job.org:')
  console.log('1. Direct IP (if available): Check Supabase dashboard for IP')
  console.log('2. Different DNS: Try using 8.8.8.8 or 1.1.1.1')
  console.log('3. URL format: Ensure no trailing slashes or extra characters')
}

testSupabaseUrl()

