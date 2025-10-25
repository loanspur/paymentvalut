// Test script to verify API endpoints are working
// Run this script to test the fixed API endpoints

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

async function testAPIEndpoints() {
  console.log('🧪 Testing API Endpoints')
  console.log('========================\n')

  try {
    // Test 1: System Settings API
    console.log('📋 Test 1: Testing system settings API...')
    
    const settingsResponse = await makeRequest('http://localhost:3000/api/system/settings?category=ncba', {
      method: 'GET'
    })

    console.log(`   Response Status: ${settingsResponse.status}`)
    const settingsData = await settingsResponse.json()
    
    if (settingsResponse.ok) {
      console.log('✅ System settings API is working')
      console.log(`   Found ${Object.keys(settingsData.data || {}).length} NCBA settings`)
      if (settingsData.data) {
        console.log('   Available settings:', Object.keys(settingsData.data).join(', '))
      }
    } else {
      console.log('❌ System settings API failed')
      console.log(`   Error: ${settingsData.error || 'Unknown error'}`)
      console.log(`   Raw response: ${JSON.stringify(settingsData, null, 2)}`)
    }

    // Test 2: Auth API (without token - should return 401)
    console.log('\n📋 Test 2: Testing auth API (no token)...')
    
    const authResponse = await makeRequest('http://localhost:3000/api/auth/me', {
      method: 'GET'
    })

    console.log(`   Response Status: ${authResponse.status}`)
    const authData = await authResponse.json()
    
    if (authResponse.status === 401) {
      console.log('✅ Auth API is working (correctly returns 401 for no token)')
      console.log(`   Message: ${authData.error || 'No error message'}`)
    } else if (authResponse.ok) {
      console.log('✅ Auth API is working (user is authenticated)')
      console.log(`   User: ${authData.user?.email || 'No email'}`)
    } else {
      console.log('❌ Auth API failed with unexpected status')
      console.log(`   Error: ${authData.error || 'Unknown error'}`)
      console.log(`   Raw response: ${JSON.stringify(authData, null, 2)}`)
    }

    // Test 3: Partners API
    console.log('\n📋 Test 3: Testing partners API...')
    
    const partnersResponse = await makeRequest('http://localhost:3000/api/partners', {
      method: 'GET'
    })

    console.log(`   Response Status: ${partnersResponse.status}`)
    const partnersData = await partnersResponse.json()
    
    if (partnersResponse.ok) {
      console.log('✅ Partners API is working')
      console.log(`   Found ${partnersData.partners?.length || 0} partners`)
      if (partnersData.partners && partnersData.partners.length > 0) {
        console.log(`   Sample partner: ${partnersData.partners[0].name} (${partnersData.partners[0].short_code})`)
      }
    } else {
      console.log('❌ Partners API failed')
      console.log(`   Error: ${partnersData.error || 'Unknown error'}`)
    }

    // Test 4: Dashboard Stats API (without auth - should return 401)
    console.log('\n📋 Test 4: Testing dashboard stats API (no auth)...')
    
    const statsResponse = await makeRequest('http://localhost:3000/api/dashboard/stats', {
      method: 'GET'
    })

    console.log(`   Response Status: ${statsResponse.status}`)
    const statsData = await statsResponse.json()
    
    if (statsResponse.status === 401) {
      console.log('✅ Dashboard stats API is working (correctly requires auth)')
    } else if (statsResponse.ok) {
      console.log('✅ Dashboard stats API is working (user is authenticated)')
    } else {
      console.log('❌ Dashboard stats API failed with unexpected status')
      console.log(`   Error: ${statsData.error || 'Unknown error'}`)
    }

    console.log('\n🎉 API Endpoints Test Completed!')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  } finally {
    console.log('\n📝 Next Steps:')
    console.log('1. Run the migration: fix-system-settings-and-auth.sql')
    console.log('2. Restart your development server: npm run dev')
    console.log('3. Test the login flow')
    console.log('4. Check if the 500 errors are resolved')
  }
}

testAPIEndpoints()
