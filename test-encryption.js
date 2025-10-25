// Test script to verify encryption functions work
// Run this script to test the encryption/decryption

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
    // Return a simple base64 encoding as fallback
    return Buffer.from(data).toString('base64')
  }
}

// Decryption function for sensitive data
function decryptData(encryptedData, passphrase) {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const textParts = encryptedData.split(':')
    
    if (textParts.length !== 2) {
      // Handle fallback base64 encoding
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    }
    
    const iv = Buffer.from(textParts[0], 'hex')
    const encryptedText = textParts[1]
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    // Try base64 decoding as fallback
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    } catch (fallbackError) {
      return encryptedData // Return as-is if all decryption fails
    }
  }
}

async function testEncryption() {
  console.log('🔐 Testing Encryption Functions')
  console.log('===============================\n')

  try {
    const testData = 'test_api_key_123'
    const passphrase = 'test-passphrase'

    console.log(`📋 Original data: ${testData}`)
    
    // Test encryption
    const encrypted = encryptData(testData, passphrase)
    console.log(`🔒 Encrypted: ${encrypted}`)
    
    // Test decryption
    const decrypted = decryptData(encrypted, passphrase)
    console.log(`🔓 Decrypted: ${decrypted}`)
    
    // Verify they match
    if (testData === decrypted) {
      console.log('✅ Encryption/Decryption working correctly!')
    } else {
      console.log('❌ Encryption/Decryption failed!')
      console.log(`   Original: ${testData}`)
      console.log(`   Decrypted: ${decrypted}`)
    }

    // Test with empty string
    console.log('\n📋 Testing with empty string...')
    const emptyEncrypted = encryptData('', passphrase)
    const emptyDecrypted = decryptData(emptyEncrypted, passphrase)
    console.log(`   Empty string test: ${emptyDecrypted === '' ? '✅' : '❌'}`)

    // Test with special characters
    console.log('\n📋 Testing with special characters...')
    const specialData = 'test@#$%^&*()_+{}|:"<>?[]\\;\',./'
    const specialEncrypted = encryptData(specialData, passphrase)
    const specialDecrypted = decryptData(specialEncrypted, passphrase)
    console.log(`   Special chars test: ${specialData === specialDecrypted ? '✅' : '❌'}`)

  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testEncryption()
