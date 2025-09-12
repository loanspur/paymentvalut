import { createClient } from '@supabase/supabase-js'

// Check if environment variables are loaded
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Use actual values from your .env.local file
const supabaseUrl = envUrl && envUrl !== 'your_supabase_project_url' && envUrl.startsWith('https://')
  ? envUrl
  : 'https://mapgmmiobityxaaevomp.supabase.co'

const supabaseAnonKey = envKey && envKey !== 'your_supabase_anon_key' && envKey.length > 100
  ? envKey
  : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0NzQ5NzQsImV4cCI6MjA1MjA1MDk3NH0.placeholder'

// Create a single Supabase client instance with better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'X-Client-Info': 'mpesa-b2c-app'
    }
  }
})

// Export the configuration for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  key: supabaseAnonKey ? 'present' : 'missing',
  envUrl,
  envKey: envKey ? 'present' : 'missing'
}


