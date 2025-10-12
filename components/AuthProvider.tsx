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
  const router = useRouter()
  const pathname = usePathname()

  // Public routes that don't require authentication
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Check authentication status on mount
  useEffect(() => {
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
          } else {
            setUser(null)
          }
        } else if (response.status === 401) {
          // Clear any stale authentication data
          setUser(null)
        } else {
          // Retry once for server errors
          if (response.status >= 500 && retryCount < 1) {
            setTimeout(() => checkAuthStatus(retryCount + 1), 1000)
            return
          }
          setUser(null)
        }
      } catch (error) {
        console.error('Auth check error:', error)
        // Retry once for network errors
        if (retryCount < 1) {
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

    // Only check auth if not on a public route
    if (!isPublicRoute) {
      checkAuthStatus()
    } else {
      setIsLoading(false)
    }
  }, [isPublicRoute])

  const logout = async () => {
    try {
      setIsLoading(true)
      console.log('🔄 Starting logout process...')
      
      const response = await fetch('/api/auth/secure-logout', { 
        method: 'POST',
        credentials: 'include'
      })
      
      console.log('📡 Logout API response:', response.status, response.ok)
      
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        console.log('🗑️ Cleared localStorage')
      }
      
      setUser(null)
      console.log('👤 User state cleared')
      
      router.push('/secure-login')
      console.log('🔄 Redirected to login page')
      
    } catch (error) {
      console.error('❌ Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
