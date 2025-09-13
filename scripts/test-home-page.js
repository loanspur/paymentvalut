const fetch = require('node-fetch').default || require('node-fetch')
require('dotenv').config({ path: '.env.local' })

async function testHomePage() {
  console.log('🔍 Testing home page functionality...')
  
  try {
    // Step 1: Login
    console.log('📡 Step 1: Logging in...')
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@mpesavault.com',
        password: 'admin123'
      })
    })
    
    const loginData = await loginResponse.json()
    console.log('Login Status:', loginResponse.status)
    console.log('Login Success:', loginData.success)
    
    if (!loginData.success) {
      console.log('❌ Login failed')
      return
    }
    
    const sessionToken = loginData.session_token
    console.log('✅ Login successful, session token:', sessionToken)
    
    // Step 2: Test home page data loading
    console.log('\n📡 Step 2: Testing home page data loading...')
    
    // Test partners API
    const partnersResponse = await fetch('http://localhost:3000/api/admin/partners', {
      headers: {
        'Authorization': `Bearer ${sessionToken}`
      }
    })
    const partnersData = await partnersResponse.json()
    console.log('Partners Status:', partnersResponse.status)
    console.log('Partners Success:', partnersData.success)
    console.log('Partners Count:', partnersData.partners?.length || 0)
    
    // Test disbursements API
    const disbursementsResponse = await fetch('http://localhost:3000/api/admin/disbursements')
    const disbursementsData = await disbursementsResponse.json()
    console.log('Disbursements Status:', disbursementsResponse.status)
    console.log('Disbursements Success:', disbursementsData.success)
    console.log('Disbursements Count:', disbursementsData.disbursements?.length || 0)
    
    // Step 3: Test home page HTML
    console.log('\n📡 Step 3: Testing home page HTML...')
    const homeResponse = await fetch('http://localhost:3000/', {
      headers: {
        'Cookie': `session_token=${sessionToken}`
      }
    })
    
    const homeHtml = await homeResponse.text()
    console.log('Home Page Status:', homeResponse.status)
    console.log('Home Page Length:', homeHtml.length)
    
    // Check for key elements
    const hasWelcome = homeHtml.includes('Welcome back')
    const hasSendMoney = homeHtml.includes('Send Money')
    const hasHistory = homeHtml.includes('Recent Disbursements')
    const hasPartners = homeHtml.includes('Partners')
    
    console.log('✅ Has Welcome:', hasWelcome)
    console.log('✅ Has Send Money:', hasSendMoney)
    console.log('✅ Has History:', hasHistory)
    console.log('✅ Has Partners:', hasPartners)
    
    if (hasWelcome && hasSendMoney && hasHistory && hasPartners) {
      console.log('\n🎉 Home page is working correctly!')
    } else {
      console.log('\n⚠️ Home page may have issues')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testHomePage()
