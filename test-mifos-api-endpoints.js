// Test the Mifos X API endpoints
const https = require('https')

async function testMifosAPIEndpoints() {
  console.log('🧪 Testing Mifos X API Endpoints')
  console.log('=================================')
  console.log('')
  
  const baseUrl = 'https://paymentvalut-ju.vercel.app'
  const endpoints = [
    '/api/mifos/loan-products',
    '/api/mifos/auto-disbursal-configs',
    '/api/mifos/test-connection'
  ]
  
  for (const endpoint of endpoints) {
    console.log(`📡 Testing: ${endpoint}`)
    
    try {
      const url = new URL(baseUrl + endpoint)
      const options = {
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname,
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mifos-API-Test/1.0'
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

      if (response.status === 401) {
        console.log('   ✅ Endpoint exists (authentication required)')
      } else if (response.status === 404) {
        console.log('   ❌ Endpoint not found')
      } else {
        console.log(`   📊 Status: ${response.status}`)
      }

    } catch (error) {
      console.error(`   ❌ Request failed: ${error.message}`)
    }
    
    console.log('')
  }
  
  console.log('🔍 Analysis:')
  console.log('============')
  console.log('If endpoints return 401: They exist and require authentication')
  console.log('If endpoints return 404: They may not be deployed or have routing issues')
  console.log('If endpoints return 500: There may be server-side errors')
}

testMifosAPIEndpoints()
