import { NextRequest, NextResponse } from 'next/server'

/**
 * Diagnostic endpoint to check if environment variables are available
 * This helps debug why environment variables work on localhost but not in production
 */
export async function GET(request: NextRequest) {
  // Check for SMS environment variables
  const hasSuperAdminSmsEnabled = !!process.env.SUPER_ADMIN_SMS_ENABLED
  const superAdminSmsEnabledValue = process.env.SUPER_ADMIN_SMS_ENABLED
  const hasSuperAdminSmsUsername = !!process.env.SUPER_ADMIN_SMS_USERNAME
  const superAdminSmsUsernameLength = process.env.SUPER_ADMIN_SMS_USERNAME?.length || 0
  const hasSuperAdminSmsApiKey = !!process.env.SUPER_ADMIN_SMS_API_KEY
  const superAdminSmsApiKeyLength = process.env.SUPER_ADMIN_SMS_API_KEY?.length || 0
  
  // Check other important env vars to verify env vars are loading at all
  const hasJwtSecret = !!process.env.JWT_SECRET
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const nodeEnv = process.env.NODE_ENV
  
  // Get all environment variable keys (without values for security)
  const allEnvKeys = Object.keys(process.env).sort()
  
  // Check if any SMS-related env vars exist (case variations)
  const smsEnvKeys = allEnvKeys.filter(key => 
    key.toLowerCase().includes('sms') || 
    key.toLowerCase().includes('airtouch') ||
    key.toLowerCase().includes('damza')
  )
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    node_env: nodeEnv,
    environment_loaded: true,
    
    // SMS-specific checks
    sms_credentials: {
      has_super_admin_sms_enabled: hasSuperAdminSmsEnabled,
      super_admin_sms_enabled_value: superAdminSmsEnabledValue,
      has_super_admin_sms_username: hasSuperAdminSmsUsername,
      super_admin_sms_username_length: superAdminSmsUsernameLength,
      has_super_admin_sms_api_key: hasSuperAdminSmsApiKey,
      super_admin_sms_api_key_length: superAdminSmsApiKeyLength,
      all_sms_related_keys: smsEnvKeys
    },
    
    // Verify other env vars are loading (to confirm env vars work at all)
    other_env_vars: {
      has_jwt_secret: hasJwtSecret,
      has_supabase_url: hasSupabaseUrl
    },
    
    // Total env vars count (to verify something is loaded)
    total_env_vars_count: allEnvKeys.length,
    
    // Diagnostic info
    diagnostic: {
      sms_vars_missing: !hasSuperAdminSmsEnabled || !hasSuperAdminSmsUsername || !hasSuperAdminSmsApiKey,
      env_vars_loading: hasJwtSecret || hasSupabaseUrl, // At least some env vars are loading
      possible_issues: []
    }
  })
}

