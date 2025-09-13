// Debug admin user creation
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const bcrypt = require('bcryptjs')

async function debugAdminCreation() {
  console.log('🔍 Debugging admin user creation...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables')
    return
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  try {
    // Check if admin user already exists
    console.log('📋 Checking if admin user already exists...')
    const { data: existingAdmin, error: checkError } = await supabase
      .from('users')
      .select('id, email, role, is_active')
      .eq('email', 'admin@mpesavault.com')
      .single()
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking admin user:', checkError.message)
      return
    }
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists:', existingAdmin)
      return
    }
    
    console.log('📝 Admin user does not exist, creating...')
    
    // Generate password hash
    const password = 'admin123'
    const passwordHash = await bcrypt.hash(password, 10)
    console.log('🔐 Password hash generated')
    
    // Try to create admin user
    const { data: adminUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: 'admin@mpesavault.com',
        password_hash: passwordHash,
        role: 'admin',
        is_active: true
      })
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Error creating admin user:', createError)
      console.error('Error details:', JSON.stringify(createError, null, 2))
    } else {
      console.log('✅ Admin user created successfully:', adminUser)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

debugAdminCreation()
