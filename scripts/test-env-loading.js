// Test if environment variables are being loaded by Next.js
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

console.log('🔍 Testing environment variable loading...')

// Check if variables are loaded
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Loaded ✅' : 'Missing ❌')
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseKey ? 'Loaded ✅' : 'Missing ❌')

if (supabaseUrl && supabaseKey) {
  console.log('✅ Environment variables are loaded correctly')
  
  // Test database connection
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  supabase
    .from('users')
    .select('id')
    .limit(1)
    .then(({ data, error }) => {
      if (error) {
        console.log('❌ Database connection failed:', error.message)
      } else {
        console.log('✅ Database connection successful')
        console.log('✅ Users table exists and is accessible')
      }
    })
    .catch(err => {
      console.log('❌ Database test failed:', err.message)
    })
} else {
  console.log('❌ Environment variables are not loaded')
  console.log('💡 You need to restart the Next.js development server')
}
