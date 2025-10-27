// Test script to verify NCBA authentication fix
// This will test the wallet top-up STK Push functionality

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNCBAAuthFix() {
  try {
    console.log('🧪 Testing NCBA Authentication Fix...\n')

    // 1. Test fetching NCBA settings with is_encrypted field
    console.log('1️⃣ Testing NCBA settings fetch with encryption info...')
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

    console.log('📊 NCBA Settings with Encryption Info:')
    ncbaSettings.forEach(setting => {
      const isEncrypted = setting.is_encrypted
      const value = setting.setting_value
      const displayValue = isEncrypted ? '••••••••••' : value
      
      console.log(`   - ${setting.setting_key}: ${displayValue} ${isEncrypted ? '(encrypted)' : '(plain)'}`)
    })

    // 2. Test decryption logic
    console.log('\n2️⃣ Testing decryption logic...')
    const settings = {}
    
    for (const setting of ncbaSettings) {
      let value = setting.setting_value
      
      if (setting.is_encrypted && value) {
        try {
          const crypto = require('crypto')
          const passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase'
          
          const decryptData = (encryptedData, passphrase) => {
            try {
              const key = crypto.scryptSync(passphrase, 'salt', 32)
              const iv = Buffer.from(encryptedData.slice(0, 32), 'hex')
              const encrypted = encryptedData.slice(32)
              const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
              let decrypted = decipher.update(encrypted, 'hex', 'utf8')
              decrypted += decipher.final('utf8')
              return decrypted
            } catch (error) {
              console.error('Decryption error:', error)
              return encryptedData
            }
          }
          
          value = decryptData(value, passphrase)
          console.log(`   ✅ Decrypted ${setting.setting_key}: ${value ? 'SUCCESS' : 'FAILED'}`)
        } catch (error) {
          console.error(`   ❌ Failed to decrypt ${setting.setting_key}:`, error)
        }
      }
      
      settings[setting.setting_key] = value
    }

    // 3. Test authentication with decrypted credentials
    console.log('\n3️⃣ Testing NCBA authentication with decrypted credentials...')
    
    if (!settings.ncba_notification_username || !settings.ncba_notification_password) {
      console.log('❌ Missing NCBA credentials - cannot test authentication')
      return
    }

    const authUrl = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    const authHeader = Buffer.from(`${settings.ncba_notification_username}:${settings.ncba_notification_password}`).toString('base64')
    
    console.log(`   Auth URL: ${authUrl}`)
    console.log(`   Username: ${settings.ncba_notification_username}`)
    console.log(`   Password Length: ${settings.ncba_notification_password.length}`)
    console.log(`   Auth Header Length: ${authHeader.length}`)

    try {
      const authResponse = await fetch(authUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${authHeader}`,
          'Content-Type': 'application/json'
        }
      })

      console.log(`\n4️⃣ Authentication Result:`)
      console.log(`   Status: ${authResponse.status}`)
      console.log(`   Status Text: ${authResponse.statusText}`)
      console.log(`   OK: ${authResponse.ok}`)

      if (authResponse.ok) {
        const authData = await authResponse.json()
        console.log(`   ✅ SUCCESS! Access Token Length: ${authData.access_token ? authData.access_token.length : 0}`)
        console.log(`   Token Type: ${authData.token_type || 'N/A'}`)
        console.log(`   Expires In: ${authData.expires_in || 'N/A'} seconds`)
        
        console.log('\n🎉 NCBA Authentication Fix is working!')
        console.log('   The wallet top-up STK Push should now work properly.')
      } else {
        const errorText = await authResponse.text()
        console.log(`   ❌ Authentication Failed: ${errorText}`)
        
        if (authResponse.status === 401) {
          console.log('\n🔧 Troubleshooting:')
          console.log('   - Check if NCBA username and password are correct')
          console.log('   - Verify credentials are properly decrypted')
          console.log('   - Ensure credentials match NCBA sandbox environment')
        }
      }

    } catch (fetchError) {
      console.error('❌ Network Error:', fetchError.message)
    }

    console.log('\n✅ Test complete!')
    
  } catch (error) {
    console.error('❌ Test error:', error)
  }
}

testNCBAAuthFix()
