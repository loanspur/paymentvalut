// Test script to simulate authenticated SMS campaigns API requests
// This will help identify the exact cause of the 500 error

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

async function testAuthenticatedSMSAPI() {
  console.log('🔐 Authenticated SMS API Test')
  console.log('=============================\n')

  try {
    // Test 1: Try to get a valid auth token first
    console.log('📋 Test 1: Attempting to get auth token...')
    
    // This is a simplified test - in reality, you'd need to login first
    // For now, let's test with a dummy token to see what error we get
    const dummyToken = 'dummy_token_for_testing'
    
    console.log('   Using dummy token for testing...')
    
    // Test 2: Test GET request with dummy token
    console.log('\n📋 Test 2: Testing GET request with dummy token...')
    
    const getResponse = await makeRequest('http://localhost:3000/api/admin/sms/campaigns', {
      method: 'GET',
      headers: {
        'Cookie': `auth_token=${dummyToken}`
      }
    })

    console.log(`   GET Response Status: ${getResponse.status}`)
    const getData = await getResponse.json()
    console.log(`   GET Response Data:`, JSON.stringify(getData, null, 2))

    // Test 3: Test POST request with dummy token
    console.log('\n📋 Test 3: Testing POST request with dummy token...')
    
    const testCampaign = {
      partner_id: '550e8400-e29b-41d4-a716-446655440000', // Use the partner ID from our debug
      campaign_name: 'Test Campaign from API',
      message_content: 'This is a test message from API',
      recipient_list: ['254700000000'],
      status: 'draft'
    }

    const postResponse = await makeRequest('http://localhost:3000/api/admin/sms/campaigns', {
      method: 'POST',
      headers: {
        'Cookie': `auth_token=${dummyToken}`
      },
      body: JSON.stringify(testCampaign)
    })

    console.log(`   POST Response Status: ${postResponse.status}`)
    const postData = await postResponse.json()
    console.log(`   POST Response Data:`, JSON.stringify(postData, null, 2))

    // Test 4: Test without any authentication
    console.log('\n📋 Test 4: Testing without authentication...')
    
    const noAuthResponse = await makeRequest('http://localhost:3000/api/admin/sms/campaigns', {
      method: 'GET'
    })

    console.log(`   No Auth Response Status: ${noAuthResponse.status}`)
    const noAuthData = await noAuthResponse.json()
    console.log(`   No Auth Response Data:`, JSON.stringify(noAuthData, null, 2))

    console.log('\n🎯 Test Results Analysis:')
    console.log('=========================')
    
    if (getResponse.status === 401) {
      console.log('✅ GET request correctly returns 401 for invalid token')
    } else if (getResponse.status === 500) {
      console.log('❌ GET request returns 500 - there is a server error')
      console.log('   This suggests the API has an issue when processing the request')
    } else {
      console.log(`⚠️ GET request returned unexpected status: ${getResponse.status}`)
    }
    
    if (postResponse.status === 401) {
      console.log('✅ POST request correctly returns 401 for invalid token')
    } else if (postResponse.status === 500) {
      console.log('❌ POST request returns 500 - there is a server error')
      console.log('   This suggests the API has an issue when processing the request')
    } else {
      console.log(`⚠️ POST request returned unexpected status: ${postResponse.status}`)
    }
    
    if (noAuthResponse.status === 401) {
      console.log('✅ No auth request correctly returns 401')
    } else {
      console.log(`⚠️ No auth request returned unexpected status: ${noAuthResponse.status}`)
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n📝 Next Steps:')
    console.log('==============')
    console.log('1. If you see 500 errors above, the issue is in the API endpoint logic')
    console.log('2. Check the server logs in your terminal for detailed error messages')
    console.log('3. The issue might be with JWT token verification or database queries')
    console.log('4. Try accessing the page in the browser and check the Network tab for the exact error')
  }
}

testAuthenticatedSMSAPI()
