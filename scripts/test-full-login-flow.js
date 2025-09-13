// Test full login flow
const fetch = require('node-fetch').default || require('node-fetch')

async function testFullLoginFlow() {
  console.log('🔍 Testing full login flow...')
  
  try {
    // Step 1: Login
    console.log('📡 Step 1: Logging in...')
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@mpesavault.com',
        password: 'admin123'
      })
    })
    
    const loginData = await loginResponse.json()
    console.log('Login Status:', loginResponse.status)
    console.log('Login Response:', JSON.stringify(loginData, null, 2))
    
    if (!loginData.success) {
      console.error('❌ Login failed')
      return
    }
    
    const sessionToken = loginData.session_token
    console.log('✅ Login successful, session token:', sessionToken)
    
    // Step 2: Test /me endpoint
    console.log('\n📡 Step 2: Testing /api/auth/me...')
    const meResponse = await fetch('http://localhost:3000/api/auth/me', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })
    
    const meData = await meResponse.json()
    console.log('Me Status:', meResponse.status)
    console.log('Me Response:', JSON.stringify(meData, null, 2))
    
    if (meData.success) {
      console.log('✅ Session validation successful')
      
      // Step 3: Test admin dashboard data
      console.log('\n📡 Step 3: Testing admin dashboard data...')
      const usersResponse = await fetch('http://localhost:3000/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })
      
      const usersData = await usersResponse.json()
      console.log('Users Status:', usersResponse.status)
      console.log('Users Response:', JSON.stringify(usersData, null, 2))
      
      if (usersData.success) {
        console.log('✅ Admin users API working')
      } else {
        console.log('❌ Admin users API failed')
      }
      
      // Step 4: Test partners API
      console.log('\n📡 Step 4: Testing partners API...')
      const partnersResponse = await fetch('http://localhost:3000/api/admin/partners', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })
      
      const partnersData = await partnersResponse.json()
      console.log('Partners Status:', partnersResponse.status)
      console.log('Partners Response:', JSON.stringify(partnersData, null, 2))
      
      if (partnersData.success) {
        console.log('✅ Admin partners API working')
      } else {
        console.log('❌ Admin partners API failed')
      }
      
    } else {
      console.log('❌ Session validation failed')
    }
    
  } catch (error) {
    console.error('❌ Error testing login flow:', error.message)
  }
}

testFullLoginFlow()
