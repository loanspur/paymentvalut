// Test script to check Mifos X client details
// This will help us understand why client details are incorrect

const fetch = require('node-fetch')

// Replace with your actual Mifos X credentials
const mifosConfig = {
  hostUrl: 'https://system.loanspur.com',
  username: 'admin',
  password: 'your_password_here', // Replace with actual password
  tenantId: 'umoja'
}

async function testClientDetails(clientId) {
  console.log(`🔍 Testing client details for Client ID: ${clientId}`)
  console.log('=' .repeat(60))

  try {
    const mifosUrl = `${mifosConfig.hostUrl}/fineract-provider/api/v1/clients/${clientId}?tenantIdentifier=${mifosConfig.tenantId}`
    
    console.log('📡 Making request to:', mifosUrl)
    
    const response = await fetch(mifosUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${mifosConfig.username}:${mifosConfig.password}`).toString('base64')}`,
        'Fineract-Platform-TenantId': mifosConfig.tenantId
      }
    })

    console.log('📊 Response status:', response.status)
    console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ Error response:', errorText)
      return
    }

    const data = await response.json()
    
    console.log('✅ Client details received:')
    console.log('   Display Name:', data.displayName)
    console.log('   Mobile No:', data.mobileNo)
    console.log('   Email:', data.emailAddress)
    console.log('   Account No:', data.accountNo)
    console.log('   First Name:', data.firstname)
    console.log('   Last Name:', data.lastname)
    console.log('   Full Name:', data.fullname)
    console.log('   ID:', data.id)
    
    console.log('\n📋 Full response data:')
    console.log(JSON.stringify(data, null, 2))

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Test with the client ID from your loan (you mentioned client ID 1)
console.log('🧪 Testing Mifos X Client Details API')
console.log('📝 Note: Please update the password in this script first')
console.log('')

if (mifosConfig.password.includes('your_password_here')) {
  console.log('❌ Please update the password in this script first')
  process.exit(1)
}

// Test with client ID 1 (from your loan)
testClientDetails(1)
