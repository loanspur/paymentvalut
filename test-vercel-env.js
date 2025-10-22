// Test Vercel environment variables
const https = require('https')

async function testVercelEnvironment() {
  console.log('🔍 Testing Vercel Environment Variables')
  console.log('=======================================')
  console.log('')
  
  // Test the health endpoint to check environment variables
  const healthUrl = 'https://paymentvalut-ju.vercel.app/api/health'
  
  console.log('📡 Testing health endpoint...')
  
  try {
    const url = new URL(healthUrl)
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Env-Test/1.0'
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
    console.log('🔍 Environment Status:')
    console.log('======================')
    
    if (response.status === 200) {
      console.log('✅ Health endpoint working')
      if (response.data && response.data.jwtSecret) {
        console.log('✅ JWT_SECRET is configured')
      } else {
        console.log('❌ JWT_SECRET is missing')
      }
    } else {
      console.log('❌ Health endpoint not working')
    }

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`)
  }
  
  console.log('')
  console.log('📋 Next Steps:')
  console.log('==============')
  console.log('1. Add JWT_SECRET to Vercel environment variables')
  console.log('2. Redeploy the application')
  console.log('3. Test login functionality')
  console.log('4. Verify loan products page works')
}

testVercelEnvironment()
