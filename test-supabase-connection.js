// Test Supabase connection
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env' })

console.log('🔍 Testing Supabase connection...')
console.log('')

// Check environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('📊 Environment Variables:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Not set')
console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅ Set' : '❌ Not set')
console.log('')

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Missing Supabase credentials!')
  console.log('')
  console.log('🔧 To fix this, you need to:')
  console.log('1. Create a .env.local file in your project root')
  console.log('2. Add your Supabase credentials:')
  console.log('')
  console.log('NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
  console.log('SUPABASE_SERVICE_ROLE_KEY=your-service-role-key')
  console.log('')
  console.log('3. Or set them as environment variables in your terminal')
  console.log('')
  console.log('📝 You can find these credentials in your Supabase project settings:')
  console.log('   - Go to your Supabase dashboard')
  console.log('   - Select your project')
  console.log('   - Go to Settings → API')
  console.log('   - Copy the Project URL and service_role key')
  process.exit(1)
}

// Test connection
const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('🔄 Testing Supabase connection...')
    
    // Test with a simple query
    const { data, error } = await supabase
      .from('partners')
      .select('id, name')
      .limit(1)

    if (error) {
      console.error('❌ Supabase connection failed:', error.message)
      return
    }

    console.log('✅ Supabase connection successful!')
    console.log('📊 Sample data:', data)
    
  } catch (error) {
    console.error('❌ Error testing connection:', error.message)
  }
}

testConnection()
