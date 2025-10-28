'use client'

import { useState, useEffect, useRef } from 'react'
import { Shield, Mail, Phone, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { useToast } from './ToastSimple'
import { LoadingButton } from './LoadingButton'

interface OTPVerificationProps {
  onSuccess: () => void
  onCancel: () => void
  userEmail?: string
  userPhone?: string
}

export default function OTPVerification({ onSuccess, onCancel, userEmail, userPhone }: OTPVerificationProps) {
  const [otpCode, setOtpCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [attemptsRemaining, setAttemptsRemaining] = useState(3)
  const [error, setError] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null)
  
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const { addToast } = useToast()

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  // Remove auto-generation of OTP to prevent unwanted emails
  // Users will manually trigger OTP generation via the "Send OTP" button

  const generateOTP = async () => {
    setIsGenerating(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/otp/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Include cookies in the request
      })

      const result = await response.json()

      if (result.success) {
        setOtpSent(true)
        setOtpExpiry(new Date(result.data.expires_at))
        setTimeLeft(10 * 60) // 10 minutes
        setAttemptsRemaining(3)
        
        addToast({
          type: 'success',
          title: 'OTP Sent',
          message: `Verification code sent to your phone and email`
        })
      } else {
        if (result.requires_verification) {
          setError('Please complete email and phone verification first')
          addToast({
            type: 'error',
            title: 'Verification Required',
            message: result.error
          })
        } else {
          setError(result.error)
          addToast({
            type: 'error',
            title: 'Failed to Send OTP',
            message: result.error
          })
        }
      }
    } catch (error) {
      console.error('Generate OTP error:', error)
      setError('Failed to generate OTP. Please try again.')
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to generate OTP. Please try again.'
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return // Prevent multiple characters
    
    const newOtp = otpCode.split('')
    newOtp[index] = value
    const updatedOtp = newOtp.join('')
    setOtpCode(updatedOtp)

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    setOtpCode(pastedData)
    
    // Focus the last filled input
    const lastIndex = Math.min(pastedData.length - 1, 5)
    inputRefs.current[lastIndex]?.focus()
  }

  const validateOTP = async () => {
    if (otpCode.length !== 6) {
      setError('Please enter a complete 6-digit OTP code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/otp/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ otp_code: otpCode })
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Login Successful',
          message: 'OTP verified successfully. Welcome back!'
        })
        onSuccess()
      } else {
        setError(result.error)
        setAttemptsRemaining(result.attempts_remaining || 0)
        
        if (result.attempts_remaining === 0) {
          addToast({
            type: 'error',
            title: 'Maximum Attempts Exceeded',
            message: 'Please request a new OTP code'
          })
          setOtpSent(false)
          setTimeLeft(0)
        } else {
          addToast({
            type: 'error',
            title: 'Invalid OTP',
            message: result.error
          })
        }
      }
    } catch (error) {
      console.error('Validate OTP error:', error)
      setError('Failed to validate OTP. Please try again.')
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to validate OTP. Please try again.'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Two-Factor Authentication
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter the verification code sent to your registered phone and email
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Contact Info */}
          <div className="mb-6 space-y-2">
            {userPhone && (
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2" />
                <span className="font-medium">Phone:</span>
                <span className="ml-2">{userPhone}</span>
              </div>
            )}
            {userEmail && (
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2" />
                <span className="font-medium">Email:</span>
                <span className="ml-2">{userEmail}</span>
              </div>
            )}
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Enter 6-digit verification code
            </label>
            <div className="flex justify-center space-x-2">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={otpCode[index] || ''}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-12 text-center text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          {/* Timer */}
          {timeLeft > 0 && (
            <div className="mb-4 flex items-center justify-center text-sm text-gray-600">
              <Clock className="h-4 w-4 mr-1" />
              <span>Code expires in {formatTime(timeLeft)}</span>
            </div>
          )}

          {/* Attempts Remaining */}
          {attemptsRemaining > 0 && attemptsRemaining < 3 && (
            <div className="mb-4 flex items-center justify-center text-sm text-orange-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>{attemptsRemaining} attempts remaining</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 flex items-center justify-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {otpSent && !error && (
            <div className="mb-4 flex items-center justify-center text-sm text-green-600">
              <CheckCircle className="h-4 w-4 mr-1" />
              <span>Verification code sent successfully</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <LoadingButton
              onClick={validateOTP}
              loading={isLoading}
              disabled={otpCode.length !== 6 || timeLeft === 0}
              className="w-full"
            >
              Verify & Login
            </LoadingButton>

            <div className="flex space-x-3">
              <button
                onClick={generateOTP}
                disabled={isGenerating || timeLeft > 0}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isGenerating ? 'Sending...' : 'Resend Code'}
              </button>

              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-xs text-yellow-800">
                <strong>Development Mode:</strong> Check console for OTP code
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

