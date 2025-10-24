// Test script to verify admin login flow
// Run this in browser console on the login page

async function testAdminLogin() {
  console.log('🧪 Testing admin login flow...')
  
  try {
    // Test 1: Check if admin user exists
    console.log('📋 Step 1: Checking admin user setup...')
    const setupResponse = await fetch('/api/setup/admin', {
      method: 'GET',
      credentials: 'include'
    })
    
    if (setupResponse.ok) {
      const setupData = await setupResponse.json()
      console.log('✅ Admin setup status:', setupData)
    } else {
      console.log('❌ Admin setup check failed:', setupResponse.status)
    }
    
    // Test 2: Test login with admin credentials
    console.log('📋 Step 2: Testing admin login...')
    const loginResponse = await fetch('/api/auth/secure-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: 'admin@mpesavault.com',
        password: 'admin123'
      })
    })
    
    if (loginResponse.ok) {
      const loginData = await loginResponse.json()
      console.log('✅ Login successful:', loginData)
      
      // Test 3: Check authentication status
      console.log('📋 Step 3: Checking authentication status...')
      const authResponse = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      
      if (authResponse.ok) {
        const authData = await authResponse.json()
        console.log('✅ Authentication check successful:', authData)
        
        // Test 4: Check if user should be redirected to admin dashboard
        if (authData.user && ['admin', 'super_admin'].includes(authData.user.role)) {
          console.log('✅ User should be redirected to admin dashboard')
          console.log('🎯 Expected redirect URL: /admin-dashboard')
        } else {
          console.log('⚠️ User role does not match admin expectations:', authData.user?.role)
        }
      } else {
        console.log('❌ Authentication check failed:', authResponse.status)
      }
    } else {
      const errorData = await loginResponse.json()
      console.log('❌ Login failed:', errorData)
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error)
  }
}

// Run the test
testAdminLogin()
