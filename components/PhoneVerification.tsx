'use client'

import { useState, useEffect } from 'react'
import { Phone, Clock, AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useToast } from './ToastSimple'
import { LoadingButton } from './LoadingButton'

interface PhoneVerificationProps {
  onSuccess: () => void
  onBack: () => void
}

export default function PhoneVerification({ onSuccess, onBack }: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)
  const [attemptsRemaining, setAttemptsRemaining] = useState(3)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [step, setStep] = useState<'phone' | 'verify'>('phone')
  
  const { addToast } = useToast()

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [timeLeft])

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as 254XXXXXXXXX
    if (digits.startsWith('254')) {
      return digits
    } else if (digits.startsWith('0')) {
      return '254' + digits.substring(1)
    } else if (digits.length > 0) {
      return '254' + digits
    }
    return digits
  }

  const sendVerificationCode = async () => {
    if (!phoneNumber || phoneNumber.length < 12) {
      setError('Please enter a valid phone number')
      return
    }

    setIsSending(true)
    setError('')
    
    try {
      const response = await fetch('/api/auth/verify/phone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ phone_number: phoneNumber })
      })

      const result = await response.json()

      if (result.success) {
        setCodeSent(true)
        setTimeLeft(15 * 60) // 15 minutes
        setAttemptsRemaining(3)
        setStep('verify')
        
        addToast({
          type: 'success',
          title: 'Verification Code Sent',
          message: `Code sent to ${phoneNumber}`
        })
      } else {
        setError(result.error)
        addToast({
          type: 'error',
          title: 'Failed to Send Code',
          message: result.error
        })
      }
    } catch (error) {
      console.error('Send verification code error:', error)
      setError('Failed to send verification code. Please try again.')
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to send verification code. Please try again.'
      })
    } finally {
      setIsSending(false)
    }
  }

  const verifyPhone = async () => {
    if (verificationCode.length !== 6) {
      setError('Please enter a complete 6-digit verification code')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/verify/phone', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // Include cookies in the request
        body: JSON.stringify({ 
          verification_code: verificationCode,
          phone_number: phoneNumber
        })
      })

      const result = await response.json()

      if (result.success) {
        addToast({
          type: 'success',
          title: 'Phone Verified',
          message: 'Your phone number has been verified successfully!'
        })
        onSuccess()
      } else {
        setError(result.error)
        setAttemptsRemaining(result.attempts_remaining || 0)
        
        if (result.attempts_remaining === 0) {
          addToast({
            type: 'error',
            title: 'Maximum Attempts Exceeded',
            message: 'Please request a new verification code'
          })
          setCodeSent(false)
          setTimeLeft(0)
        } else {
          addToast({
            type: 'error',
            title: 'Invalid Code',
            message: result.error
          })
        }
      }
    } catch (error) {
      console.error('Verify phone error:', error)
      setError('Failed to verify phone. Please try again.')
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to verify phone. Please try again.'
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

  const goBack = () => {
    if (step === 'verify') {
      setStep('phone')
      setCodeSent(false)
      setTimeLeft(0)
      setVerificationCode('')
      setError('')
    } else {
      onBack()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
            <Phone className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {step === 'phone' ? 'Verify Your Phone' : 'Enter Verification Code'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {step === 'phone' 
              ? 'Enter your phone number to receive a verification code'
              : 'We\'ve sent a verification code to your phone'
            }
          </p>
        </div>

        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {step === 'phone' ? (
            <>
              {/* Phone Number Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">+254</span>
                  </div>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(formatPhoneNumber(e.target.value))}
                    className="block w-full pl-16 pr-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="712345678"
                    disabled={isSending}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Enter your phone number in format: 254XXXXXXXXX
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 flex items-center justify-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>{error}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <LoadingButton
                  onClick={sendVerificationCode}
                  loading={isSending}
                  disabled={!phoneNumber || phoneNumber.length < 12}
                  className="w-full"
                >
                  Send Verification Code
                </LoadingButton>

                <button
                  onClick={onBack}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Back
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Phone Display */}
              <div className="mb-6 text-center">
                <div className="flex items-center justify-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <span className="font-medium">{phoneNumber}</span>
                </div>
              </div>

              {/* Verification Code Input */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Enter 6-digit verification code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-semibold tracking-widest"
                  placeholder="000000"
                  disabled={isLoading}
                />
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
              {codeSent && !error && (
                <div className="mb-4 flex items-center justify-center text-sm text-green-600">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  <span>Verification code sent successfully</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <LoadingButton
                  onClick={verifyPhone}
                  loading={isLoading}
                  disabled={verificationCode.length !== 6 || timeLeft === 0}
                  className="w-full"
                >
                  Verify Phone
                </LoadingButton>

                <div className="flex space-x-3">
                  <button
                    onClick={sendVerificationCode}
                    disabled={isSending || timeLeft > 0}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Sending...' : 'Resend Code'}
                  </button>

                  <button
                    onClick={goBack}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center"
                  >
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    Back
                  </button>
                </div>
              </div>

              {/* Development Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-xs text-yellow-800">
                    <strong>Development Mode:</strong> Check console for verification code
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

