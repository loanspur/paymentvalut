import { createClient } from '@supabase/supabase-js'
import { jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  department?: string
  role: string
  is_active: boolean
  email_verified: boolean
  last_activity_at?: string
  last_password_change?: string
  password_change_required?: boolean
  two_factor_enabled?: boolean
  profile_picture_url?: string
  notes?: string
  partner_id?: string
  created_at: string
  updated_at: string
}

export interface CreateUserData {
  email: string
  password: string
  first_name?: string
  last_name?: string
  phone_number?: string
  department?: string
  role: string
  partner_id?: string
  notes?: string
}

export interface UpdateUserData {
  email?: string
  password?: string
  first_name?: string
  last_name?: string
  phone_number?: string
  department?: string
  role?: string
  is_active?: boolean
  email_verified?: boolean
  notes?: string
}

export interface AuthContext {
  userId: string
  email: string
  role: string
  isActive: boolean
}

export class UserService {
  /**
   * Verify JWT token and return user context
   */
  static async verifyToken(token: string): Promise<AuthContext | null> {
    try {
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload } = await jwtVerify(token, secret)
      
      if (!payload || !payload.userId) {
        return null
      }

      return {
        userId: payload.userId as string,
        email: payload.email as string,
        role: payload.role as string,
        isActive: payload.isActive as boolean
      }
    } catch (error) {
      console.error('Token verification error:', error)
      return null
    }
  }

  /**
   * Get current user from database
   */
  static async getCurrentUser(userId: string): Promise<User | null> {
    try {
      // Get user info with all available columns
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      if (error || !user) {
        console.error('User lookup error:', error)
        return null
      }

      // Return user with actual data from database
      return {
        ...user,
        // Only set defaults for fields that are actually null/undefined
        email_verified: user.email_verified ?? false,
        last_activity_at: user.last_activity_at ?? null,
        last_password_change: user.last_password_change ?? null,
        password_change_required: user.password_change_required ?? false,
        two_factor_enabled: user.two_factor_enabled ?? false,
        profile_picture_url: user.profile_picture_url ?? null
      }
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  /**
   * Check if user has admin permissions
   */
  static hasAdminPermission(role: string): boolean {
    return ['super_admin', 'admin'].includes(role)
  }

  /**
   * Update last activity time for a user
   */
  static async updateLastActivity(userId: string): Promise<void> {
    try {
      await supabase
        .from('users')
        .update({ 
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
    } catch (error) {
      console.error('Update last activity error:', error)
      // Don't throw error as this is not critical
    }
  }

  /**
   * Get all users (admin only)
   */
  static async getAllUsers(): Promise<User[]> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get all users error:', error)
        return []
      }

      // Return users with actual data from database
      return (users || []).map(user => ({
        ...user,
        // Only set defaults for fields that are actually null/undefined
        email_verified: user.email_verified ?? false,
        last_activity_at: user.last_activity_at ?? null,
        last_password_change: user.last_password_change ?? null,
        password_change_required: user.password_change_required ?? false,
        two_factor_enabled: user.two_factor_enabled ?? false,
        profile_picture_url: user.profile_picture_url ?? null
      }))
    } catch (error) {
      console.error('Get all users error:', error)
      return []
    }
  }

  /**
   * Get users by partner ID
   */
  static async getUsersByPartner(partnerId: string): Promise<User[]> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('partner_id', partnerId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get users by partner error:', error)
        return []
      }

      // Return users with actual data from database
      return (users || []).map(user => ({
        ...user,
        // Only set defaults for fields that are actually null/undefined
        email_verified: user.email_verified ?? false,
        last_activity_at: user.last_activity_at ?? null,
        last_password_change: user.last_password_change ?? null,
        password_change_required: user.password_change_required ?? false,
        two_factor_enabled: user.two_factor_enabled ?? false,
        profile_picture_url: user.profile_picture_url ?? null
      }))
    } catch (error) {
      console.error('Get users by partner error:', error)
      return []
    }
  }

  /**
   * Get user by ID
   */
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !user) {
        console.error('Get user by ID error:', error)
        return null
      }

      // Return user with actual data from database
      return {
        ...user,
        // Only set defaults for fields that are actually null/undefined
        email_verified: user.email_verified ?? false,
        last_activity_at: user.last_activity_at ?? null,
        last_password_change: user.last_password_change ?? null,
        password_change_required: user.password_change_required ?? false,
        two_factor_enabled: user.two_factor_enabled ?? false,
        profile_picture_url: user.profile_picture_url ?? null
      }
    } catch (error) {
      console.error('Get user by ID error:', error)
      return null
    }
  }

  /**
   * Create new user
   */
  static async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', userData.email)
        .single()

      if (existingUser) {
        throw new Error('Email already exists')
      }

      // Hash password
      const saltRounds = 12
      const password_hash = await bcrypt.hash(userData.password, saltRounds)

      // Prepare user data with all fields
      const userInsertData: any = {
        email: userData.email,
        password_hash,
        role: userData.role,
        is_active: true,
        email_verified: false, // New users need email verification
        phone_verified: false,  // New users need phone verification
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Add optional fields if provided
      if (userData.first_name) userInsertData.first_name = userData.first_name
      if (userData.last_name) userInsertData.last_name = userData.last_name
      if (userData.phone_number) userInsertData.phone_number = userData.phone_number
      if (userData.department) userInsertData.department = userData.department
      if (userData.partner_id) userInsertData.partner_id = userData.partner_id
      if (userData.notes) userInsertData.notes = userData.notes

      // Create user with all provided fields
      const { data: newUser, error } = await supabase
        .from('users')
        .insert(userInsertData)
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone_number,
          department,
          role,
          partner_id,
          is_active,
          email_verified,
          phone_verified,
          notes,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        console.error('Create user error:', error)
        return null
      }

      // Send email verification for new user
      if (newUser.email) {
        try {
          await this.sendEmailVerification(newUser.email, newUser.id)
          console.log('✅ Email verification sent to:', newUser.email)
        } catch (emailError) {
          console.error('❌ Failed to send email verification:', emailError)
          // Don't fail user creation if email verification fails
        }
      }

      // Send phone verification if phone number provided
      if (newUser.phone_number) {
        try {
          await this.sendPhoneVerification(newUser.phone_number, newUser.id)
          console.log('✅ Phone verification sent to:', newUser.phone_number)
        } catch (phoneError) {
          console.error('❌ Failed to send phone verification:', phoneError)
          // Don't fail user creation if phone verification fails
        }
      }

      return newUser
    } catch (error) {
      console.error('Create user error:', error)
      return null
    }
  }

  /**
   * Update user
   */
  static async updateUser(userId: string, userData: UpdateUserData): Promise<User | null> {
    try {
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Include all fields that are provided (simplified logic for debugging)
      if (userData.email !== undefined) updateData.email = userData.email
      if (userData.role !== undefined) updateData.role = userData.role
      if (userData.is_active !== undefined) updateData.is_active = userData.is_active
      
      // Profile fields - include all provided values
      if (userData.first_name !== undefined) updateData.first_name = userData.first_name
      if (userData.last_name !== undefined) updateData.last_name = userData.last_name
      if (userData.phone_number !== undefined) updateData.phone_number = userData.phone_number
      if (userData.department !== undefined) updateData.department = userData.department
      if (userData.notes !== undefined) updateData.notes = userData.notes
      if (userData.email_verified !== undefined) updateData.email_verified = userData.email_verified

      // Handle password update separately
      if (userData.password) {
        const saltRounds = 12
        updateData.password_hash = await bcrypt.hash(userData.password, saltRounds)
        updateData.last_password_change = new Date().toISOString()
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select('*')
        .single()
      if (error) {
        console.error('Update user error:', error)
        return null
      }

      return updatedUser
    } catch (error) {
      console.error('Update user error:', error)
      return null
    }
  }

  /**
   * Delete user
   */
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) {
        console.error('Delete user error:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Delete user error:', error)
      return false
    }
  }

  /**
   * Update user profile (for self-updates)
   */
  static async updateProfile(userId: string, profileData: {
    first_name?: string
    last_name?: string
    phone_number?: string
    department?: string
    notes?: string
    profile_picture_url?: string
  }): Promise<User | null> {
    try {
      // Prepare update data with the provided profile data
      const updateData = {
        ...profileData,
        updated_at: new Date().toISOString()
      }

      console.log('🔍 [DEBUG] Updating profile for user:', userId, 'with data:', updateData)

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select(`
          id,
          email,
          first_name,
          last_name,
          phone_number,
          department,
          notes,
          profile_picture_url,
          role,
          is_active,
          email_verified,
          phone_verified,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        console.error('❌ Update profile error:', error)
        return null
      }

      console.log('✅ Profile updated successfully:', updatedUser)
      return updatedUser
    } catch (error) {
      console.error('❌ Update profile error:', error)
      return null
    }
  }

  /**
   * Change user password
   */
  static async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      // Get current user to verify current password
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('password_hash')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return false
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password_hash)
      if (!isCurrentPasswordValid) {
        return false
      }

      // Hash new password
      const saltRounds = 12
      const password_hash = await bcrypt.hash(newPassword, saltRounds)

      // Update password
      const { error: updateError } = await supabase
        .from('users')
        .update({
          password_hash,
          last_password_change: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (updateError) {
        console.error('Change password error:', updateError)
        return false
      }

      return true
    } catch (error) {
      console.error('Change password error:', error)
      return false
    }
  }

  /**
   * Send email verification for new user
   */
  static async sendEmailVerification(email: string, userId: string): Promise<boolean> {
    try {
      const { sendEmail } = await import('./email-utils')
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store verification record
      const { error: insertError } = await supabase
        .from('email_verifications')
        .insert({
          user_id: userId,
          email: email,
          verification_code: verificationCode,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          status: 'pending'
        })

      if (insertError) {
        console.error('Failed to create email verification record:', insertError)
        return false
      }

      // Send verification email
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Vault</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Email Verification</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin: 0 0 20px 0;">Welcome to Payment Vault!</h2>
            
            <p style="color: #666; margin: 20px 0; line-height: 1.6;">
              Thank you for joining Payment Vault. To complete your account setup, please verify your email address.
            </p>
            
            <div style="background: white; border: 2px dashed #667eea; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;">Your verification code is:</p>
              <h1 style="color: #667eea; font-size: 36px; margin: 10px 0; letter-spacing: 8px; font-family: 'Courier New', monospace;">${verificationCode}</h1>
            </div>
            
            <p style="color: #666; margin: 20px 0; line-height: 1.6;">
              Enter this code in the email verification form to activate your account. 
              This code will expire in <strong>24 hours</strong>.
            </p>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; color: #856404; font-size: 14px;">
                <strong>Security Notice:</strong> Never share this code with anyone. 
                Payment Vault will never ask for your verification code via phone or email.
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; margin: 30px 0 0 0;">
              If you didn't create this account, please ignore this email or contact support.
            </p>
          </div>
        </div>
      `

      const result = await sendEmail({
        to: email,
        subject: 'Payment Vault - Email Verification Required',
        html: emailHtml,
        text: `Welcome to Payment Vault! Your email verification code is: ${verificationCode}. This code expires in 24 hours.`
      })

      if (result.success) {
        console.log(`✅ Email verification sent successfully to ${email}`)
        return true
      } else {
        console.error(`❌ Failed to send email verification to ${email}:`, result.error)
        return false
      }
    } catch (error) {
      console.error('Email verification error:', error)
      return false
    }
  }

  /**
   * Send phone verification for new user
   */
  static async sendPhoneVerification(phoneNumber: string, userId: string): Promise<boolean> {
    try {
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Store verification record
      const { error: insertError } = await supabase
        .from('phone_verifications')
        .insert({
          user_id: userId,
          phone_number: phoneNumber,
          verification_code: verificationCode,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          status: 'pending',
          max_attempts: 3,
          attempts: 0
        })

      if (insertError) {
        console.error('Failed to create phone verification record:', insertError)
        return false
      }

      // Send SMS verification
      const message = `Payment Vault: Your phone verification code is ${verificationCode}. Valid for 24 hours. Do not share this code.`
      
      // Get SMS settings
      const { data: smsSettings } = await supabase
        .from('system_settings')
        .select('setting_key, setting_value')
        .eq('category', 'sms')
        .in('setting_key', ['sms_enabled', 'sms_sender_id', 'sms_username', 'sms_api_key', 'sms_password'])

      const settings = smsSettings?.reduce((acc, setting) => {
        acc[setting.setting_key] = setting.setting_value
        return acc
      }, {} as Record<string, string>) || {}

      if (settings.sms_enabled !== 'true') {
        console.log('SMS is disabled in system settings')
        return false
      }

      // Send SMS using AirTouch API
      const smsResult = await this.sendSMSViaAirTouch({
        phoneNumber: phoneNumber,
        message: message,
        senderId: settings.sms_sender_id || 'PaymentVault',
        username: settings.sms_username || '',
        apiKey: settings.sms_api_key || '',
        isEncrypted: true
      })

      if (smsResult.success) {
        console.log(`✅ Phone verification SMS sent successfully to ${phoneNumber}`)
        return true
      } else {
        console.error(`❌ Failed to send phone verification SMS to ${phoneNumber}:`, smsResult.error)
        return false
      }
    } catch (error) {
      console.error('Phone verification error:', error)
      return false
    }
  }

  /**
   * Send SMS via AirTouch API (reused from OTP generation)
   */
  static async sendSMSViaAirTouch({
    phoneNumber,
    message,
    senderId,
    username,
    apiKey,
    isEncrypted = true
  }: {
    phoneNumber: string
    message: string
    senderId: string
    username: string
    apiKey: string
    isEncrypted?: boolean
  }) {
    try {
      // Decrypt credentials if encrypted
      let decryptedApiKey = apiKey
      let decryptedUsername = username
      
      if (isEncrypted) {
        const crypto = await import('crypto')
        const passphrase = process.env.ENCRYPTION_PASSPHRASE || 'default-passphrase'
        
        const decryptData = async (encryptedData: string, passphrase: string): Promise<string> => {
          try {
            const key = crypto.scryptSync(passphrase, 'salt', 32)
            const iv = Buffer.from(encryptedData.slice(0, 32), 'hex')
            const encrypted = encryptedData.slice(32)
            const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
            let decrypted = decipher.update(encrypted, 'hex', 'utf8')
            decrypted += decipher.final('utf8')
            return decrypted
          } catch (error) {
            console.error('Decryption error:', error)
            return encryptedData // Return original if decryption fails
          }
        }
        
        decryptedApiKey = await decryptData(apiKey, passphrase)
        decryptedUsername = await decryptData(username, passphrase)
      }

      const response = await fetch('https://api.airtouch.co.ke/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${decryptedApiKey}`
        },
        body: JSON.stringify({
          username: decryptedUsername,
          to: phoneNumber,
          message: message,
          from: senderId
        })
      })

      const result = await response.json()
      
      if (response.ok && result.success) {
        return {
          success: true,
          messageId: result.messageId || result.id
        }
      } else {
        console.error('SMS API Error:', result)
        return {
          success: false,
          error: result.message || 'SMS sending failed'
        }
      }
    } catch (error) {
      console.error('SMS sending error:', error)
      return {
        success: false,
        error: 'SMS sending failed'
      }
    }
  }
}
