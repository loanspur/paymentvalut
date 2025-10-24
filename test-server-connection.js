// Test script to verify server connection and API endpoints
// Run this in browser console after the server has started

async function testServerConnection() {
  console.log('🧪 Testing server connection...')
  
  try {
    // Test 1: Check if server is responding
    console.log('📋 Step 1: Testing server response...')
    const rootResponse = await fetch('/', {
      method: 'GET',
      credentials: 'include'
    })
    
    console.log('📡 Root endpoint status:', rootResponse.status)
    
    if (rootResponse.ok) {
      console.log('✅ Server is responding')
    } else {
      console.log('⚠️ Server returned status:', rootResponse.status)
    }
    
    // Test 2: Check auth endpoint
    console.log('📋 Step 2: Testing auth endpoint...')
    const authResponse = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    console.log('📡 Auth endpoint status:', authResponse.status)
    
    if (authResponse.status === 401) {
      console.log('✅ Auth endpoint working (401 expected without auth)')
    } else if (authResponse.ok) {
      const data = await authResponse.json()
      console.log('✅ Auth endpoint working, user authenticated:', data)
    } else {
      console.log('⚠️ Auth endpoint returned unexpected status:', authResponse.status)
    }
    
    // Test 3: Check secure login endpoint
    console.log('📋 Step 3: Testing secure login endpoint...')
    const loginResponse = await fetch('/api/auth/secure-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword'
      })
    })
    
    console.log('📡 Login endpoint status:', loginResponse.status)
    
    if (loginResponse.status === 401) {
      console.log('✅ Login endpoint working (401 expected for invalid credentials)')
    } else {
      console.log('⚠️ Login endpoint returned unexpected status:', loginResponse.status)
    }
    
    console.log('🎉 Server connection test completed!')
    
  } catch (error) {
    console.error('❌ Server connection test failed:', error)
    
    if (error.message && error.message.includes('ERR_CONNECTION_RESET')) {
      console.log('🔄 Connection reset detected - server may be restarting')
      console.log('💡 Try refreshing the page in a few seconds')
    } else if (error.message && error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.log('🚫 Connection refused - server may not be running')
      console.log('💡 Make sure to run: npm run dev')
    } else {
      console.log('💡 Check the console for more details')
    }
  }
}

// Run the test
testServerConnection()
