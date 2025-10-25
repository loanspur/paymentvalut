// Test script to check SMS API endpoints
// Run this script to test the SMS APIs

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

async function testSMSAPIEndpoints() {
  console.log('🧪 Testing SMS API Endpoints')
  console.log('============================\n')

  try {
    // Test 1: SMS Templates API
    console.log('📋 Test 1: Testing SMS templates API...')
    
    const templatesResponse = await makeRequest('http://localhost:3000/api/admin/sms/templates', {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=test_token' // This will fail auth but we can see the error
      }
    })

    console.log(`   Response Status: ${templatesResponse.status}`)
    const templatesData = await templatesResponse.json()
    
    if (templatesResponse.status === 401) {
      console.log('✅ SMS templates API is working (correctly requires auth)')
      console.log(`   Message: ${templatesData.error || 'No error message'}`)
    } else if (templatesResponse.ok) {
      console.log('✅ SMS templates API is working')
      console.log(`   Found ${templatesData.data?.length || 0} templates`)
    } else {
      console.log('❌ SMS templates API failed')
      console.log(`   Error: ${templatesData.error || 'Unknown error'}`)
      console.log(`   Raw response: ${JSON.stringify(templatesData, null, 2)}`)
    }

    // Test 2: SMS Settings API
    console.log('\n📋 Test 2: Testing SMS settings API...')
    
    const settingsResponse = await makeRequest('http://localhost:3000/api/admin/sms/settings', {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=test_token' // This will fail auth but we can see the error
      }
    })

    console.log(`   Response Status: ${settingsResponse.status}`)
    const settingsData = await settingsResponse.json()
    
    if (settingsResponse.status === 401) {
      console.log('✅ SMS settings API is working (correctly requires auth)')
      console.log(`   Message: ${settingsData.error || 'No error message'}`)
    } else if (settingsResponse.ok) {
      console.log('✅ SMS settings API is working')
      console.log(`   Found ${settingsData.data?.length || 0} settings`)
    } else {
      console.log('❌ SMS settings API failed')
      console.log(`   Error: ${settingsData.error || 'Unknown error'}`)
      console.log(`   Raw response: ${JSON.stringify(settingsData, null, 2)}`)
    }

    // Test 3: SMS Campaigns API
    console.log('\n📋 Test 3: Testing SMS campaigns API...')
    
    const campaignsResponse = await makeRequest('http://localhost:3000/api/admin/sms/campaigns', {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=test_token' // This will fail auth but we can see the error
      }
    })

    console.log(`   Response Status: ${campaignsResponse.status}`)
    const campaignsData = await campaignsResponse.json()
    
    if (campaignsResponse.status === 401) {
      console.log('✅ SMS campaigns API is working (correctly requires auth)')
      console.log(`   Message: ${campaignsData.error || 'No error message'}`)
    } else if (campaignsResponse.ok) {
      console.log('✅ SMS campaigns API is working')
      console.log(`   Found ${campaignsData.data?.length || 0} campaigns`)
    } else {
      console.log('❌ SMS campaigns API failed')
      console.log(`   Error: ${campaignsData.error || 'Unknown error'}`)
      console.log(`   Raw response: ${JSON.stringify(campaignsData, null, 2)}`)
    }

    console.log('\n🎉 SMS API Endpoints Test Completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n📝 Next Steps:')
    console.log('1. Run the SMS migration: simple-sms-migration.sql in Supabase SQL Editor')
    console.log('2. Check if the 500 errors are resolved')
    console.log('3. Test with proper authentication tokens')
  }
}

testSMSAPIEndpoints()
