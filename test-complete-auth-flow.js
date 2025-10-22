// Test the complete authentication flow
const https = require('https')

async function testCompleteAuthFlow() {
  console.log('🔐 Testing Complete Authentication Flow')
  console.log('======================================')
  console.log('')
  
  const baseUrl = 'https://paymentvalut-ju.vercel.app'
  
  // Test 1: Check if user is authenticated
  console.log('1️⃣ Testing authentication status...')
  const authCheckUrl = baseUrl + '/api/auth/check'
  
  try {
    const authResponse = await makeRequest(authCheckUrl, 'GET')
    console.log(`   Status: ${authResponse.status}`)
    console.log(`   Response: ${JSON.stringify(authResponse.data, null, 2)}`)
    
    if (authResponse.data.authenticated) {
      console.log('   ✅ User is authenticated')
      console.log('')
      
      // Test 2: Test Mifos X API endpoints with authentication
      console.log('2️⃣ Testing Mifos X API endpoints...')
      
      const mifosEndpoints = [
        '/api/mifos/loan-products',
        '/api/mifos/auto-disbursal-configs'
      ]
      
      for (const endpoint of mifosEndpoints) {
        console.log(`   📡 Testing: ${endpoint}`)
        try {
          const mifosResponse = await makeRequest(baseUrl + endpoint, 'GET')
          console.log(`      Status: ${mifosResponse.status}`)
          
          if (mifosResponse.status === 401) {
            console.log('      ❌ Authentication failed - token may be invalid')
          } else if (mifosResponse.status === 400) {
            console.log('      ⚠️  Mifos X not configured for partner')
            console.log(`      Response: ${JSON.stringify(mifosResponse.data, null, 2)}`)
          } else if (mifosResponse.status === 200) {
            console.log('      ✅ API call successful')
          } else {
            console.log(`      📊 Status: ${mifosResponse.status}`)
            console.log(`      Response: ${JSON.stringify(mifosResponse.data, null, 2)}`)
          }
        } catch (error) {
          console.log(`      ❌ Error: ${error.message}`)
        }
        console.log('')
      }
      
    } else {
      console.log('   ❌ User is not authenticated')
      console.log('')
      console.log('🎯 Solution:')
      console.log('   1. Go to https://paymentvalut-ju.vercel.app')
      console.log('   2. Log in with your credentials')
      console.log('   3. Then try accessing the loan products page')
      console.log('')
      console.log('📋 Login URL: https://paymentvalut-ju.vercel.app/secure-login')
    }
    
  } catch (error) {
    console.error(`❌ Auth test failed: ${error.message}`)
  }
}

async function makeRequest(url, method = 'GET', headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Auth-Test/1.0',
        ...headers
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data)
          resolve({ status: res.statusCode, data: responseData })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}

testCompleteAuthFlow()
