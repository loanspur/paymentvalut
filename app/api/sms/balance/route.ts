import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import crypto from 'crypto'
import { getCachedCredentials, setCachedCredentials } from '../../../../lib/sms-credentials-cache'
import { getCachedBalance, getCachedBalanceStrict, setCachedBalance } from '../../../../lib/sms-balance-cache'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Decryption function for sensitive data
async function decryptData(encryptedData: string, passphrase: string): Promise<string> {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    
    // Handle different encryption formats
    if (encryptedData.includes(':')) {
      // Format: iv:encrypted (standard format)
      const textParts = encryptedData.split(':')
      if (textParts.length === 2) {
        const iv = Buffer.from(textParts[0], 'hex')
        const encryptedText = textParts[1]
        const decipher = crypto.createDecipheriv(algorithm, key, iv)
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
        decrypted += decipher.final('utf8')
        return decrypted
      }
    } else if (encryptedData.length > 64) {
      // Format: first 32 chars are IV in hex, rest is encrypted (alternative format)
      const iv = Buffer.from(encryptedData.slice(0, 32), 'hex')
      const encrypted = encryptedData.slice(32)
      const decipher = crypto.createDecipheriv(algorithm, key, iv)
      let decrypted = decipher.update(encrypted, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    }
    
    // Fallback: try base64 decoding
    return Buffer.from(encryptedData, 'base64').toString('utf8')
  } catch (error) {
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    } catch (fallbackError) {
      return encryptedData
    }
  }
}

