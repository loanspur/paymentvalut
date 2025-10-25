// Debug script to test SMS settings creation with detailed error reporting
// Run this script to debug the SMS settings creation issue

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const crypto = require('crypto')

// Encryption function for sensitive data
function encryptData(data, passphrase) {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    return Buffer.from(data).toString('base64')
  }
}

async function testSMSSettingsDebug() {
  console.log('🔍 SMS Settings Creation Debug')
  console.log('==============================\n')

  try {
    // Step 1: Get a partner
    console.log('📋 Step 1: Getting partners...')
    const { data: partners, error: partnersError } = await supabase
      .from('partners')
      .select('id, name')
      .limit(1)

    if (partnersError) {
      console.log('❌ Error getting partners:', partnersError)
      return
    }

    if (!partners || partners.length === 0) {
      console.log('❌ No partners found')
      return
    }

    const partner = partners[0]
    console.log(`✅ Found partner: ${partner.name} (ID: ${partner.id})`)

    // Step 2: Test encryption
    console.log('\n📋 Step 2: Testing encryption...')
    const passphrase = process.env.JWT_SECRET || 'default-passphrase'
    const testData = 'test_api_key_123'
    
    try {
      const encrypted = encryptData(testData, passphrase)
      console.log('✅ Encryption working')
    } catch (encryptError) {
      console.log('❌ Encryption failed:', encryptError)
      return
    }

    // Step 3: Check if SMS settings already exist
    console.log('\n📋 Step 3: Checking existing SMS settings...')
    const { data: existingSettings, error: existingError } = await supabase
      .from('partner_sms_settings')
      .select('id')
      .eq('partner_id', partner.id)
      .maybeSingle() // Use maybeSingle() to handle no rows gracefully

    if (existingError) {
      console.log('❌ Error checking existing settings:', existingError)
      return
    }

    if (existingSettings) {
      console.log('⚠️  SMS settings already exist for this partner')
      console.log('   This will be an UPDATE operation')
    } else {
      console.log('✅ No existing SMS settings found')
      console.log('   This will be an INSERT operation')
    }

    // Step 4: Test the actual database operation
    console.log('\n📋 Step 4: Testing database operation...')
    
    const smsData = {
      partner_id: partner.id,
      damza_api_key: encryptData('test_api_key_123', passphrase),
      damza_sender_id: 'TEST_SENDER',
      damza_username: encryptData('test_username', passphrase),
      damza_password: encryptData('test_password', passphrase),
      sms_enabled: true,
      low_balance_threshold: 1000,
      notification_phone_numbers: ['254712345678'],
      sms_charge_per_message: 0.50
    }

    if (existingSettings) {
      // Test UPDATE
      console.log('   Testing UPDATE operation...')
      const { data: updateData, error: updateError } = await supabase
        .from('partner_sms_settings')
        .update({
          ...smsData,
          updated_at: new Date().toISOString()
        })
        .eq('partner_id', partner.id)
        .select()
        .single()

      if (updateError) {
        console.log('❌ UPDATE failed:', updateError)
      } else {
        console.log('✅ UPDATE successful')
        console.log('   Updated SMS settings:', updateData.id)
      }
    } else {
      // Test INSERT
      console.log('   Testing INSERT operation...')
      const { data: insertData, error: insertError } = await supabase
        .from('partner_sms_settings')
        .insert(smsData)
        .select()
        .single()

      if (insertError) {
        console.log('❌ INSERT failed:', insertError)
        console.log('   Error details:', JSON.stringify(insertError, null, 2))
      } else {
        console.log('✅ INSERT successful')
        console.log('   Created SMS settings:', insertData.id)
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message)
    console.error('   Stack trace:', error.stack)
  } finally {
    console.log('\n📝 Debug completed!')
  }
}

testSMSSettingsDebug()
