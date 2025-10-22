// Test loan products API endpoints
const http = require('http')

async function testLoanProductsAPI() {
  console.log('🔍 Testing Loan Products API Endpoints')
  console.log('======================================')
  console.log('')
  
  const endpoints = [
    {
      name: 'Loan Products',
      path: '/api/mifos/loan-products',
      method: 'GET'
    },
    {
      name: 'Auto-Disbursal Configs',
      path: '/api/mifos/auto-disbursal-configs',
      method: 'GET'
    }
  ]
  
  for (const endpoint of endpoints) {
    console.log(`📡 Testing: ${endpoint.name}`)
    console.log(`   Path: ${endpoint.path}`)
    console.log(`   Method: ${endpoint.method}`)
    
    try {
      const url = new URL('http://localhost:3000' + endpoint.path)
      const options = {
        hostname: url.hostname,
        port: url.port || 3000,
        path: url.pathname,
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Loan-Products-Test/1.0'
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

        req.end()
      })

      console.log('')
      console.log('🔍 Test Result:')
      console.log('===============')
      
      if (response.status === 404) {
        console.log('❌ 404 Not Found - API route not accessible')
        console.log('   Possible causes:')
        console.log('   1. API route file doesn\'t exist')
        console.log('   2. Next.js server not running')
        console.log('   3. Route not properly deployed')
      } else if (response.status === 401) {
        console.log('✅ API route exists but requires authentication')
        console.log('   This is expected behavior')
      } else if (response.status === 400) {
        console.log('⚠️ API route exists but has configuration issues')
        if (response.data && response.data.error) {
          console.log(`   Error: ${response.data.error}`)
        }
      } else if (response.status === 200) {
        console.log('✅ API route working correctly')
      } else {
        console.log(`⚠️ Unexpected status: ${response.status}`)
      }

    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`)
    }
    
    console.log('---')
    console.log('')
  }
  
  console.log('📋 Troubleshooting Steps:')
  console.log('=========================')
  console.log('1. Check if Next.js development server is running')
  console.log('2. Verify API route files exist in app/api/mifos/')
  console.log('3. Check if user is authenticated (should get 401, not 404)')
  console.log('4. Verify partner has Mifos X configuration')
  console.log('5. Check if database tables exist')
  console.log('')
  console.log('🔧 Expected Behavior:')
  console.log('=====================')
  console.log('✅ 401 (Unauthorized) - API exists, needs authentication')
  console.log('❌ 404 (Not Found) - API route missing or not accessible')
  console.log('⚠️ 400 (Bad Request) - API exists but has configuration issues')
  console.log('✅ 200 (OK) - API working correctly')
}

testLoanProductsAPI()
