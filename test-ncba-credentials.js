// Test NCBA credentials directly
// This will help verify if the credentials are correct

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testNCBACredentials() {
  try {
    console.log('🧪 Testing NCBA Credentials...\n')

    // 1. Fetch NCBA settings
    const { data: ncbaSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value, is_encrypted')
      .in('setting_key', [
        'ncba_notification_username', 
        'ncba_notification_password',
        'ncba_notification_secret_key'
      ])

    if (settingsError) {
      console.error('❌ Error fetching NCBA settings:', settingsError)
      return
    }

    console.log('📊 NCBA Settings:')
    ncbaSettings.forEach(setting => {
      const isEncrypted = setting.is_encrypted
      const value = setting.setting_value
      const displayValue = isEncrypted ? '••••••••••' : value
      
      console.log(`   - ${setting.setting_key}: ${displayValue} ${isEncrypted ? '(encrypted)' : '(plain)'}`)
    })

    // 2. Decrypt credentials
    console.log('\n🔓 Decrypting credentials...')
    const settings = {}
    
    for (const setting of ncbaSettings) {
      let value = setting.setting_value
      
      if (setting.is_encrypted && value) {
        try {
          const crypto = require('crypto')
          const passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase'
          
          // Try multiple decryption methods
          let decrypted = null
          
          // Method 1: Current format (iv + encrypted data)
          if (value.length > 32 && value.slice(32).length > 0) {
            try {
              const key = crypto.scryptSync(passphrase, 'salt', 32)
              const iv = Buffer.from(value.slice(0, 32), 'hex')
              const encrypted = value.slice(32)
              const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
              let result = decipher.update(encrypted, 'hex', 'utf8')
              result += decipher.final('utf8')
              decrypted = result
              console.log(`   ✅ ${setting.setting_key}: Method 1 (iv+encrypted) - SUCCESS`)
            } catch (error) {
              console.log(`   ❌ ${setting.setting_key}: Method 1 failed - ${error.message}`)
            }
          }
          
          // Method 2: Format with colon separator (iv:encrypted)
          if (!decrypted && value.includes(':')) {
            try {
              const parts = value.split(':')
              if (parts.length === 2) {
                const key = crypto.scryptSync(passphrase, 'salt', 32)
                const iv = Buffer.from(parts[0], 'hex')
                const encrypted = parts[1]
                const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
                let result = decipher.update(encrypted, 'hex', 'utf8')
                result += decipher.final('utf8')
                decrypted = result
                console.log(`   ✅ ${setting.setting_key}: Method 2 (iv:encrypted) - SUCCESS`)
              }
            } catch (error) {
              console.log(`   ❌ ${setting.setting_key}: Method 2 failed - ${error.message}`)
            }
          }
          
          // Method 3: Simple base64 decode
          if (!decrypted) {
            try {
              const decoded = Buffer.from(value, 'base64').toString('utf8')
              if (/^[a-zA-Z0-9@._-]+$/.test(decoded)) {
                decrypted = decoded
                console.log(`   ✅ ${setting.setting_key}: Method 3 (base64) - SUCCESS`)
              }
            } catch (error) {
              console.log(`   ❌ ${setting.setting_key}: Method 3 failed - ${error.message}`)
            }
          }
          
          if (!decrypted) {
            console.log(`   ❌ ${setting.setting_key}: All decryption methods failed`)
            decrypted = value // Use original
          }
          
          value = decrypted
        } catch (error) {
          console.error(`   ❌ Failed to decrypt ${setting.setting_key}:`, error)
        }
      }
      
      settings[setting.setting_key] = value
    }

    // 3. Test NCBA authentication
    console.log('\n🔐 Testing NCBA Authentication...')
    
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

      console.log(`\n📡 Authentication Result:`)
      console.log(`   Status: ${authResponse.status}`)
      console.log(`   Status Text: ${authResponse.statusText}`)
      console.log(`   OK: ${authResponse.ok}`)

      if (authResponse.ok) {
        const authData = await authResponse.json()
        console.log(`   ✅ SUCCESS! Access Token Length: ${authData.access_token ? authData.access_token.length : 0}`)
        console.log(`   Token Type: ${authData.token_type || 'N/A'}`)
        console.log(`   Expires In: ${authData.expires_in || 'N/A'} seconds`)
        
        console.log('\n🎉 NCBA Authentication is working!')
        console.log('   The wallet top-up STK Push should work properly.')
      } else {
        const errorText = await authResponse.text()
        console.log(`   ❌ Authentication Failed: ${errorText}`)
        
        if (authResponse.status === 400) {
          console.log('\n🔧 Troubleshooting 400 Bad Request:')
          console.log('   - Check if NCBA username and password format is correct')
          console.log('   - Verify credentials are properly decrypted')
          console.log('   - Ensure credentials match NCBA sandbox environment')
          console.log('   - Check if Basic Auth header is properly formatted')
        } else if (authResponse.status === 401) {
          console.log('\n🔧 Troubleshooting 401 Unauthorized:')
          console.log('   - Check if NCBA username and password are correct')
          console.log('   - Verify credentials are not corrupted during decryption')
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

testNCBACredentials()
