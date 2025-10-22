// Test API accessibility
const https = require('https')

const baseUrl = 'https://paymentvalut-ju.vercel.app'

async function testApiAccessibility() {
  console.log('🔍 Testing API Accessibility')
  console.log('=' .repeat(50))
  console.log('')

  const apis = [
    '/api/mifos/fetch-pending-loans',
    '/api/mifos/process-pending-loans', 
    '/api/mifos/scheduled-loan-sync',
    '/api/health'
  ]

  for (const api of apis) {
    try {
      console.log(`📡 Testing: ${api}`)
      const result = await makeRequest(`${baseUrl}${api}`, 'GET')
      console.log(`✅ ${api}: ${result.message || 'OK'}`)
    } catch (error) {
      console.log(`❌ ${api}: ${error.message}`)
    }
    console.log('')
  }
}

function makeRequest(url, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'API-Test/1.0'
      }
    }

    if (data) {
      const postData = JSON.stringify(data)
      options.headers['Content-Length'] = Buffer.byteLength(postData)
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => {
        responseData += chunk
      })
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData)
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed)
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${parsed.error || responseData}`))
          }
        } catch (parseError) {
          reject(new Error(`Parse error: ${parseError.message}`))
        }
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    if (data) {
      req.write(JSON.stringify(data))
    }
    req.end()
  })
}

testApiAccessibility()
