// Test login API
const fetch = require('node-fetch').default || require('node-fetch')

async function testLogin() {
  console.log('🔍 Testing login API...')
  
  try {
    // Test login with admin credentials
    console.log('📡 Testing POST /api/auth/login...')
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
    
    if (loginData.success && loginData.token) {
      console.log('✅ Login successful!')
      
      // Test the /me endpoint
      console.log('\n📡 Testing GET /api/auth/me...')
      const meResponse = await fetch('http://localhost:3000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${loginData.token}`
        }
      })
      
      const meData = await meResponse.json()
      console.log('Me Status:', meResponse.status)
      console.log('Me Response:', JSON.stringify(meData, null, 2))
    }
    
  } catch (error) {
    console.error('❌ Error testing login:', error.message)
  }
}

testLogin()
