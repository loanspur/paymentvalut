// Test script to verify STK Push functionality
// Run this script to test the fixed STK Push implementation

require('dotenv').config()
const https = require('https')
const http = require('http')

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http
    
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
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          })
        } catch (error) {
          resolve({
            ok: false,
            status: res.statusCode,
            json: () => Promise.resolve({ error: 'Invalid JSON response' })
          })
        }
      })
    })
    
    req.on('error', reject)
    
    if (options.body) {
      req.write(options.body)
    }
    
    req.end()
  })
}

async function testSTKPushFix() {
  console.log('🧪 Testing STK Push Fix')
  console.log('========================\n')

  try {
    // Test 1: Check global NCBA system settings
    console.log('📋 Test 1: Checking global NCBA system settings...')
    
    const settingsResponse = await makeRequest('http://localhost:3000/api/system/settings?category=ncba', {
      method: 'GET'
    })

    if (!settingsResponse.ok) {
      throw new Error(`Failed to fetch NCBA settings: ${settingsResponse.status}`)
    }

    const settingsData = await settingsResponse.json()
    const settings = settingsData.data || {}

    console.log('✅ Global NCBA System Settings:')
    console.log(`   Business Short Code: ${settings.ncba_business_short_code?.value || 'Not set'}`)
    console.log(`   Notification Username: ${settings.ncba_notification_username?.value ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Notification Password: ${settings.ncba_notification_password?.value ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Notification Secret Key: ${settings.ncba_notification_secret_key?.value ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Account Number: ${settings.ncba_account_number?.value || 'Not set'}`)
    console.log(`   Account Reference Separator: ${settings.ncba_account_reference_separator?.value || 'Not set'}`)

    if (!settings.ncba_notification_username?.value || !settings.ncba_notification_password?.value || !settings.ncba_notification_secret_key?.value) {
      console.log('\n❌ Global NCBA credentials not configured. Please configure them first.')
      console.log('   Go to Settings > System Configuration > NCBA Settings')
      return
    }

    // Test 1.5: Check if we have partners
    console.log('\n📋 Test 1.5: Checking for active partners...')
    
    const partnerResponse = await makeRequest('http://localhost:3000/api/partners', {
      method: 'GET'
    })

    if (!partnerResponse.ok) {
      throw new Error(`Failed to fetch partners: ${partnerResponse.status}`)
    }

    const partnersData = await partnerResponse.json()
    const partner = partnersData.partners?.[0]

    if (!partner) {
      throw new Error('No partners found')
    }

    console.log(`✅ Found partner: ${partner.name} (ID: ${partner.id})`)
    console.log(`   Account Reference: WALLET${settings.ncba_account_reference_separator?.value || '#'}${partner.id}`)

    // Test 2: Test STK Push API endpoint
    console.log('\n📋 Test 2: Testing STK Push API endpoint...')
    
    const testPhoneNumber = '254700000000' // Test phone number
    const testAmount = 100 // Test amount in KES

    const stkPushResponse = await makeRequest('http://localhost:3000/api/wallet/topup/stk-push', {
      method: 'POST',
      headers: {
        'Cookie': 'auth_token=your_test_token_here' // You'll need to replace this with a real token
      },
      body: JSON.stringify({
        amount: testAmount,
        phone_number: testPhoneNumber
      })
    })

    console.log(`   Response Status: ${stkPushResponse.status}`)
    
    const stkPushData = await stkPushResponse.json()
    console.log(`   Response Data:`, JSON.stringify(stkPushData, null, 2))

    if (stkPushResponse.ok) {
      console.log('✅ STK Push API endpoint is working correctly!')
      console.log(`   Checkout Request ID: ${stkPushData.data?.checkout_request_id}`)
      console.log(`   Merchant Request ID: ${stkPushData.data?.merchant_request_id}`)
    } else {
      console.log('❌ STK Push API endpoint failed')
      console.log(`   Error: ${stkPushData.error}`)
    }

    // Test 3: Check STK Push logs
    console.log('\n📋 Test 3: Checking STK Push logs...')
    
    const logsResponse = await makeRequest('http://localhost:3000/api/ncba/stk-push-logs', {
      method: 'GET'
    })

    if (logsResponse.ok) {
      const logsData = await logsResponse.json()
      console.log(`✅ Found ${logsData.data?.length || 0} STK Push logs`)
      
      if (logsData.data?.length > 0) {
        const latestLog = logsData.data[0]
        console.log(`   Latest Log Status: ${latestLog.stk_push_status}`)
        console.log(`   Latest Log Amount: KES ${latestLog.amount}`)
        console.log(`   Latest Log Phone: ${latestLog.partner_phone}`)
      }
    } else {
      console.log('❌ Failed to fetch STK Push logs')
    }

    console.log('\n🎉 STK Push Fix Test Completed!')
    console.log('\n📝 Next Steps:')
    console.log('1. Make sure you have a valid auth token for testing')
    console.log('2. Test with a real phone number that has M-Pesa')
    console.log('3. Check your phone for the STK Push prompt')
    console.log('4. Monitor the callback endpoint for responses')

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

// Run the test
testSTKPushFix()
