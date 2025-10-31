'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, User, Lock, Shield } from 'lucide-react'
import Image from 'next/image'
import OTPVerification from '../../components/OTPVerification'
import EmailVerification from '../../components/EmailVerification'
import PhoneVerification from '../../components/PhoneVerification'

export default function SecureLoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loginStep, setLoginStep] = useState<'login' | 'email-verify' | 'phone-verify' | 'otp-verify'>('login')
  const router = useRouter()
  const [logoError, setLogoError] = useState(false)

  // Check if user is already authenticated and redirect
  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('🔍 Checking authentication status...')
        
        const response = await fetch('/api/auth/me', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
        
        console.log('📡 Auth check response status:', response.status)
        
        if (response.ok) {
          const data = await response.json()
          console.log('📋 Auth check response data:', data)
          
          if (data.success && data.user) {
            // User is already authenticated, redirect them
            console.log('✅ User already authenticated, redirecting...', data.user.role)
            
            // Add a small delay to ensure smooth transition
            setTimeout(() => {
              const redirectUrl = ['admin', 'super_admin'].includes(data.user.role) 
                ? '/admin-dashboard' 
                : '/'
              
              console.log('🔄 Redirecting authenticated user to:', redirectUrl)
              window.location.replace(redirectUrl)
            }, 1000) // Increased delay to prevent race conditions
          }
        } else if (response.status === 401) {
          // User is not authenticated, which is expected on login page
          console.log('ℹ️ User not authenticated, staying on login page')
        } else {
          console.log('⚠️ Unexpected response status:', response.status)
        }
      } catch (error) {
        // Network error or other issue - user needs to login
        console.error('❌ Auth check failed with error:', error)
        
        // Check if it's a connection reset error
        if (error.message && error.message.includes('ERR_CONNECTION_RESET')) {
          console.log('🔄 Connection reset detected, server may be restarting...')
          // Retry after a delay
          setTimeout(() => {
            console.log('🔄 Retrying auth check after connection reset...')
            checkAuth()
          }, 2000)
        } else {
          console.log('ℹ️ User needs to login')
        }
      }
    }

    // Add a longer delay to prevent race conditions with logout and other auth checks
    const timeoutId = setTimeout(checkAuth, 1000) // Increased delay
    
    return () => clearTimeout(timeoutId)
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isSubmitting) {
      return
    }
    setIsSubmitting(true)
    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/secure-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        setCurrentUser(data.user)
        setIsLoading(false)
        setIsSubmitting(false)
        
        // Check if OTP validation is required
        if (data.requires_otp) {
          console.log('🔐 OTP validation required')
          setLoginStep('otp-verify')
        } else if (!data.user.email_verified) {
          console.log('📧 Email verification required')
          setLoginStep('email-verify')
        } else if (!data.user.phone_verified) {
          console.log('📱 Phone verification required')
          setLoginStep('phone-verify')
        } else {
          // Direct login success
          setSuccess('Login successful! Redirecting...')
          
          // Force a page reload to ensure auth state is properly set
          setTimeout(() => {
            // Force reload to ensure cookies are set and auth state is updated
            const redirectUrl = ['admin', 'super_admin'].includes(data.user.role) 
              ? '/admin-dashboard' 
              : '/'
            
            console.log('🔄 Redirecting to:', redirectUrl, 'for role:', data.user.role)
            
            // Use window.location.replace to prevent back button issues
            window.location.replace(redirectUrl)
          }, 2000) // Increased delay to ensure cookie is set
        }
      } else {
        setError(data.error || 'Login failed')
        setIsLoading(false)
        setIsSubmitting(false)
      }
    } catch (error) {
      setError('Network error. Please try again.')
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }

  // Handle verification step completion
  const handleVerificationSuccess = () => {
    if (loginStep === 'email-verify') {
      setLoginStep('phone-verify')
    } else if (loginStep === 'phone-verify') {
      setLoginStep('otp-verify')
    } else if (loginStep === 'otp-verify') {
      // All verifications complete, redirect
      setSuccess('All verifications complete! Redirecting...')
      setTimeout(() => {
        const redirectUrl = ['admin', 'super_admin'].includes(currentUser?.role) 
          ? '/admin-dashboard' 
          : '/'
        window.location.replace(redirectUrl)
      }, 2000)
    }
  }

  const handleVerificationBack = () => {
    if (loginStep === 'phone-verify') {
      setLoginStep('email-verify')
    } else if (loginStep === 'otp-verify') {
      setLoginStep('phone-verify')
    } else {
      setLoginStep('login')
    }
  }

  // Render verification components
  if (loginStep === 'email-verify') {
    return (
      <EmailVerification
        userEmail={currentUser?.email}
        onSuccess={handleVerificationSuccess}
        onBack={handleVerificationBack}
      />
    )
  }

  if (loginStep === 'phone-verify') {
    return (
      <PhoneVerification
        onSuccess={handleVerificationSuccess}
        onBack={handleVerificationBack}
      />
    )
  }

  if (loginStep === 'otp-verify') {
    return (
      <OTPVerification
        userEmail={currentUser?.email}
        userPhone={currentUser?.phone_number}
        onSuccess={handleVerificationSuccess}
        onCancel={handleVerificationBack}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Shield className="h-12 w-12 text-blue-600" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Secure EazzyPay Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enhanced Security with Role-Based Access Control
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

          <form className="space-y-6" onSubmit={handleSubmit} key="login-form">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="appearance-none block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your email address"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="appearance-none block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Enter your password"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isLoading || isSubmitting}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>

            <div className="text-center">
              <a
                href="/request-password-reset"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                Forgot your password?
              </a>
            </div>
          </form>

        </div>
      </div>
    </div>
  )
}