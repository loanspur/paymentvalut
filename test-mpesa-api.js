// Test M-Pesa API directly to debug the 503 error
const testMpesaAPI = async () => {
  const consumerKey = 'dZmQcVSM3BoHGcemdAvCXHHgllSmK5GuKkqOL45Lkj7PW2nM'
  const consumerSecret = 'xVK7omZJs2i0ZdnPTGbPJoWVA1o2Gs7sua5QLsBg9OYtrA4rOA90ULGZ8i1ATYwM'
  const shortCode = '3037935'
  const initiatorPassword = 'YOUR_ACTUAL_INITIATOR_PASSWORD' // This needs to be the real password
  
  console.log('🔍 Testing M-Pesa API...')
  console.log('Consumer Key:', consumerKey)
  console.log('Short Code:', shortCode)
  console.log('Has Initiator Password:', !!initiatorPassword)
  
  try {
    // Step 1: Get access token
    console.log('\n1. Getting access token...')
    const tokenResponse = await fetch('https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')}`
      }
    })
    
    console.log('Token Response Status:', tokenResponse.status)
    const tokenData = await tokenResponse.json()
    console.log('Token Data:', tokenData)
    
    if (!tokenData.access_token) {
      throw new Error('No access token received')
    }
    
    // Step 2: Test B2C request
    console.log('\n2. Testing B2C request...')
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3)
    const securityCredential = Buffer.from(`${shortCode}${initiatorPassword}${timestamp}`).toString('base64')
    
    console.log('Timestamp:', timestamp)
    console.log('Security Credential Length:', securityCredential.length)
    
    const b2cRequest = {
      InitiatorName: "LSVaultAPI",
      SecurityCredential: securityCredential,
      CommandID: "BusinessPayment",
      Amount: 10,
      PartyA: shortCode,
      PartyB: "254727638940",
      Remarks: "Test Disbursement",
      QueueTimeOutURL: "https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-timeout",
      ResultURL: "https://mapgmmiobityxaaevomp.supabase.co/functions/v1/mpesa-b2c-result",
      Occasion: "Disbursement"
    }
    
    console.log('B2C Request:', JSON.stringify(b2cRequest, null, 2))
    
    const b2cResponse = await fetch('https://api.safaricom.co.ke/mpesa/b2c/v1/paymentrequest', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(b2cRequest)
    })
    
    console.log('\nB2C Response Status:', b2cResponse.status)
    const b2cData = await b2cResponse.json()
    console.log('B2C Response Data:', JSON.stringify(b2cData, null, 2))
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  }
}

testMpesaAPI()
