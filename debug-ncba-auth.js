// Debug script to test NCBA authentication
// This will help identify why NCBA authentication is failing

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function debugNCBAAuthentication() {
  try {
    console.log('🔍 Debugging NCBA Authentication...\n')

    // 1. Check NCBA settings in database
    console.log('1️⃣ Checking NCBA settings in database...')
    const { data: ncbaSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, is_encrypted')
      .in('setting_key', [
        'ncba_business_short_code',
        'ncba_notification_username', 
        'ncba_notification_password',
        'ncba_notification_secret_key',
        'ncba_account_number',
        'ncba_account_reference_separator'
      ])

    if (settingsError) {
      console.error('❌ Error fetching NCBA settings:', settingsError)
      return
    }

    console.log('📊 NCBA Settings Found:')
    ncbaSettings.forEach(setting => {
      const isEncrypted = setting.is_encrypted
      const value = setting.setting_value
      const displayValue = isEncrypted ? '••••••••••' : value
      
      console.log(`   - ${setting.setting_key}: ${displayValue} ${isEncrypted ? '(encrypted)' : ''}`)
    })

    // Convert settings array to object
    const settings = ncbaSettings.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value
      return acc
    }, {} as Record<string, string>)

    console.log('\n2️⃣ Checking required settings...')
    const requiredSettings = [
      'ncba_notification_username',
      'ncba_notification_password', 
      'ncba_notification_secret_key',
      'ncba_business_short_code'
    ]

    let missingSettings = []
    requiredSettings.forEach(setting => {
      if (!settings[setting]) {
        missingSettings.push(setting)
        console.log(`   ❌ Missing: ${setting}`)
      } else {
        console.log(`   ✅ Found: ${setting}`)
      }
    })

    if (missingSettings.length > 0) {
      console.log(`\n❌ Missing required settings: ${missingSettings.join(', ')}`)
      console.log('Please configure these settings in the NCBA Paybill Settings page.')
      return
    }

    console.log('\n3️⃣ Testing NCBA Authentication...')
    
    // Test the authentication URL
    const authUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    console.log(`   Auth URL: ${authUrl}`)
    
    // Create Basic Auth header
    const username = settings.ncba_notification_username
    const password = settings.ncba_notification_password
    const authHeader = Buffer.from(`${username}:${password}`).toString('base64')
    
    console.log(`   Username: ${username}`)
    console.log(`   Password: ${password ? 'SET' : 'NOT SET'}`)
    console.log(`   Auth Header: Basic ${authHeader.substring(0, 20)}...`)

    // Make the authentication request
    try {
      const authResponse = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      })

      console.log(`\n4️⃣ Authentication Response:`)
      console.log(`   Status: ${authResponse.status}`)
      console.log(`   Status Text: ${authResponse.statusText}`)
      console.log(`   OK: ${authResponse.ok}`)

      if (authResponse.ok) {
        const authData = await authResponse.json()
        console.log(`   ✅ Success! Access Token Length: ${authData.access_token ? authData.access_token.length : 0}`)
        console.log(`   Token Type: ${authData.token_type || 'N/A'}`)
        console.log(`   Expires In: ${authData.expires_in || 'N/A'} seconds`)
      } else {
        const errorText = await authResponse.text()
        console.log(`   ❌ Error Response: ${errorText}`)
        
        // Provide specific guidance based on status code
        if (authResponse.status === 401) {
          console.log('\n🔧 Troubleshooting 401 Unauthorized:')
          console.log('   - Check if NCBA username and password are correct')
          console.log('   - Verify credentials are not encrypted in database')
          console.log('   - Ensure credentials match NCBA sandbox environment')
        } else if (authResponse.status === 403) {
          console.log('\n🔧 Troubleshooting 403 Forbidden:')
          console.log('   - Check if NCBA account has proper permissions')
          console.log('   - Verify account is active and not suspended')
        } else if (authResponse.status >= 500) {
          console.log('\n🔧 Troubleshooting 5xx Server Error:')
          console.log('   - NCBA service may be temporarily down')
          console.log('   - Try again in a few minutes')
        }
      }

    } catch (fetchError) {
      console.error('❌ Network Error during authentication:', fetchError.message)
      console.log('\n🔧 Troubleshooting Network Error:')
      console.log('   - Check internet connection')
      console.log('   - Verify NCBA sandbox URL is accessible')
      console.log('   - Check if firewall is blocking the request')
    }

    console.log('\n5️⃣ Environment Check:')
    console.log(`   NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL || 'NOT SET'}`)
    console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`)

    console.log('\n✅ Debug complete!')
    
  } catch (error) {
    console.error('❌ Debug error:', error)
  }
}

debugNCBAAuthentication()
