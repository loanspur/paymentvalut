// Debug Mifos X connection endpoints
const https = require('https')
const http = require('http')

async function testMifosEndpoints() {
  console.log('🔍 Testing Mifos X Connection Endpoints')
  console.log('=======================================')
  console.log('')
  
  // Common Mifos X configurations to test
  const testConfigs = [
    {
      name: 'Demo Mifos X (Public)',
      hostUrl: 'https://demo.mifos.io',
      apiEndpoint: '/fineract-provider/api/v1',
      username: 'mifos',
      password: 'password',
      tenantId: 'default'
    },
    {
      name: 'Local Mifos X',
      hostUrl: 'http://localhost:8080',
      apiEndpoint: '/fineract-provider/api/v1',
      username: 'mifos',
      password: 'password',
      tenantId: 'default'
    },
    {
      name: 'Alternative Demo',
      hostUrl: 'https://demo.fineract.dev',
      apiEndpoint: '/fineract-provider/api/v1',
      username: 'mifos',
      password: 'password',
      tenantId: 'default'
    }
  ]
  
  for (const config of testConfigs) {
    console.log(`📡 Testing: ${config.name}`)
    console.log(`   Host: ${config.hostUrl}`)
    console.log(`   API Endpoint: ${config.apiEndpoint}`)
    console.log(`   Tenant: ${config.tenantId}`)
    console.log('')
    
    // Test 1: Check if server is accessible
    await testServerAccess(config)
    
    // Test 2: Test authentication endpoint
    await testAuthenticationEndpoint(config)
    
    console.log('---')
    console.log('')
  }
  
  console.log('📋 Common Mifos X Endpoints:')
  console.log('============================')
  console.log('1. Authentication: /fineract-provider/api/v1/authentication')
  console.log('2. System Info: /fineract-provider/api/v1/system')
  console.log('3. Loan Products: /fineract-provider/api/v1/loanproducts')
  console.log('4. Offices: /fineract-provider/api/v1/offices')
  console.log('')
  console.log('🔧 Troubleshooting Steps:')
  console.log('=========================')
  console.log('1. Verify the Mifos X server is running')
  console.log('2. Check if the host URL is correct')
  console.log('3. Ensure the API endpoint path is correct')
  console.log('4. Verify tenant ID is correct')
  console.log('5. Check username/password credentials')
  console.log('6. Ensure network connectivity to Mifos X server')
}

async function testServerAccess(config) {
  try {
    const url = new URL(config.hostUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: '/',
      method: 'GET',
      timeout: 5000
    }
    
    const response = await new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        resolve({ status: res.statusCode, headers: res.headers })
      })
      
      req.on('error', (error) => {
        reject(error)
      })
      
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
      
      req.end()
    })
    
    console.log(`   ✅ Server accessible: ${response.status}`)
    
  } catch (error) {
    console.log(`   ❌ Server not accessible: ${error.message}`)
  }
}

async function testAuthenticationEndpoint(config) {
  try {
    const authUrl = `${config.hostUrl}${config.apiEndpoint}/authentication`
    console.log(`   🔐 Testing auth endpoint: ${authUrl}`)
    
    const url = new URL(authUrl)
    const isHttps = url.protocol === 'https:'
    const client = isHttps ? https : http
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': config.tenantId
      },
      timeout: 10000
    }
    
    const response = await new Promise((resolve, reject) => {
      const req = client.request(options, (res) => {
        let data = ''
        res.on('data', (chunk) => {
          data += chunk
        })
        res.on('end', () => {
          resolve({ status: res.statusCode, data })
        })
      })
      
      req.on('error', (error) => {
        reject(error)
      })
      
      req.on('timeout', () => {
        req.destroy()
        reject(new Error('Request timeout'))
      })
      
      req.write(JSON.stringify({
        username: config.username,
        password: config.password
      }))
      req.end()
    })
    
    if (response.status === 200) {
      console.log(`   ✅ Authentication endpoint working: ${response.status}`)
      try {
        const authData = JSON.parse(response.data)
        if (authData.access_token) {
          console.log(`   ✅ Access token received`)
        } else {
          console.log(`   ⚠️ No access token in response`)
        }
      } catch (e) {
        console.log(`   ⚠️ Invalid JSON response`)
      }
    } else if (response.status === 404) {
      console.log(`   ❌ Authentication endpoint not found: ${response.status}`)
      console.log(`   💡 Try different API endpoint path`)
    } else {
      console.log(`   ⚠️ Authentication endpoint returned: ${response.status}`)
    }
    
  } catch (error) {
    console.log(`   ❌ Authentication test failed: ${error.message}`)
  }
}

testMifosEndpoints()
