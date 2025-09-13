// Debug login process step by step
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const bcrypt = require('bcryptjs')

async function debugLoginDetailed() {
  console.log('🔍 Debugging login process step by step...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // Step 1: Check if user exists
    console.log('📋 Step 1: Checking if user exists...')
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@mpesavault.com')
      .eq('is_active', true)
      .single()
    
    if (userError) {
      console.error('❌ User lookup error:', userError)
      return
    }
    
    if (!user) {
      console.error('❌ User not found')
      return
    }
    
    console.log('✅ User found:', {
      id: user.id,
      email: user.email,
      role: user.role,
      is_active: user.is_active,
      password_hash: user.password_hash ? 'Set' : 'Missing'
    })
    
    // Step 2: Test password verification
    console.log('\n🔐 Step 2: Testing password verification...')
    const testPassword = 'admin123'
    const isValidPassword = await bcrypt.compare(testPassword, user.password_hash)
    console.log('Password verification result:', isValidPassword)
    
    if (!isValidPassword) {
      console.log('❌ Password verification failed')
      
      // Let's generate a new hash for admin123
      console.log('🔧 Generating new hash for admin123...')
      const newHash = await bcrypt.hash('admin123', 10)
      console.log('New hash:', newHash)
      
      // Update the user with the new hash
      console.log('🔄 Updating user with new hash...')
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ password_hash: newHash })
        .eq('id', user.id)
      
      if (updateError) {
        console.error('❌ Failed to update password hash:', updateError)
      } else {
        console.log('✅ Password hash updated successfully')
        
        // Test password verification again
        const isValidPassword2 = await bcrypt.compare(testPassword, newHash)
        console.log('Password verification after update:', isValidPassword2)
      }
    } else {
      console.log('✅ Password verification successful')
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

debugLoginDetailed()
