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

async function getNCBARequestDetails() {
  console.log('📋 NCBA API Request Form Details')
  console.log('=================================\n')

  try {
    // Get system NCBA settings
    console.log('🔍 Retrieving NCBA system settings...')
    
    const settingsResponse = await makeRequest('http://localhost:3000/api/system/settings?category=ncba')
    
    if (settingsResponse.status !== 200) {
      console.log('❌ Failed to fetch system settings:', settingsResponse.data)
      return
    }

    const settings = settingsResponse.data.data
    console.log('✅ System settings retrieved successfully\n')

    // Display the details needed for NCBA form
    console.log('📝 NCBA REQUEST FORM DETAILS:')
    console.log('=============================\n')

    // Yellow Highlight - Customer Name and Account No
    console.log('🟡 YELLOW HIGHLIGHT - Customer Name and Account No:')
    console.log('---------------------------------------------------')
    console.log(`Customer Name: [YOUR_ORGANIZATION_NAME]`)
    console.log(`Account No: ${settings.ncba_account_number?.value || '123456'}`)
    console.log('')

    // Blue Highlight - API Credentials
    console.log('🔵 BLUE HIGHLIGHT - API Credentials:')
    console.log('------------------------------------')
    console.log(`Endpoints/URL: ${settings.ncba_notification_endpoint_url?.value || 'NOT_SET'}`)
    console.log(`Username: ${settings.ncba_notification_username?.value || 'NOT_SET'}`)
    console.log(`Password: ${settings.ncba_notification_password?.value || 'NOT_SET'}`)
    console.log(`Secret key: ${settings.ncba_notification_secret_key?.value || 'NOT_SET'}`)
    console.log('')

    // Additional NCBA Form Details
    console.log('📋 ADDITIONAL NCBA FORM DETAILS:')
    console.log('================================')
    console.log(`Paybill No: ${settings.ncba_business_short_code?.value || '880100'}`)
    console.log(`Request Format: JSON ✓ (recommended)`)
    console.log('')

    // Check if all required fields are set
    const requiredFields = [
      'ncba_notification_endpoint_url',
      'ncba_notification_username', 
      'ncba_notification_password',
      'ncba_notification_secret_key'
    ]

    const missingFields = requiredFields.filter(field => !settings[field]?.value)
    
    if (missingFields.length > 0) {
      console.log('⚠️  MISSING REQUIRED FIELDS:')
      console.log('============================')
      missingFields.forEach(field => {
        console.log(`❌ ${field}: NOT_SET`)
      })
      console.log('')
      console.log('🔧 TO FIX:')
      console.log('1. Go to /settings page')
      console.log('2. Scroll to "NCBA Paybill Settings"')
      console.log('3. Fill in the missing fields')
      console.log('4. Click "Save NCBA Settings"')
      console.log('5. Run this script again')
    } else {
      console.log('✅ ALL REQUIRED FIELDS ARE SET!')
      console.log('You can now fill in the NCBA request form.')
    }

    console.log('')
    console.log('📋 COMPLETE NCBA FORM FILLING GUIDE:')
    console.log('====================================')
    console.log('1. Customer Name: [Enter your organization name]')
    console.log('2. Account No:', settings.ncba_account_number?.value || '123456')
    console.log('3. Paybill No:', settings.ncba_business_short_code?.value || '880100')
    console.log('4. Endpoints/URL:', settings.ncba_notification_endpoint_url?.value || 'NOT_SET')
    console.log('5. Username:', settings.ncba_notification_username?.value || 'NOT_SET')
    console.log('6. Password:', settings.ncba_notification_password?.value || 'NOT_SET')
    console.log('7. Secret key:', settings.ncba_notification_secret_key?.value || 'NOT_SET')
    console.log('8. Request Format: Check JSON ✓')

  } catch (error) {
    console.error('❌ Error retrieving NCBA details:', error.message)
  }
}

// Run the script
getNCBARequestDetails()


