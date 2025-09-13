// Test admin user directly with service role key
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testAdminDirect() {
  console.log('🔍 Testing admin user with service role key...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Missing environment variables')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? 'Set' : 'Missing')
    return
  }
  
  // Use service role key to bypass RLS
  const supabase = createClient(supabaseUrl, serviceKey)
  
  try {
    // Check if admin user exists
    console.log('📋 Checking admin user...')
    const { data: adminUser, error: adminError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', 'admin@mpesavault.com')
      .single()
    
    if (adminError) {
      console.error('❌ Error checking admin user:', adminError)
      return
    }
    
    if (adminUser) {
      console.log('✅ Admin user exists:', adminUser)
      
      // Test if we can create a session token
      console.log('🔐 Testing session creation...')
      const { data: sessionData, error: sessionError } = await supabase.auth.admin.generateLink({
        type: 'magiclink',
        email: adminUser.email
      })
      
      if (sessionError) {
        console.log('⚠️ Session creation failed (expected):', sessionError.message)
      } else {
        console.log('✅ Session creation successful')
      }
      
    } else {
      console.log('❌ Admin user not found')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testAdminDirect()
