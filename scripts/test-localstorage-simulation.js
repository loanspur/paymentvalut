// Test localStorage simulation
const fetch = require('node-fetch').default || require('node-fetch')

async function testLocalStorageSimulation() {
  console.log('🔍 Testing localStorage simulation...')
  
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
    if (!loginData.success) {
      console.error('❌ Login failed')
      return
    }
    
    const sessionToken = loginData.session_token
    console.log('✅ Login successful, session token:', sessionToken)
    
    // Step 2: Simulate localStorage.setItem
    console.log('\n📝 Step 2: Simulating localStorage.setItem...')
    console.log('localStorage.setItem("session_token", "' + sessionToken + '")')
    
    // Step 3: Simulate localStorage.getItem
    console.log('\n📖 Step 3: Simulating localStorage.getItem...')
    console.log('localStorage.getItem("session_token") would return:', sessionToken)
    
    // Step 4: Test session validation with the token
    console.log('\n🔐 Step 4: Testing session validation...')
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
      console.log('✅ User role:', meData.user.role)
      console.log('✅ Should be able to access admin dashboard')
    } else {
      console.log('❌ Session validation failed')
    }
    
  } catch (error) {
    console.error('❌ Error testing localStorage simulation:', error.message)
  }
}

testLocalStorageSimulation()
