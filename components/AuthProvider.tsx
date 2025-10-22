'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Shield, Loader2 } from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  name?: string
  first_name?: string
  last_name?: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  logout: async () => {}
})

export const useAuth = () => useContext(AuthContext)

interface AuthProviderProps {
  children: React.ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Check authentication status on mount
  useEffect(() => {
    // Skip auth check if we're in the middle of logging out
    if (isLoggingOut) {
      console.log('🔄 Skipping auth check - logout in progress')
      return
    }

    // Skip auth check for public routes
    if (isPublicRoute) {
      console.log('🔄 Skipping auth check - public route')
      setIsLoading(false)
      return
    }

    const checkAuthStatus = async (retryCount = 0) => {
      try {
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.user && data.user.id && data.user.email) {
            setUser(data.user)
            console.log('✅ User authenticated:', data.user.email, 'Role:', data.user.role)
          } else {
            setUser(null)
            console.log('❌ Invalid user data received')
          }
        } else if (response.status === 401) {
          // Clear any stale authentication data
          setUser(null)
          console.log('ℹ️ Authentication failed - 401 (expected for logged out users)')
        } else {
          // Retry once for server errors
          if (response.status >= 500 && retryCount < 1) {
            console.log('🔄 Retrying auth check due to server error...')
            setTimeout(() => checkAuthStatus(retryCount + 1), 1000)
            return
          }
          setUser(null)
          console.log('❌ Auth check failed with status:', response.status)
        }
      } catch (error) {
        console.error('❌ Auth check error:', error)
        // Retry once for network errors
        if (retryCount < 1) {
          console.log('🔄 Retrying auth check due to network error...')
          setTimeout(() => checkAuthStatus(retryCount + 1), 1000)
          return
        }
        setUser(null)
      } finally {
        if (retryCount === 0) {
          setIsLoading(false)
        }
      }
    }

    // Add a small delay to prevent race conditions
    const timeoutId = setTimeout(checkAuthStatus, 100)
    
    return () => clearTimeout(timeoutId)
  }, [pathname, isLoggingOut, isPublicRoute]) // Re-check when pathname changes or logout status changes

  const logout = async () => {
    try {
      setIsLoggingOut(true)
      setIsLoading(true)
      console.log('🔄 Starting logout process...')
      
      // Clear user state immediately to prevent re-authentication
      setUser(null)
      console.log('👤 User state cleared')
      
      // Clear localStorage immediately
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        console.log('🗑️ Cleared localStorage')
      }
      
      // Call logout API
      const response = await fetch('/api/auth/secure-logout', { 
        method: 'POST',
        credentials: 'include'
      })
      
      console.log('📡 Logout API response:', response.status, response.ok)
      
      // Use window.location.href instead of router.push to ensure complete navigation
      if (typeof window !== 'undefined') {
        window.location.href = '/secure-login'
        console.log('🔄 Redirected to login page')
      }
      
    } catch (error) {
      console.error('❌ Logout error:', error)
      // Even if logout fails, redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/secure-login'
      }
    } finally {
      setIsLoading(false)
      // Reset logout flag after a delay to allow for proper navigation
      setTimeout(() => {
        setIsLoggingOut(false)
      }, 3000) // Increased timeout to ensure navigation completes
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
