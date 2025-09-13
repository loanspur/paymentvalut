// Test session validation
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function testSessionValidation() {
  console.log('🔍 Testing session validation...')
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables')
    return
  }
  
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // First, create a test session
    console.log('📝 Creating test session...')
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('user_sessions')
      .insert({
        user_id: '621c2548-318f-46e8-a82c-d00784bcf199',
        session_token: 'test-session-token-123',
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()
    
    if (sessionError) {
      console.error('❌ Failed to create test session:', sessionError)
      return
    }
    
    console.log('✅ Test session created:', session.session_token)
    
    // Now test session validation
    console.log('🔐 Testing session validation...')
    const { data: validatedSession, error: validationError } = await supabaseAdmin
      .from('user_sessions')
      .select(`
        *,
        users (*)
      `)
      .eq('session_token', 'test-session-token-123')
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (validationError) {
      console.error('❌ Session validation failed:', validationError)
    } else if (validatedSession && validatedSession.users) {
      console.log('✅ Session validation successful:', {
        session_token: validatedSession.session_token,
        user: {
          id: validatedSession.users.id,
          email: validatedSession.users.email,
          role: validatedSession.users.role
        }
      })
    } else {
      console.log('❌ No valid session found')
    }
    
    // Clean up test session
    console.log('🧹 Cleaning up test session...')
    await supabaseAdmin
      .from('user_sessions')
      .delete()
      .eq('session_token', 'test-session-token-123')
    
    console.log('✅ Test session cleaned up')
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message)
  }
}

testSessionValidation()
