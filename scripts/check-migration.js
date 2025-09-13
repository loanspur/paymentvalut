// Check if user management migration was successful
const { createClient } = require('@supabase/supabase-js')

async function checkMigration() {
  console.log('🔍 Checking user management migration status...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables')
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Check if users table exists
    console.log('📋 Checking users table...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, role')
      .limit(1)
    
    if (usersError) {
      console.error('❌ Users table error:', usersError.message)
      return
    }
    
    console.log('✅ Users table exists')
    
    // Check if admin user exists
    console.log('👤 Checking admin user...')
    const { data: admin, error: adminError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', 'admin@mpesavault.com')
      .single()
    
    if (adminError) {
      console.error('❌ Admin user error:', adminError.message)
      console.log('💡 Run the manual migration script to create admin user')
      return
    }
    
    console.log('✅ Admin user exists:', {
      email: admin.email,
      role: admin.role,
      is_active: admin.is_active
    })
    
    // Check other tables
    console.log('📊 Checking other tables...')
    
    const tables = ['user_sessions', 'partner_shortcodes', 'audit_logs']
    for (const table of tables) {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1)
      
      if (error) {
        console.error(`❌ ${table} table error:`, error.message)
      } else {
        console.log(`✅ ${table} table exists`)
      }
    }
    
    console.log('\n🎉 Migration check completed!')
    console.log('📝 Next steps:')
    console.log('1. Go to http://localhost:3000/setup')
    console.log('2. Login with admin@mpesavault.com / admin123')
    console.log('3. Change the default password')
    
  } catch (error) {
    console.error('❌ Migration check failed:', error.message)
  }
}

checkMigration()
