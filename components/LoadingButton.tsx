'use client'

import { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

interface LoadingButtonProps {
  children: ReactNode
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
  type?: 'button' | 'submit' | 'reset'
  loadingText?: string
}

export const LoadingButton = ({
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  onClick,
  type = 'button',
  loadingText
}: LoadingButtonProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
      case 'secondary':
        return 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500'
      case 'danger':
        return 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      case 'success':
        return 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500'
      case 'warning':
        return 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500'
      default:
        return 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    }
  }

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'md':
        return 'px-4 py-2 text-sm'
      case 'lg':
        return 'px-6 py-3 text-base'
      default:
        return 'px-4 py-2 text-sm'
    }
  }

  const isDisabled = disabled || loading

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-medium rounded-lg
        focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-colors duration-200
        ${getVariantStyles()}
        ${getSizeStyles()}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading && (
        <Loader2 className="w-4 h-4 animate-spin" />
      )}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}

// Convenience components for common button types
export const PrimaryButton = (props: Omit<LoadingButtonProps, 'variant'>) => (
  <LoadingButton {...props} variant="primary" />
)

export const SecondaryButton = (props: Omit<LoadingButtonProps, 'variant'>) => (
  <LoadingButton {...props} variant="secondary" />
)

export const DangerButton = (props: Omit<LoadingButtonProps, 'variant'>) => (
  <LoadingButton {...props} variant="danger" />
)

export const SuccessButton = (props: Omit<LoadingButtonProps, 'variant'>) => (
  <LoadingButton {...props} variant="success" />
)

export const WarningButton = (props: Omit<LoadingButtonProps, 'variant'>) => (
  <LoadingButton {...props} variant="warning" />
)
