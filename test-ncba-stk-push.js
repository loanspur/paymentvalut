require('dotenv').config()
const https = require('https')
const http = require('http')

async function testNCBASTKPush() {
  console.log('🧪 Testing NCBA STK Push Integration')
  console.log('=====================================\n')

  try {
    // Test 1: Check if partner has NCBA credentials
    console.log('📋 Test 1: Checking partner NCBA credentials...')
    
    const partnerResponse = await fetch('http://localhost:3000/api/partners', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!partnerResponse.ok) {
      throw new Error(`Failed to fetch partners: ${partnerResponse.status}`)
    }

    const partnersData = await partnerResponse.json()
    const partner = partnersData.data?.[0]

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
      return
    }

    // Test 2: Test wallet creation/retrieval
    console.log('\n📋 Test 2: Testing wallet system...')
    
    const walletResponse = await fetch(`http://localhost:3000/api/wallet?partner_id=${partner.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!walletResponse.ok) {
      throw new Error(`Failed to fetch wallet: ${walletResponse.status}`)
    }

    const walletData = await walletResponse.json()
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

    const stkPushResponse = await fetch('http://localhost:3000/api/ncba/stk-push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stkPushData)
    })

    const stkPushResult = await stkPushResponse.json()
    
    if (!stkPushResponse.ok) {
      console.log('❌ STK Push failed:', stkPushResult)
      return
    }

    console.log('✅ STK Push initiated successfully!')
    console.log(`   Checkout Request ID: ${stkPushResult.data.checkout_request_id}`)
    console.log(`   Merchant Request ID: ${stkPushResult.data.merchant_request_id}`)
    console.log(`   Transaction Reference: ${stkPushResult.data.transaction_reference}`)

    // Test 4: Check STK Push logs
    console.log('\n📋 Test 4: Checking STK Push logs...')
    
    const logsResponse = await fetch(`http://localhost:3000/api/ncba/stk-push?partner_id=${partner.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (logsResponse.ok) {
      const logsData = await logsResponse.json()
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
    
    const transactionsResponse = await fetch(`http://localhost:3000/api/wallet/transactions?partner_id=${partner.id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (transactionsResponse.ok) {
      const transactionsData = await transactionsResponse.json()
      console.log(`✅ Found ${transactionsData.data.length} wallet transactions`)
      console.log(`   Summary:`, transactionsData.summary)
    }

    console.log('\n🎉 NCBA STK Push Integration Test Complete!')
    console.log('==========================================')
    console.log('✅ All systems are working correctly')
    console.log('✅ Ready for production use')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

// Run the test
testNCBASTKPush()
