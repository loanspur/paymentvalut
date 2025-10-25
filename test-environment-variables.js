// Test script to check if environment variables are properly loaded
// Run this script to verify environment configuration

require('dotenv').config()

console.log('🔧 Environment Variables Test')
console.log('==============================\n')

// Check critical environment variables
const requiredVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'NEXT_PUBLIC_APP_URL'
]

console.log('📋 Checking required environment variables:')
console.log('--------------------------------------------')

let allVarsPresent = true

requiredVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    // Mask sensitive values
    if (varName.includes('SECRET') || varName.includes('KEY')) {
      console.log(`✅ ${varName}: ${value.substring(0, 10)}...`)
    } else {
      console.log(`✅ ${varName}: ${value}`)
    }
  } else {
    console.log(`❌ ${varName}: NOT SET`)
    allVarsPresent = false
  }
})

console.log('\n📋 Checking optional environment variables:')
console.log('--------------------------------------------')

const optionalVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL'
]

optionalVars.forEach(varName => {
  const value = process.env[varName]
  if (value) {
    console.log(`✅ ${varName}: ${value}`)
  } else {
    console.log(`⚠️  ${varName}: NOT SET (optional)`)
  }
})

console.log('\n📋 Environment Summary:')
console.log('------------------------')
if (allVarsPresent) {
  console.log('✅ All required environment variables are set')
  console.log('✅ Environment configuration looks good')
} else {
  console.log('❌ Some required environment variables are missing')
  console.log('❌ Please check your .env file')
}

console.log('\n📝 Next Steps:')
if (allVarsPresent) {
  console.log('1. Environment variables are properly configured')
  console.log('2. The 500 errors might be due to other issues')
  console.log('3. Check browser console for more specific error details')
  console.log('4. Verify that the development server is running')
} else {
  console.log('1. Fix missing environment variables in .env file')
  console.log('2. Restart the development server: npm run dev')
  console.log('3. Test the API endpoints again')
}
