/**
 * Script to verify API key hash
 * Run this to check if your API key hash matches what's in the database
 * 
 * Usage: node verify-api-key-hash.js "your-api-key-here"
 */

const crypto = require('crypto')

// Get API key from command line argument
const apiKey = process.argv[2]

if (!apiKey) {
  console.error('Usage: node verify-api-key-hash.js "your-api-key-here"')
  process.exit(1)
}

// Hash the API key using SHA-256 (same method as both endpoints)
const hashedApiKey = crypto.createHash('sha256').update(apiKey.trim(), 'utf8').digest('hex')

console.log('API Key Hash Verification')
console.log('='.repeat(50))
console.log('API Key (first 20 chars):', apiKey.substring(0, 20) + '...')
console.log('API Key Length:', apiKey.length)
console.log('Hashed API Key:', hashedApiKey)
console.log('')
console.log('Use this hash to check in your database:')
console.log('SELECT id, name, api_key_hash FROM partners WHERE api_key_hash = \'' + hashedApiKey + '\';')
console.log('')
console.log('If no results are returned, the API key hash in the database does not match.')

