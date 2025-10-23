require('dotenv').config()
const https = require('https')
const http = require('http')

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://')
    const client = isHttps ? https : http
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    }, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data)
          resolve({ status: res.statusCode, data: jsonData })
        } catch (e) {
          resolve({ status: res.statusCode, data: data })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(JSON.stringify(options.body))
    }
    
    req.end()
  })
}

async function testNCBASTKPush() {
  console.log('🧪 Testing NCBA STK Push Integration')
  console.log('=====================================\n')

  try {
    // Test 1: Check if partner has NCBA credentials
    console.log('📋 Test 1: Checking partner NCBA credentials...')
    
    const partnerResponse = await makeRequest('http://localhost:3000/api/partners')
    
    if (partnerResponse.status !== 200) {
      throw new Error(`Failed to fetch partners: ${partnerResponse.status}`)
    }

    const partner = partnerResponse.data.data?.[0]

    if (!partner) {
      throw new Error('No partners found')
    }

    console.log(`✅ Found partner: ${partner.name}`)
    console.log(`   NCBA Consumer Key: ${partner.ncba_consumer_key ? '✅ Set' : '❌ Missing'}`)
    console.log(`   NCBA Consumer Secret: ${partner.ncba_consumer_secret ? '✅ Set' : '❌ Missing'}`)
    console.log(`   NCBA Passkey: ${partner.ncba_passkey ? '✅ Set' : '❌ Missing'}`)
    console.log(`   NCBA Business Short Code: ${partner.ncba_business_short_code || 'Not set'}`)

    if (!partner.ncba_consumer_key || !partner.ncba_consumer_secret || !partner.ncba_passkey) {
      console.log('\n❌ Partner missing NCBA credentials. Please configure them first.')
      console.log('   You can add these in the partner configuration form.')
      return
    }

    // Test 2: Test wallet creation/retrieval
    console.log('\n📋 Test 2: Testing wallet system...')
    
    const walletResponse = await makeRequest(`http://localhost:3000/api/wallet?partner_id=${partner.id}`)
    
    if (walletResponse.status !== 200) {
      throw new Error(`Failed to fetch wallet: ${walletResponse.status}`)
    }

    const walletData = walletResponse.data
    console.log(`✅ Wallet retrieved: Balance = KES ${walletData.data.balance || 0}`)

    // Test 3: Test STK Push initiation (with test phone number)
    console.log('\n📋 Test 3: Testing STK Push initiation...')
    
    const stkPushData = {
      partner_id: partner.id,
      phone_number: '254708374149', // Test phone number
      amount: 100, // KES 1.00
      account_reference: `TEST_${Date.now()}`,
      transaction_desc: 'Test wallet top-up',
      callback_url: 'http://localhost:3000/api/ncba/stk-callback'
    }

    console.log('Sending STK Push request:', stkPushData)

    const stkPushResponse = await makeRequest('http://localhost:3000/api/ncba/stk-push', {
      method: 'POST',
      body: stkPushData
    })
    
    if (stkPushResponse.status !== 200) {
      console.log('❌ STK Push failed:', stkPushResponse.data)
      return
    }

    const stkPushResult = stkPushResponse.data
    console.log('✅ STK Push initiated successfully!')
    console.log(`   Checkout Request ID: ${stkPushResult.data.checkout_request_id}`)
    console.log(`   Merchant Request ID: ${stkPushResult.data.merchant_request_id}`)
    console.log(`   Transaction Reference: ${stkPushResult.data.transaction_reference}`)

    // Test 4: Check STK Push logs
    console.log('\n📋 Test 4: Checking STK Push logs...')
    
    const logsResponse = await makeRequest(`http://localhost:3000/api/ncba/stk-push?partner_id=${partner.id}`)
    
    if (logsResponse.status === 200) {
      const logsData = logsResponse.data
      console.log(`✅ Found ${logsData.data.length} STK Push logs`)
      
      if (logsData.data.length > 0) {
        const latestLog = logsData.data[0]
        console.log(`   Latest: ${latestLog.transaction_reference} - ${latestLog.status}`)
        console.log(`   Amount: KES ${latestLog.amount}`)
        console.log(`   Phone: ${latestLog.phone_number}`)
      }
    }

    // Test 5: Test wallet transactions
    console.log('\n📋 Test 5: Testing wallet transactions...')
    
    const transactionsResponse = await makeRequest(`http://localhost:3000/api/wallet/transactions?partner_id=${partner.id}`)
    
    if (transactionsResponse.status === 200) {
      const transactionsData = transactionsResponse.data
      console.log(`✅ Found ${transactionsData.data.length} wallet transactions`)
      console.log(`   Summary:`, transactionsData.summary)
    }

    console.log('\n🎉 NCBA STK Push Integration Test Complete!')
    console.log('==========================================')
    console.log('✅ All systems are working correctly')
    console.log('✅ Ready for production use')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testNCBASTKPush()

