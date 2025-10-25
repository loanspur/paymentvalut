// Test script to debug SMS settings creation
// Run this script to test creating SMS settings and see what error occurs

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

async function testSMSSettingsCreate() {
  console.log('🧪 Testing SMS Settings Creation')
  console.log('=================================\n')

  try {
    // First, let's get a list of partners to use for testing
    console.log('📋 Step 1: Getting partners list...')
    
    const partnersResponse = await makeRequest('http://localhost:3000/api/partners', {
      method: 'GET'
    })

    if (!partnersResponse.ok) {
      console.log('❌ Failed to get partners list')
      const errorData = await partnersResponse.json()
      console.log(`   Error: ${errorData.error || 'Unknown error'}`)
      return
    }

    const partnersData = await partnersResponse.json()
    const partners = partnersData.partners || []
    
    if (partners.length === 0) {
      console.log('❌ No partners found. Please create a partner first.')
      return
    }

    const testPartner = partners[0]
    console.log(`✅ Found partner: ${testPartner.name} (ID: ${testPartner.id})`)

    // Now let's test creating SMS settings
    console.log('\n📋 Step 2: Testing SMS settings creation...')
    
    const testSMSData = {
      partner_id: testPartner.id,
      damza_api_key: 'test_api_key_123',
      damza_sender_id: 'TEST_SENDER',
      damza_username: 'test_username',
      damza_password: 'test_password',
      sms_enabled: true,
      low_balance_threshold: 1000,
      notification_phone_numbers: '254712345678',
      sms_charge_per_message: 0.50
    }

    const smsResponse = await makeRequest('http://localhost:3000/api/admin/sms/settings', {
      method: 'POST',
      headers: {
        'Cookie': 'auth_token=test_token' // This will fail auth but we can see the error
      },
      body: JSON.stringify(testSMSData)
    })

    console.log(`   Response Status: ${smsResponse.status}`)
    const smsData = await smsResponse.json()
    
    if (smsResponse.status === 401) {
      console.log('✅ SMS settings API is working (correctly requires auth)')
      console.log('   The API endpoint is functional, just needs proper authentication')
    } else if (smsResponse.status === 500) {
      console.log('❌ SMS settings creation failed with 500 error')
      console.log(`   Error: ${smsData.error || 'Unknown error'}`)
      console.log(`   Full response:`, JSON.stringify(smsData, null, 2))
    } else if (smsResponse.ok) {
      console.log('✅ SMS settings created successfully!')
      console.log(`   Response:`, JSON.stringify(smsData, null, 2))
    } else {
      console.log('❌ SMS settings creation failed')
      console.log(`   Status: ${smsResponse.status}`)
      console.log(`   Error: ${smsData.error || 'Unknown error'}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n📝 Next Steps:')
    console.log('1. If you see a 500 error, check the server logs for more details')
    console.log('2. The issue might be with encryption functions or database operations')
    console.log('3. Try creating SMS settings through the UI with proper authentication')
  }
}

testSMSSettingsCreate()
