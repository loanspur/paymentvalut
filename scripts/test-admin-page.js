// Test admin page accessibility
const fetch = require('node-fetch').default || require('node-fetch')

async function testAdminPage() {
  console.log('🔍 Testing admin page accessibility...')
  
  try {
    // Test admin page
    console.log('📡 Testing /admin page...')
    const adminResponse = await fetch('http://localhost:3000/admin')
    
    console.log('Admin Page Status:', adminResponse.status)
    console.log('Admin Page Headers:', Object.fromEntries(adminResponse.headers.entries()))
    
    if (adminResponse.status === 200) {
      const content = await adminResponse.text()
      console.log('Admin Page Content Length:', content.length)
      console.log('Admin Page Content Preview:', content.substring(0, 200) + '...')
      
      // Check if it contains expected elements
      if (content.includes('Admin Dashboard')) {
        console.log('✅ Admin page contains expected content')
      } else {
        console.log('❌ Admin page missing expected content')
      }
      
      if (content.includes('Loading...')) {
        console.log('⚠️ Admin page shows loading state (expected for unauthenticated users)')
      }
      
    } else {
      console.log('❌ Admin page returned error status:', adminResponse.status)
    }
    
  } catch (error) {
    console.error('❌ Error testing admin page:', error.message)
  }
}

testAdminPage()
