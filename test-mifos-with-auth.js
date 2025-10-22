// Test Mifos X connection API with authentication
const http = require('http')

async function testMifosConnectionWithAuth() {
  console.log('🔍 Testing Mifos X Connection API with Authentication')
  console.log('=====================================================')
  console.log('')
  
  // First, let's try to get an auth token by logging in
  console.log('📡 Step 1: Attempting to get authentication token...')
  
  const loginData = {
    email: 'justmurenga@gmail.com',
    password: 'your_password_here' // This would need to be the actual password
  }
  
  console.log('⚠️  Note: This test requires valid login credentials')
  console.log('   You need to be logged in to test Mifos X connection')
  console.log('')
  
  // Test data for Mifos X connection
  const testData = {
    host_url: 'https://demo.mifos.io',
    username: 'mifos',
    password: 'password',
    tenant_id: 'default',
    api_endpoint: '/fineract-provider/api/v1'
  }
  
  console.log('📋 Mifos X Test Data:')
  console.log(JSON.stringify(testData, null, 2))
  console.log('')
  
  // Test the connection API without auth (should fail)
  console.log('📡 Step 2: Testing connection API without authentication...')
  
  try {
    const url = new URL('http://localhost:3000/api/mifos/test-connection')
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mifos-Test/1.0'
      }
    }

    const response = await new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        console.log(`   Status: ${res.statusCode}`)
        
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            const responseData = JSON.parse(data)
            console.log(`   Response: ${JSON.stringify(responseData, null, 2)}`)
            resolve({ status: res.statusCode, data: responseData })
          } catch (e) {
            console.log(`   Raw Response: ${data}`)
            resolve({ status: res.statusCode, data })
          }
        })
      })

      req.on('error', (error) => {
        console.error(`   ❌ Error: ${error.message}`)
        reject(error)
      })

      req.write(JSON.stringify(testData))
      req.end()
    })

    console.log('')
    console.log('🔍 Connection Test Result:')
    console.log('==========================')
    
    if (response.status === 401) {
      console.log('❌ Authentication required - This is expected behavior')
      console.log('   The API correctly requires authentication')
    } else if (response.status === 400) {
      console.log('❌ Bad Request - Check the error details above')
    } else {
      console.log(`❌ Unexpected status: ${response.status}`)
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`)
  }
  
  console.log('')
  console.log('📋 Solution:')
  console.log('============')
  console.log('1. Make sure you are logged in to the application')
  console.log('2. Check that the auth_token cookie is being sent')
  console.log('3. Verify the JWT_SECRET is configured correctly')
  console.log('4. Try refreshing the page and logging in again')
  console.log('')
  console.log('🔧 Debug Steps:')
  console.log('===============')
  console.log('1. Open browser developer tools')
  console.log('2. Go to Application/Storage tab')
  console.log('3. Check if auth_token cookie exists')
  console.log('4. Check the Network tab for the request headers')
  console.log('5. Verify the request includes the auth_token cookie')
}

testMifosConnectionWithAuth()
