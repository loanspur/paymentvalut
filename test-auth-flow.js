// Test the authentication flow for Mifos X API endpoints
const https = require('https')

async function testAuthFlow() {
  console.log('🔐 Testing Authentication Flow')
  console.log('==============================')
  console.log('')
  
  // Test the auth check endpoint first
  const authCheckUrl = 'https://paymentvalut-ju.vercel.app/api/auth/check'
  
  console.log('📡 Testing auth check endpoint...')
  
  try {
    const url = new URL(authCheckUrl)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Auth-Test/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        console.log(`   Status: ${res.statusCode}`)
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data)
            console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`)
          } catch (e) {
            console.log(`   Raw Response: ${data}`)
          }
          resolve({ status: res.statusCode, data })
        })
      })

      req.on('error', (error) => {
        console.error(`   ❌ Error: ${error.message}`)
        reject(error)
      })

      req.end()
    })

    console.log('')
    console.log('🔍 Analysis:')
    console.log('============')
    
    if (response.status === 401) {
      console.log('✅ Auth check endpoint working (no token provided)')
      console.log('')
      console.log('📋 Possible issues:')
      console.log('   1. User not logged in (no auth token in cookies)')
      console.log('   2. Auth token expired')
      console.log('   3. Auth token not being sent with requests')
      console.log('')
      console.log('🎯 Solutions:')
      console.log('   1. Log in to the application first')
      console.log('   2. Check browser cookies for auth_token')
      console.log('   3. Verify the authentication flow is working')
    } else if (response.status === 200) {
      console.log('✅ User is authenticated')
      console.log('')
      console.log('📋 If Mifos X APIs still return 404:')
      console.log('   1. Check if partner has Mifos X configured')
      console.log('   2. Verify Mifos X credentials are correct')
      console.log('   3. Check API route deployment')
    }

  } catch (error) {
    console.error(`❌ Auth test failed: ${error.message}`)
  }
}

testAuthFlow()