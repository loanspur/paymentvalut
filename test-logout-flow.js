// Test logout flow
const http = require('http')

async function testLogoutFlow() {
  console.log('🔍 Testing Logout Flow')
  console.log('======================')
  console.log('')
  
  // Test the secure-logout endpoint
  console.log('📡 Testing secure-logout endpoint...')
  
  try {
    const url = new URL('http://localhost:3000/api/auth/secure-logout')
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Logout-Test/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        console.log(`   Status: ${res.statusCode}`)
        
        // Check for Set-Cookie header
        const setCookieHeader = res.headers['set-cookie']
        if (setCookieHeader) {
          console.log(`   Set-Cookie: ${setCookieHeader}`)
        } else {
          console.log(`   Set-Cookie: Not found`)
        }
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data)
            console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`)
            resolve({ status: res.statusCode, data: responseData, headers: res.headers })
          } catch (e) {
            console.log(`   Raw Response: ${data}`)
            resolve({ status: res.statusCode, data, headers: res.headers })
          }
        })
      })

      req.on('error', (error) => {
        console.error(`   ❌ Error: ${error.message}`)
        reject(error)
      })

      req.end()
    })

    console.log('')
    console.log('🔍 Logout Test Result:')
    console.log('======================')
    
    if (response.status === 200) {
      console.log('✅ Logout endpoint working correctly')
      
      if (response.headers['set-cookie']) {
        console.log('✅ Cookie clearing headers present')
        
        // Check if the cookie is being cleared
        const cookieHeader = response.headers['set-cookie']
        if (cookieHeader.includes('auth_token=;') || cookieHeader.includes('auth_token=""')) {
          console.log('✅ Auth token cookie is being cleared')
        } else {
          console.log('❌ Auth token cookie not being cleared properly')
        }
      } else {
        console.log('❌ No Set-Cookie header found')
      }
    } else {
      console.log(`❌ Unexpected status: ${response.status}`)
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`)
  }
  
  console.log('')
  console.log('📋 Expected Behavior:')
  console.log('=====================')
  console.log('1. Logout should return 200 status')
  console.log('2. Response should include Set-Cookie header')
  console.log('3. Auth token cookie should be cleared (maxAge=0)')
  console.log('4. User should be redirected to /secure-login')
  console.log('5. No re-authentication should occur after logout')
  console.log('')
  console.log('🔧 Manual Test Steps:')
  console.log('=====================')
  console.log('1. Log in to the application')
  console.log('2. Click the logout button')
  console.log('3. Verify you are redirected to /secure-login')
  console.log('4. Check browser dev tools - auth_token cookie should be gone')
  console.log('5. Try to access a protected page - should redirect to login')
}

testLogoutFlow()
