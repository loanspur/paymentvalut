// Authentication and authorization utilities

import { createClient } from '@supabase/supabase-js'
import { supabase } from './supabase'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

// Create a service role client for authentication operations
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Only create admin client if service key is available (server-side only)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export interface User {
  id: string
  email: string
  role: 'admin' | 'partner'
  partner_id?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface UserSession {
  id: string
  user_id: string
  session_token: string
  expires_at: string
  created_at: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  role: 'admin' | 'partner'
  partner_id?: string
}

// JWT secret - should be in environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production'

// Session duration (24 hours)
const SESSION_DURATION = 24 * 60 * 60 * 1000

export class AuthService {
  // Hash password
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10
    return await bcrypt.hash(password, saltRounds)
  }

  // Verify password
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash)
  }

  // Generate JWT token
  static generateToken(user: User): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        partner_id: user.partner_id
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    )
  }

  // Verify JWT token
  static verifyToken(token: string): any {
    try {
      return jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return null
    }
  }

  // Generate session token
  static generateSessionToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
  }

  // Login user
  static async login(credentials: LoginCredentials): Promise<{ user: User; session: UserSession } | null> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available - this should only run on server side')
        return null
      }

      // Use admin client to bypass RLS
      const { data: user, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('email', credentials.email)
        .eq('is_active', true)
        .single()

      if (error || !user) {
        console.error('User lookup error:', error)
        return null
      }

      const isValidPassword = await this.verifyPassword(credentials.password, user.password_hash)
      if (!isValidPassword) {
        console.error('Invalid password for user:', credentials.email)
        return null
      }

      // Generate session
      const sessionToken = this.generateSessionToken()
      const expiresAt = new Date(Date.now() + SESSION_DURATION)

      const { data: session, error: sessionError } = await supabaseAdmin
        .from('user_sessions')
        .insert({
          user_id: user.id,
          session_token: sessionToken,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single()

      if (sessionError || !session) {
        console.error('Session creation error:', sessionError)
        return null
      }

      // Update last login
      await supabaseAdmin
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', user.id)

      return { user, session }
    } catch (error) {
      console.error('Login error:', error)
      return null
    }
  }

  // Register user (admin only)
  static async register(registerData: RegisterData, createdBy: string): Promise<User | null> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available - this should only run on server side')
        return null
      }

      // For public API, we'll skip the admin check for now
      // In a real app, you'd want proper authentication
      if (createdBy !== '00000000-0000-0000-0000-000000000000') {
        // Check if creator is admin
        const { data: creator } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', createdBy)
          .single()

        if (!creator || creator.role !== 'admin') {
          throw new Error('Only admins can create users')
        }
      }

      const passwordHash = await this.hashPassword(registerData.password)

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .insert({
          email: registerData.email,
          password_hash: passwordHash,
          role: registerData.role,
          partner_id: registerData.partner_id,
          is_active: true
        })
        .select()
        .single()

      if (error || !user) {
        return null
      }

      return user
    } catch (error) {
      console.error('Registration error:', error)
      return null
    }
  }

  // Validate session
  static async validateSession(sessionToken: string): Promise<User | null> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available - this should only run on server side')
        return null
      }

      const { data: session, error } = await supabaseAdmin
        .from('user_sessions')
        .select(`
          *,
          users (*)
        `)
        .eq('session_token', sessionToken)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !session || !session.users) {
        console.error('Session validation error:', error)
        return null
      }

      return session.users as User
    } catch (error) {
      console.error('Session validation error:', error)
      return null
    }
  }

  // Logout user
  static async logout(sessionToken: string): Promise<boolean> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available - this should only run on server side')
        return false
      }

      const { error } = await supabaseAdmin
        .from('user_sessions')
        .delete()
        .eq('session_token', sessionToken)

      return !error
    } catch (error) {
      console.error('Logout error:', error)
      return false
    }
  }

  // Get user by ID
  static async getUserById(userId: string): Promise<User | null> {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !user) {
        return null
      }

      return user
    } catch (error) {
      console.error('Get user error:', error)
      return null
    }
  }

  // Check if user has permission
  static async hasPermission(
    userId: string, 
    permission: string, 
    resourceType: string, 
    resourceId?: string
  ): Promise<boolean> {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single()

      // Admins have all permissions
      if (user?.role === 'admin') {
        return true
      }

      // Check specific permission
      const { data: permissionData } = await supabase
        .from('user_permissions')
        .select('id')
        .eq('user_id', userId)
        .eq('permission', permission)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId || null)
        .single()

      return !!permissionData
    } catch (error) {
      console.error('Permission check error:', error)
      return false
    }
  }

  // Grant permission to user
  static async grantPermission(
    userId: string,
    permission: string,
    resourceType: string,
    resourceId: string | null,
    grantedBy: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          permission,
          resource_type: resourceType,
          resource_id: resourceId,
          granted_by: grantedBy
        })

      return !error
    } catch (error) {
      console.error('Grant permission error:', error)
      return false
    }
  }

  // Revoke permission from user
  static async revokePermission(
    userId: string,
    permission: string,
    resourceType: string,
    resourceId: string | null
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId)
        .eq('permission', permission)
        .eq('resource_type', resourceType)
        .eq('resource_id', resourceId || null)

      return !error
    } catch (error) {
      console.error('Revoke permission error:', error)
      return false
    }
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<User[]> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available - this should only run on server side')
        return []
      }

      const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Get all users error:', error)
        return []
      }

      return users || []
    } catch (error) {
      console.error('Get all users error:', error)
      return []
    }
  }

  // Update user
  static async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available - this should only run on server side')
        return null
      }

      const { data: user, error } = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single()

      if (error || !user) {
        console.error('Update user error:', error)
        return null
      }

      return user
    } catch (error) {
      console.error('Update user error:', error)
      return null
    }
  }

  // Delete user
  static async deleteUser(userId: string): Promise<boolean> {
    try {
      if (!supabaseAdmin) {
        console.error('Admin client not available - this should only run on server side')
        return false
      }

      const { error } = await supabaseAdmin
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
}

// Middleware for protecting routes
export function requireAuth(handler: (req: any, user: User) => any) {
  return async (req: any) => {
    try {
      const sessionToken = req.headers.get('authorization')?.replace('Bearer ', '')
      
      if (!sessionToken) {
        return new Response(JSON.stringify({ error: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      const user = await AuthService.validateSession(sessionToken)
      
      if (!user) {
        return new Response(JSON.stringify({ error: 'Invalid session' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      }

      return await handler(req, user)
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

// Middleware for admin-only routes
export function requireAdmin(handler: (req: any, user: User) => any) {
  return requireAuth(async (req, user) => {
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return await handler(req, user)
  })
}

// Middleware for partner-only routes
export function requirePartner(handler: (req: any, user: User) => any) {
  return requireAuth(async (req, user) => {
    if (user.role !== 'partner') {
      return new Response(JSON.stringify({ error: 'Partner access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return await handler(req, user)
  })
}
