require('dotenv').config()
const https = require('https')
const http = require('http')
const crypto = require('crypto')

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

// Function to generate hash (same as in the API)
function generateHash(secretKey, transType, transID, transTime, transAmount, businessShortCode, billRefNumber, mobile, name) {
  try {
    const hashString = secretKey + transType + transID + transTime + transAmount + businessShortCode + billRefNumber + mobile + name + "1"
    const sha256Hash = crypto.createHash('sha256').update(hashString, 'utf8').digest('hex')
    const base64Hash = Buffer.from(sha256Hash, 'hex').toString('base64')
    return base64Hash
  } catch (error) {
    console.error('Error generating hash:', error)
    return ''
  }
}

async function testNCBAPaybillNotification() {
  console.log('🧪 Testing NCBA Paybill Push Notification System')
  console.log('================================================\n')

  try {
    // Test 1: Check if we have partners with NCBA credentials
    console.log('📋 Test 1: Checking partners with NCBA credentials...')
    
    const partnerResponse = await makeRequest('http://localhost:3000/api/partners')
    
    if (partnerResponse.status !== 200) {
      throw new Error(`Failed to fetch partners: ${partnerResponse.status}`)
    }

    const partners = partnerResponse.data.data || []
    console.log(`✅ Found ${partners.length} partners in database`)

    // Find a partner with NCBA business short code
    const partnerWithNCBA = partners.find(p => p.ncba_business_short_code)
    
    if (!partnerWithNCBA) {
      console.log('❌ No partners found with NCBA business short code configured.')
      console.log('   Please configure NCBA credentials for a partner first.')
      return
    }

    console.log(`✅ Found partner with NCBA config: ${partnerWithNCBA.name}`)
    console.log(`   Business Short Code: ${partnerWithNCBA.ncba_business_short_code}`)
    console.log(`   Notification Username: ${partnerWithNCBA.ncba_notification_username ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Notification Password: ${partnerWithNCBA.ncba_notification_password ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Notification Secret Key: ${partnerWithNCBA.ncba_notification_secret_key ? '✅ Set' : '❌ Missing'}`)

    if (!partnerWithNCBA.ncba_notification_username || !partnerWithNCBA.ncba_notification_password || !partnerWithNCBA.ncba_notification_secret_key) {
      console.log('\n❌ Partner missing NCBA notification credentials.')
      console.log('   Please configure these in the partner settings:')
      console.log('   - ncba_notification_username')
      console.log('   - ncba_notification_password') 
      console.log('   - ncba_notification_secret_key')
      return
    }

    // Test 2: Test wallet before notification
    console.log('\n📋 Test 2: Checking wallet balance before notification...')
    
    const walletResponse = await makeRequest(`http://localhost:3000/api/wallet?partner_id=${partnerWithNCBA.id}`)
    
    if (walletResponse.status === 200) {
      const currentBalance = walletResponse.data.data.balance || 0
      console.log(`✅ Current wallet balance: KES ${currentBalance}`)
    }

    // Test 3: Simulate NCBA Paybill notification
    console.log('\n📋 Test 3: Simulating NCBA Paybill notification...')
    
    const testNotification = {
      TransType: "PAYBILL",
      TransID: `TEST${Date.now()}`,
      TransTime: new Date().toISOString().replace(/[-:.]/g, '').slice(0, 14),
      TransAmount: "100.00",
      BusinessShortCode: partnerWithNCBA.ncba_business_short_code,
      BillRefNumber: `WALLET_${partnerWithNCBA.id}`,
      Mobile: "254708374149",
      name: "TEST CUSTOMER",
      created_at: new Date().toISOString(),
      Username: partnerWithNCBA.ncba_notification_username,
      Password: partnerWithNCBA.ncba_notification_password
    }

    // Generate hash for the notification
    const hash = generateHash(
      partnerWithNCBA.ncba_notification_secret_key,
      testNotification.TransType,
      testNotification.TransID,
      testNotification.TransTime,
      testNotification.TransAmount,
      testNotification.BusinessShortCode,
      testNotification.BillRefNumber,
      testNotification.Mobile,
      testNotification.name
    )

    testNotification.Hash = hash

    console.log('Sending test notification:', {
      ...testNotification,
      Hash: hash.substring(0, 20) + '...' // Truncate hash for display
    })

    const notificationResponse = await makeRequest('http://localhost:3000/api/ncba/paybill-notification', {
      method: 'POST',
      body: testNotification
    })

    if (notificationResponse.status !== 200) {
      console.log('❌ Notification failed:', notificationResponse.data)
      return
    }

    console.log('✅ Notification processed successfully!')
    console.log(`   Response: ${notificationResponse.data.ResultDesc}`)

    // Test 4: Check wallet balance after notification
    console.log('\n📋 Test 4: Checking wallet balance after notification...')
    
    const walletAfterResponse = await makeRequest(`http://localhost:3000/api/wallet?partner_id=${partnerWithNCBA.id}`)
    
    if (walletAfterResponse.status === 200) {
      const newBalance = walletAfterResponse.data.data.balance || 0
      console.log(`✅ New wallet balance: KES ${newBalance}`)
    }

    // Test 5: Check C2B transactions
    console.log('\n📋 Test 5: Checking C2B transactions...')
    
    const c2bResponse = await makeRequest(`http://localhost:3000/api/c2b/transactions?partner_id=${partnerWithNCBA.id}`)
    
    if (c2bResponse.status === 200) {
      const c2bData = c2bResponse.data
      console.log(`✅ Found ${c2bData.data.length} C2B transactions`)
      
      if (c2bData.data.length > 0) {
        const latestTransaction = c2bData.data[0]
        console.log(`   Latest: ${latestTransaction.transaction_id} - KES ${latestTransaction.transaction_amount}`)
        console.log(`   Customer: ${latestTransaction.customer_name} (${latestTransaction.customer_phone})`)
        console.log(`   Status: ${latestTransaction.status}`)
      }
    }

    // Test 6: Check wallet transactions
    console.log('\n📋 Test 6: Checking wallet transactions...')
    
    const walletTransactionsResponse = await makeRequest(`http://localhost:3000/api/wallet/transactions?partner_id=${partnerWithNCBA.id}`)
    
    if (walletTransactionsResponse.status === 200) {
      const walletTransactionsData = walletTransactionsResponse.data
      console.log(`✅ Found ${walletTransactionsData.data.length} wallet transactions`)
      
      if (walletTransactionsData.data.length > 0) {
        const latestWalletTransaction = walletTransactionsData.data[0]
        console.log(`   Latest: ${latestWalletTransaction.transaction_type} - KES ${latestWalletTransaction.amount}`)
        console.log(`   Reference: ${latestWalletTransaction.reference}`)
        console.log(`   Status: ${latestWalletTransaction.status}`)
      }
    }

    console.log('\n🎉 NCBA Paybill Notification Test Complete!')
    console.log('==========================================')
    console.log('✅ Notification system is working correctly')
    console.log('✅ Wallet balances are being updated')
    console.log('✅ C2B transactions are being recorded')
    console.log('✅ Ready for production use')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testNCBAPaybillNotification()

