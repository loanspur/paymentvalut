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

      // Create user with only basic fields
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          email: userData.email,
          password_hash,
          role: userData.role,
          is_active: true
        })
        .select(`
          id,
          email,
          role,
          is_active,
          email_verified,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        console.error('Create user error:', error)
        return null
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
      // For now, only update basic fields that exist in the database
      const updateData = {
        updated_at: new Date().toISOString()
      }

      const { data: updatedUser, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId)
        .select(`
          id,
          email,
          role,
          is_active,
          email_verified,
          created_at,
          updated_at
        `)
        .single()

      if (error) {
        console.error('Update profile error:', error)
        return null
      }

      return updatedUser
    } catch (error) {
      console.error('Update profile error:', error)
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
}
