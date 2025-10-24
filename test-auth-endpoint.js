// Test script to check if the auth endpoint is working
// Run this in browser console

async function testAuthEndpoint() {
  console.log('🧪 Testing auth endpoint...')
  
  try {
    // Test 1: Check if the endpoint is accessible
    console.log('📋 Step 1: Testing /api/auth/me endpoint...')
    
    const response = await fetch('/api/auth/me', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    })
    
    console.log('📡 Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Endpoint working, response:', data)
    } else {
      const errorText = await response.text()
      console.log('⚠️ Endpoint returned error:', response.status, errorText)
    }
    
  } catch (error) {
    console.error('❌ Endpoint test failed:', error)
    console.log('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    })
  }
}

// Test 2: Check server connectivity
async function testServerConnectivity() {
  console.log('🧪 Testing server connectivity...')
  
  try {
    const response = await fetch('/', {
      method: 'GET',
      credentials: 'include'
    })
    
    console.log('📡 Root endpoint status:', response.status)
    
    if (response.ok) {
      console.log('✅ Server is responding')
    } else {
      console.log('⚠️ Server returned status:', response.status)
    }
    
  } catch (error) {
    console.error('❌ Server connectivity test failed:', error)
  }
}

// Run both tests
console.log('🚀 Starting auth endpoint tests...')
testAuthEndpoint()
testServerConnectivity()
