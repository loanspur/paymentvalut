// Test the setup API
const fetch = require('node-fetch').default || require('node-fetch')

async function testSetupAPI() {
  console.log('🔍 Testing setup API...')
  
  try {
    // Test GET request
    console.log('📡 Testing GET /api/setup/admin...')
    const getResponse = await fetch('http://localhost:3000/api/setup/admin')
    const getData = await getResponse.json()
    
    console.log('GET Status:', getResponse.status)
    console.log('GET Response:', JSON.stringify(getData, null, 2))
    
    // Test POST request
    console.log('\n📡 Testing POST /api/setup/admin...')
    const postResponse = await fetch('http://localhost:3000/api/setup/admin', {
      method: 'POST'
    })
    const postData = await postResponse.json()
    
    console.log('POST Status:', postResponse.status)
    console.log('POST Response:', JSON.stringify(postData, null, 2))
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message)
  }
}

testSetupAPI()
