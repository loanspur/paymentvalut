'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    // Check if user is already logged in
    const sessionToken = localStorage.getItem('session_token')
    if (sessionToken) {
      // Validate session and redirect
      validateSession(sessionToken)
    }
  }, [])

  const validateSession = async (sessionToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      const data = await response.json()
      if (data.success) {
        // Redirect based on role
        if (data.user.role === 'admin') {
          router.push('/admin')
        } else if (data.user.role === 'partner') {
          router.push('/partner')
        }
      } else {
        // Invalid session, remove token
        localStorage.removeItem('session_token')
      }
    } catch (error) {
      console.error('Session validation failed:', error)
      localStorage.removeItem('session_token')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        // Store session token
        console.log('✅ Login successful, storing session token:', data.session_token)
        localStorage.setItem('session_token', data.session_token)
        
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Login successful'
        })

        console.log('🔄 Redirecting based on role:', data.user.role)
        // Redirect based on role
        if (data.user.role === 'admin') {
          console.log('🔄 Redirecting to /admin')
          router.push('/admin')
        } else if (data.user.role === 'partner') {
          console.log('🔄 Redirecting to /partner')
          router.push('/partner')
        }
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Login failed'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Login failed. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <NotificationSystem notifications={notifications} onRemove={removeNotification} />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            M-Pesa Vault
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Demo Credentials</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3">
              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Admin Account</h4>
                <p className="text-xs text-gray-600">Email: admin@mpesavault.com</p>
                <p className="text-xs text-gray-600">Password: admin123</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
