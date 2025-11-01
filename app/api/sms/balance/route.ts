import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../lib/jwt-utils'
import crypto from 'crypto'

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

    // Get SMS credentials from system settings or environment variables
    let username = ''
    let apiKey = ''
    let isEncrypted = false
    let smsSettings = null

    // For super_admin/admin, check environment variables first
    if (payload.role === 'super_admin' || payload.role === 'admin') {
      const superAdminSmsEnabled = process.env.SUPER_ADMIN_SMS_ENABLED === 'true'
      
      if (superAdminSmsEnabled) {
        username = process.env.SUPER_ADMIN_SMS_USERNAME || ''
        apiKey = process.env.SUPER_ADMIN_SMS_API_KEY || ''
        isEncrypted = false // Environment variables are plain text
      } else {
        // Fallback to database settings - find any enabled SMS settings
        const { data: systemSmsSettings } = await supabase
          .from('partner_sms_settings')
          .select('damza_username, damza_api_key, is_encrypted')
          .eq('sms_enabled', true)
          .limit(1)
          .single()

        if (systemSmsSettings) {
          smsSettings = systemSmsSettings
          username = systemSmsSettings.damza_username || ''
          apiKey = systemSmsSettings.damza_api_key || ''
          isEncrypted = systemSmsSettings.is_encrypted || false
        }
      }
    } else {
      // For regular users, get partner SMS settings
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
          smsSettings = partnerSmsSettings
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

    if (!username || !apiKey) {
      return NextResponse.json(
        { success: false, error: 'SMS credentials not configured' },
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

    // Calculate MD5 hash of API key for password (as per AirTouch API requirement)
    const hashedPassword = crypto.createHash('md5').update(decryptedApiKey).digest('hex')

    // Call AirTouch balance API
    const balanceUrl = `https://client.airtouch.co.ke:9012/users/balance-api/?username=${encodeURIComponent(decryptedUsername)}&password=${encodeURIComponent(hashedPassword)}`

    let response: Response
    let responseText: string
    try {
      response = await fetch(balanceUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      })

      responseText = await response.text()
    } catch (fetchError: any) {
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { success: false, error: 'Request timeout - AirTouch API did not respond in time' },
          { status: 408 }
        )
      }
      throw fetchError
    }

    if (!response.ok) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Failed to fetch SMS balance from AirTouch: ${response.status} ${response.statusText}`,
          details: responseText.substring(0, 200)
        },
        { status: response.status }
      )
    }

    let data: any
    try {
      data = JSON.parse(responseText)
    } catch (parseError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid JSON response from AirTouch API',
          details: responseText.substring(0, 200)
        },
        { status: 500 }
      )
    }

    // Extract balance from response
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

    return NextResponse.json({
      success: true,
      balance: Number(balance),
      currency: 'KES'
    })
  } catch (error: any) {
    console.error('SMS balance API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch SMS balance' },
      { status: 500 }
    )
  }
}

