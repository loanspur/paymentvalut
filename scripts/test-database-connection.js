// Test database connection and check what tables exist
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testDatabase() {
  console.log('🔍 Testing database connection...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Missing')
  console.log('Supabase Key:', supabaseKey ? 'Set' : 'Missing')
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables')
    console.log('Please check your .env.local file')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Test basic connection
    console.log('📡 Testing basic connection...')
    const { data: testData, error: testError } = await supabase
      .from('partners')
      .select('id')
      .limit(1)
    
    if (testError) {
      console.error('❌ Database connection failed:', testError.message)
      return
    }
    
    console.log('✅ Database connection successful')
    
    // Check if users table exists
    console.log('📋 Checking users table...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .limit(1)
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message)
      console.log('💡 This means the users table does not exist')
      console.log('📝 You need to run the SQL script in Supabase Dashboard')
    } else {
      console.log('✅ Users table exists')
    }
    
    // List all tables
    console.log('📊 Checking all tables...')
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_tables')
      .catch(async () => {
        // Fallback method
        const { data, error } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
        return { data, error }
      })
    
    if (tablesError) {
      console.log('📋 Available tables (from partners query):')
      console.log('- partners (exists)')
    } else {
      console.log('📋 Available tables:', tables?.map(t => t.table_name).join(', '))
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message)
  }
}

testDatabase()
