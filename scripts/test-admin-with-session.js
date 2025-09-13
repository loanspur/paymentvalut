// Test admin page with valid session
const fetch = require('node-fetch').default || require('node-fetch')

async function testAdminWithSession() {
  console.log('🔍 Testing admin page with valid session...')
  
  try {
    // Step 1: Login to get session token
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
    
    // Step 2: Test admin page with session token in header
    console.log('\n📡 Step 2: Testing admin page with session...')
    
    // Simulate what happens when the browser makes requests with the session token
    const adminResponse = await fetch('http://localhost:3000/admin', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })
    
    console.log('Admin Page Status:', adminResponse.status)
    
    if (adminResponse.status === 200) {
      const content = await adminResponse.text()
      console.log('Admin Page Content Length:', content.length)
      
      // Check for specific content that should be present
      if (content.includes('Admin Dashboard')) {
        console.log('✅ Admin page contains "Admin Dashboard"')
      } else {
        console.log('❌ Admin page missing "Admin Dashboard"')
      }
      
      if (content.includes('Loading...')) {
        console.log('⚠️ Admin page still showing loading state')
      } else {
        console.log('✅ Admin page not showing loading state')
      }
      
      if (content.includes('Welcome, admin@mpesavault.com')) {
        console.log('✅ Admin page shows welcome message')
      } else {
        console.log('❌ Admin page missing welcome message')
      }
      
      // Check for JavaScript errors or issues
      if (content.includes('error') || content.includes('Error')) {
        console.log('⚠️ Admin page contains error text')
      }
      
    } else {
      console.log('❌ Admin page returned error status:', adminResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing admin page with session:', error.message)
  }
}

testAdminWithSession()
