// Test script to verify SMS campaigns API endpoint
// Run this script to test the SMS campaigns API after fixing the database schema

require('dotenv').config()
const https = require('https')
const http = require('http')

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          })
        } catch (error) {
          resolve({
            ok: false,
            status: res.statusCode,
            json: () => Promise.resolve({ error: 'Invalid JSON response', raw: data })
          })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testSMSCampaignsAPI() {
  console.log('🧪 SMS Campaigns API Test')
  console.log('=========================\n')

  try {
    // Test 1: Check if SMS campaigns API is accessible
    console.log('📋 Test 1: Testing SMS campaigns API endpoint...')
    
    const response = await makeRequest('http://localhost:3000/api/admin/sms/campaigns', {
      method: 'GET'
    })

    console.log(`   Response Status: ${response.status}`)
    
    const data = await response.json()
    console.log(`   Response Data:`, JSON.stringify(data, null, 2))

    if (response.status === 401) {
      console.log('   ✅ API is working (authentication required - expected)')
    } else if (response.status === 200) {
      console.log('   ✅ API is working (authenticated access)')
    } else if (response.status === 500) {
      console.log('   ❌ API has server error (500)')
      if (data.message && data.message.includes('SMS tables not initialized')) {
        console.log('   💡 Solution: Run the database migration script')
        console.log('   📝 Run: fix-sms-campaigns-table.sql in Supabase SQL Editor')
      }
    } else {
      console.log(`   ⚠️ Unexpected status: ${response.status}`)
    }

    console.log('\n🎯 SMS Campaigns API Status:')
    console.log('============================')
    
    if (response.status === 500 && data.message && data.message.includes('SMS tables not initialized')) {
      console.log('❌ Database tables not initialized')
      console.log('📝 Action Required:')
      console.log('   1. Go to your Supabase dashboard')
      console.log('   2. Open SQL Editor')
      console.log('   3. Run the fix-sms-campaigns-table.sql script')
      console.log('   4. Test the API again')
    } else if (response.status === 401) {
      console.log('✅ API endpoint is working correctly')
      console.log('🔐 Authentication is required (expected behavior)')
    } else if (response.status === 200) {
      console.log('✅ API endpoint is working correctly')
      console.log('🔐 Authentication successful')
      console.log(`📊 Found ${data.data?.length || 0} SMS campaigns`)
    } else {
      console.log('⚠️ API endpoint needs investigation')
      console.log(`📊 Status: ${response.status}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n📝 Next Steps:')
    console.log('==============')
    console.log('1. If you see "SMS tables not initialized":')
    console.log('   - Run fix-sms-campaigns-table.sql in Supabase SQL Editor')
    console.log('   - This will create/update the sms_bulk_campaigns table')
    console.log('')
    console.log('2. If you see authentication errors:')
    console.log('   - This is expected behavior')
    console.log('   - The API is working correctly')
    console.log('')
    console.log('3. If you see 500 errors:')
    console.log('   - Check the server logs for specific error details')
    console.log('   - Ensure all required database tables exist')
    console.log('')
    console.log('4. After fixing database issues:')
    console.log('   - Test the SMS campaigns page in the browser')
    console.log('   - Verify that campaigns can be created and managed')
  }
}

testSMSCampaignsAPI()
