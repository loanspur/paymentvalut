import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      jwtSecret: !!process.env.JWT_SECRET,
      nodeEnv: process.env.NODE_ENV
    }

    // Check for SMS environment variables (without exposing values)
    const hasSuperAdminSmsEnabled = !!process.env.SUPER_ADMIN_SMS_ENABLED
    const superAdminSmsEnabledValue = process.env.SUPER_ADMIN_SMS_ENABLED
    const hasSuperAdminSmsUsername = !!process.env.SUPER_ADMIN_SMS_USERNAME
    const superAdminSmsUsernameLength = process.env.SUPER_ADMIN_SMS_USERNAME?.length || 0
    const hasSuperAdminSmsApiKey = !!process.env.SUPER_ADMIN_SMS_API_KEY
    const superAdminSmsApiKeyLength = process.env.SUPER_ADMIN_SMS_API_KEY?.length || 0
    
    // Get all environment variable keys (without values for security)
    const allEnvKeys = Object.keys(process.env).sort()
    
    // Check if any SMS-related env vars exist (case variations)
    const smsEnvKeys = allEnvKeys.filter(key => 
      key.toLowerCase().includes('sms') || 
      key.toLowerCase().includes('airtouch') ||
      key.toLowerCase().includes('damza')
    )

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      message: 'Health check passed',
      sms_credentials_check: {
        has_super_admin_sms_enabled: hasSuperAdminSmsEnabled,
        super_admin_sms_enabled_value: superAdminSmsEnabledValue,
        has_super_admin_sms_username: hasSuperAdminSmsUsername,
        super_admin_sms_username_length: superAdminSmsUsernameLength,
        has_super_admin_sms_api_key: hasSuperAdminSmsApiKey,
        super_admin_sms_api_key_length: superAdminSmsApiKeyLength,
        all_sms_related_keys: smsEnvKeys
      },
      diagnostic: {
        sms_vars_missing: !hasSuperAdminSmsEnabled || !hasSuperAdminSmsUsername || !hasSuperAdminSmsApiKey,
        env_vars_loading: envCheck.jwtSecret || envCheck.supabaseUrl,
        total_env_vars: allEnvKeys.length,
        note: 'Use this endpoint to check if environment variables are available in production'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