// GET - Fetch SMS balance from AirTouch
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify the JWT token
    const payload = await verifyJWTToken(token)
    
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    // Fast path: Check environment variables first (instant, no DB query)
    const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true'
    let username = ''
    let apiKey = ''
    let isEncrypted = false
    let cacheKey = 'default'

    if (superAdminSmsEnabled && process.env.SUPER_ADMIN_SMS_USERNAME && process.env.SUPER_ADMIN_SMS_API_KEY) {
      // Environment variables - fastest path (no DB query, no cache needed)
      username = process.env.SUPER_ADMIN_SMS_USERNAME
      apiKey = process.env.SUPER_ADMIN_SMS_API_KEY
      isEncrypted = false
    } else {
      // Database lookup - use cache to avoid repeated queries
      cacheKey = payload.role === 'super_admin' || payload.role === 'admin' ? 'admin' : `user_${payload.userId}`
      
      // Check cache first
      const cached = getCachedCredentials(cacheKey)
      if (cached) {
        username = cached.username
        apiKey = cached.apiKey
        isEncrypted = cached.isEncrypted
      } else {
        // Cache miss - fetch from database
        if (payload.role === 'super_admin' || payload.role === 'admin') {
          // Admin: try to get any enabled SMS settings
          const { data: systemSmsSettings } = await supabase
            .from('partner_sms_settings')
            .select('damza_username, damza_api_key, is_encrypted')
            .eq('sms_enabled', true)
            .limit(1)
            .single()

          if (systemSmsSettings) {
            username = systemSmsSettings.damza_username || ''
            apiKey = systemSmsSettings.damza_api_key || ''
            isEncrypted = systemSmsSettings.is_encrypted || false
          }
        } else {
          // Regular user: get partner SMS settings (optimize with single query that gets user + partner settings)
          const { data: userData } = await supabase
            .from('users')
            .select('partner_id')
            .eq('id', payload.userId)
            .single()

          if (userData?.partner_id) {
            const { data: partnerSmsSettings } = await supabase
              .from('partner_sms_settings')
              .select('damza_username, damza_api_key, is_encrypted')
              .eq('partner_id', userData.partner_id)
              .eq('sms_enabled', true)
              .single()

            if (partnerSmsSettings) {
              username = partnerSmsSettings.damza_username || ''
              apiKey = partnerSmsSettings.damza_api_key || ''
              isEncrypted = partnerSmsSettings.is_encrypted || false
            }
          }
        }

        // Final fallback: use any available enabled SMS settings
        if (!username || !apiKey) {
          const { data: anySmsSettings } = await supabase
            .from('partner_sms_settings')
            .select('damza_username, damza_api_key, is_encrypted')
            .eq('sms_enabled', true)
            .limit(1)
            .single()

          if (anySmsSettings) {
            username = anySmsSettings.damza_username || ''
            apiKey = anySmsSettings.damza_api_key || ''
            isEncrypted = anySmsSettings.is_encrypted || false
          }
        }

        // Cache credentials for future requests (5 minutes)
        if (username && apiKey) {
          setCachedCredentials(cacheKey, username, apiKey, isEncrypted)
        }
      }
    }

    if (!username || !apiKey) {
      // Enhanced error message for debugging
      const debugInfo: any = {
        error: 'SMS credentials not configured',
        user_role: payload.role,
        super_admin_sms_enabled: process.env.SUPER_ADMIN_SMS_ENABLED,
        has_env_username: !!process.env.SUPER_ADMIN_SMS_USERNAME,
        has_env_apikey: !!process.env.SUPER_ADMIN_SMS_API_KEY,
        env_username_length: process.env.SUPER_ADMIN_SMS_USERNAME?.length || 0,
        env_apikey_length: process.env.SUPER_ADMIN_SMS_API_KEY?.length || 0
      }
      
      // Only include sensitive info in development
      if (process.env.NODE_ENV === 'development') {
        debugInfo.env_username_preview = process.env.SUPER_ADMIN_SMS_USERNAME?.substring(0, 3) + '...'
      }
      
      // Log error for debugging (can be removed in production if needed)
      
      // Always return debug info in production for troubleshooting
      return NextResponse.json(
        { 
          success: false, 
          error: 'SMS credentials not configured. Please check environment variables or database settings.',
          debug: {
            user_role: debugInfo.user_role,
            super_admin_sms_enabled: debugInfo.super_admin_sms_enabled,
            has_env_username: debugInfo.has_env_username,
            has_env_apikey: debugInfo.has_env_apikey,
            env_username_length: debugInfo.env_username_length,
            env_apikey_length: debugInfo.env_apikey_length
          }
        },
        { status: 400 }
      )
    }

    // Decrypt credentials if encrypted
    let decryptedApiKey = apiKey
    let decryptedUsername = username

    if (isEncrypted) {
      const passphrase = process.env.JWT_SECRET || process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase'
      decryptedApiKey = await decryptData(apiKey, passphrase)
      decryptedUsername = await decryptData(username, passphrase)
    }

    // Check cached balance first (30 second cache)
    const cachedBalance = getCachedBalanceStrict()
    if (cachedBalance !== null) {
      return NextResponse.json({
        success: true,
        balance: cachedBalance,
        currency: 'KES',
        cached: true
      })
    }

    // Calculate MD5 hash of API key for password (as per AirTouch API requirement)
    const hashedPassword = crypto.createHash('md5').update(decryptedApiKey).digest('hex')

    // Call AirTouch balance API (reduced timeout to 5 seconds for faster failure)
    const balanceUrl = `https://client.airtouch.co.ke:9012/users/balance-api/?username=${encodeURIComponent(decryptedUsername)}&password=${encodeURIComponent(hashedPassword)}`

    let response: Response
    let responseText: string
    try {
      response = await fetch(balanceUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // Reduced from 10s to 5s
      })

      responseText = await response.text()
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        // Return cached balance if available, even if expired
        const expiredCache = getCachedBalance()
        if (expiredCache !== null) {
          return NextResponse.json({
            success: true,
            balance: expiredCache,
            currency: 'KES',
            cached: true,
            warning: 'Using cached balance due to API timeout'
          })
        }
        return NextResponse.json(
          { success: false, error: 'Request timeout - AirTouch API did not respond in time' },
          { status: 408 }
        )
      }
      throw fetchError
    }

        if (!response.ok) {
          // Log error for debugging
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch SMS balance from AirTouch: ${response.status} ${response.statusText}`,
          details: responseText.substring(0, 200),
          airtouch_status: response.status,
          airtouch_response: responseText.substring(0, 200)
        },
        { status: 500 } // Return 500 to distinguish from credential errors (400)
      )
    }

    let data: any
    try {
      data = JSON.parse(responseText)
        } catch (parseError) {
          // Log parse error for debugging
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON response from AirTouch API',
          details: responseText.substring(0, 200),
          raw_response: responseText.substring(0, 200)
        },
        { status: 500 }
      )
    }

    // Extract balance from response (optimized)
    let balance = 0
    if (data.Balance !== undefined) {
      balance = data.Balance
    } else if (data.balance !== undefined) {
      balance = data.balance
    } else if (data.BALANCE !== undefined) {
      balance = data.BALANCE
    } else {
      // Try to find any numeric field that might be the balance
      for (const key of Object.keys(data)) {
        const value = data[key]
        if (typeof value === 'number') {
          balance = value
          break
        }
      }
    }

    const finalBalance = Number(balance)
    
    // Cache the balance for 30 seconds
    setCachedBalance(finalBalance)

    return NextResponse.json({
      success: true,
      balance: finalBalance,
      currency: 'KES',
      cached: false
    })
      } catch (error: any) {
        // Log error for debugging
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to fetch SMS balance',
        details: process.env.NODE_ENV === 'production' ? 'Check server logs for details' : error.stack
      },
      { status: 500 }
    )
  }
}

