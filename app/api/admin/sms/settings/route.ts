import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../lib/jwt-utils'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Encryption function for sensitive data
function encryptData(data: string, passphrase: string): string {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(algorithm, key, iv)
    let encrypted = cipher.update(data, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    return iv.toString('hex') + ':' + encrypted
  } catch (error) {
    console.error('Encryption error:', error)
    // Return a simple base64 encoding as fallback
    return Buffer.from(data).toString('base64')
  }
}

// Decryption function for sensitive data
function decryptData(encryptedData: string, passphrase: string): string {
  try {
    const algorithm = 'aes-256-cbc'
    const key = crypto.scryptSync(passphrase, 'salt', 32)
    const textParts = encryptedData.split(':')
    
    if (textParts.length !== 2) {
      // Handle fallback base64 encoding
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    }
    
    const iv = Buffer.from(textParts[0], 'hex')
    const encryptedText = textParts[1]
    const decipher = crypto.createDecipheriv(algorithm, key, iv)
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    // Try base64 decoding as fallback
    try {
      return Buffer.from(encryptedData, 'base64').toString('utf8')
    } catch (fallbackError) {
      return encryptedData // Return as-is if all decryption fails
    }
  }
}

// GET - Fetch all partner SMS settings
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

    // Check if user is admin
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    // Try to get SMS settings directly - if table doesn't exist, it will error
    const { data: smsSettings, error } = await supabase
      .from('partner_sms_settings')
      .select(`
        *,
        partners (
          id,
          name,
          short_code,
          is_active
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching SMS settings:', error)
      
      // Check if it's a table doesn't exist error
      if (error.message && error.message.includes('relation "partner_sms_settings" does not exist')) {
        return NextResponse.json({
          success: true,
          data: [],
          message: 'SMS tables not initialized. Please run the database migration.'
        })
      }
      
      return NextResponse.json(
        { success: false, error: 'Failed to fetch SMS settings' },
        { status: 500 }
      )
    }

    // Decrypt sensitive data for display
    const decryptedSettings = smsSettings?.map(setting => ({
      ...setting,
      damza_api_key: setting.damza_api_key ? '***encrypted***' : null,
      damza_username: setting.damza_username ? '***encrypted***' : null,
      damza_password: setting.damza_password ? '***encrypted***' : null
    })) || []

    return NextResponse.json({
      success: true,
      data: decryptedSettings
    })

  } catch (error) {
    console.error('SMS Settings GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create or update partner SMS settings
export async function POST(request: NextRequest) {
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

    // Check if user is admin
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const {
      partner_id,
      damza_api_key,
      damza_sender_id,
      damza_username,
      damza_password,
      sms_enabled,
      low_balance_threshold,
      notification_phone_numbers,
      sms_charge_per_message
    } = await request.json()

    // Validate required fields
    if (!partner_id || !damza_sender_id) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: partner_id, damza_sender_id' },
        { status: 400 }
      )
    }

    // We'll check if tables exist by trying to query them directly

    // Verify partner exists
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('id, name')
      .eq('id', partner_id)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found' },
        { status: 404 }
      )
    }

    // Encrypt sensitive data only if provided
    const passphrase = process.env.JWT_SECRET || 'default-passphrase'
    let encryptedApiKey, encryptedUsername, encryptedPassword
    
    try {
      // Only encrypt if the field is provided and not empty
      if (damza_api_key && damza_api_key.trim()) {
        encryptedApiKey = encryptData(damza_api_key, passphrase)
      }
      if (damza_username && damza_username.trim()) {
        encryptedUsername = encryptData(damza_username, passphrase)
      }
      if (damza_password && damza_password.trim()) {
        encryptedPassword = encryptData(damza_password, passphrase)
      }
    } catch (encryptError) {
      console.error('Encryption error:', encryptError)
      return NextResponse.json(
        { success: false, error: 'Failed to encrypt sensitive data' },
        { status: 500 }
      )
    }

    // Check if SMS settings already exist for this partner
    const { data: existingSettings, error: existingError } = await supabase
      .from('partner_sms_settings')
      .select('id')
      .eq('partner_id', partner_id)
      .maybeSingle() // Use maybeSingle() instead of single() to handle no rows gracefully

    // If there's an error and it's not "not found", handle it
    if (existingError) {
      console.error('Error checking existing SMS settings:', existingError)
      return NextResponse.json(
        { success: false, error: 'Failed to check existing SMS settings' },
        { status: 500 }
      )
    }

    let result
    if (existingSettings) {
      // Update existing settings - only update fields that are provided
      const updateData: any = {
        damza_sender_id,
        sms_enabled: sms_enabled ?? true,
        low_balance_threshold: low_balance_threshold ?? 1000,
        notification_phone_numbers: notification_phone_numbers || [],
        sms_charge_per_message: sms_charge_per_message ?? 0.50,
        updated_at: new Date().toISOString()
      }

      // Only update sensitive fields if they are provided
      if (encryptedApiKey) {
        updateData.damza_api_key = encryptedApiKey
      }
      if (encryptedUsername) {
        updateData.damza_username = encryptedUsername
      }
      if (encryptedPassword) {
        updateData.damza_password = encryptedPassword
      }

      const { data, error } = await supabase
        .from('partner_sms_settings')
        .update(updateData)
        .eq('partner_id', partner_id)
        .select()
        .single()

      result = data
      if (error) {
        console.error('Error updating SMS settings:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to update SMS settings' },
          { status: 500 }
        )
      }
    } else {
      // Create new settings - all fields are required for new settings
      if (!encryptedApiKey || !encryptedUsername || !encryptedPassword) {
        return NextResponse.json(
          { success: false, error: 'API Key, Username, and Password are required for new SMS settings' },
          { status: 400 }
        )
      }

      const { data, error } = await supabase
        .from('partner_sms_settings')
        .insert({
          partner_id,
          damza_api_key: encryptedApiKey,
          damza_sender_id,
          damza_username: encryptedUsername,
          damza_password: encryptedPassword,
          sms_enabled: sms_enabled ?? true,
          low_balance_threshold: low_balance_threshold ?? 1000,
          notification_phone_numbers: notification_phone_numbers || [],
          sms_charge_per_message: sms_charge_per_message ?? 0.50
        })
        .select()
        .single()

      result = data
      if (error) {
        console.error('Error creating SMS settings:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to create SMS settings' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: existingSettings ? 'SMS settings updated successfully' : 'SMS settings created successfully',
      data: {
        ...result,
        damza_api_key: '***encrypted***',
        damza_username: '***encrypted***',
        damza_password: '***encrypted***'
      }
    })

  } catch (error) {
    console.error('SMS Settings POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete partner SMS settings
export async function DELETE(request: NextRequest) {
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

    // Check if user is admin
    if (payload.role !== 'super_admin' && payload.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Admin privileges required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Partner ID is required' },
        { status: 400 }
      )
    }

    // Delete SMS settings
    const { error } = await supabase
      .from('partner_sms_settings')
      .delete()
      .eq('partner_id', partnerId)

    if (error) {
      console.error('Error deleting SMS settings:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete SMS settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'SMS settings deleted successfully'
    })

  } catch (error) {
    console.error('SMS Settings DELETE Error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
