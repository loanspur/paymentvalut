import { createClient } from '@supabase/supabase-js'

// Check if environment variables are loaded
const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Use environment variables only
const supabaseUrl = envUrl && envUrl !== 'your_supabase_project_url' && envUrl.startsWith('https://')
  ? envUrl
  : (() => {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL environment variable is required')
    })()

const supabaseAnonKey = envKey && envKey !== 'your_supabase_anon_key' && envKey.length > 100
  ? envKey
  : (() => {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable is required')
    })()

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


