// Test the exact browser flow
const fetch = require('node-fetch').default || require('node-fetch')

async function testBrowserFlow() {
  console.log('🔍 Testing browser flow simulation...')
  
  try {
    // Step 1: Login (simulate what happens in browser)
    console.log('📡 Step 1: Login...')
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
    
    if (!loginData.success) {
      console.error('❌ Login failed')
      return
    }
    
    const sessionToken = loginData.session_token
    console.log('✅ Login successful, session token:', sessionToken)
    
    // Step 2: Simulate what happens when admin page loads
    console.log('\n📡 Step 2: Simulating admin page load...')
    
    // First, check if there's a session token in localStorage (simulated)
    console.log('🔍 Checking session token in localStorage (simulated)...')
    if (sessionToken) {
      console.log('✅ Session token found in localStorage')
      
      // Validate session (this is what the admin page does)
      console.log('🔐 Validating session...')
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
        
        if (meData.user.role === 'admin') {
          console.log('✅ Should redirect to /admin')
          console.log('✅ Admin page should load successfully')
        } else {
          console.log('❌ User is not admin, should redirect to /partner')
        }
      } else {
        console.log('❌ Session validation failed')
        console.log('❌ Should redirect to /login')
      }
    } else {
      console.log('❌ No session token in localStorage')
      console.log('❌ Should redirect to /login')
    }
    
  } catch (error) {
    console.error('❌ Error testing browser flow:', error.message)
  }
}

testBrowserFlow()
