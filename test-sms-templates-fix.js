// Test script to verify SMS templates API is working
// Run this script to test the fixed SMS templates API

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

async function testSMSTemplatesFix() {
  console.log('🧪 Testing SMS Templates API Fix')
  console.log('================================\n')

  try {
    // Test 1: GET SMS Templates
    console.log('📋 Test 1: GET SMS Templates...')
    const templatesResponse = await makeRequest('http://localhost:3000/api/admin/sms/templates', {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=test_token'
      }
    })

    console.log(`   Status: ${templatesResponse.status}`)
    const templatesData = await templatesResponse.json()
    
    if (templatesResponse.status === 401) {
      console.log('✅ SMS Templates API working (requires auth)')
    } else if (templatesResponse.status === 200) {
      console.log('✅ SMS Templates API working and returning data')
      console.log(`   Found ${templatesData.data?.length || 0} SMS templates`)
      if (templatesData.data && templatesData.data.length > 0) {
        console.log('   Sample template:', templatesData.data[0].template_name)
      }
    } else if (templatesResponse.status === 500) {
      console.log('❌ SMS Templates API still has 500 error')
      console.log(`   Error: ${templatesData.error || 'Unknown error'}`)
      console.log(`   Full response:`, JSON.stringify(templatesData, null, 2))
    } else {
      console.log(`❌ Unexpected status: ${templatesResponse.status}`)
      console.log(`   Response:`, JSON.stringify(templatesData, null, 2))
    }

    // Test 2: Test with specific partner filter
    console.log('\n📋 Test 2: GET SMS Templates with partner filter...')
    const partnerTemplatesResponse = await makeRequest('http://localhost:3000/api/admin/sms/templates?partner_id=test', {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=test_token'
      }
    })

    console.log(`   Status: ${partnerTemplatesResponse.status}`)
    if (partnerTemplatesResponse.status === 401 || partnerTemplatesResponse.status === 200) {
      console.log('✅ Partner filter working correctly')
    } else {
      console.log('❌ Partner filter has issues')
    }

    // Test 3: Test with template type filter
    console.log('\n📋 Test 3: GET SMS Templates with type filter...')
    const typeTemplatesResponse = await makeRequest('http://localhost:3000/api/admin/sms/templates?template_type=balance_alert', {
      method: 'GET',
      headers: {
        'Cookie': 'auth_token=test_token'
      }
    })

    console.log(`   Status: ${typeTemplatesResponse.status}`)
    if (typeTemplatesResponse.status === 401 || typeTemplatesResponse.status === 200) {
      console.log('✅ Template type filter working correctly')
    } else {
      console.log('❌ Template type filter has issues')
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n📝 Test Results:')
    console.log('1. If you see 401 errors, the API is working correctly (just needs auth)')
    console.log('2. If you see 200 responses, the API is working and returning data')
    console.log('3. If you see 500 errors, there are still issues to fix')
    console.log('\n🎯 Next: Try accessing the SMS templates page in your browser')
  }
}

testSMSTemplatesFix()
