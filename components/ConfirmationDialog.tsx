'use client'

import { ReactNode, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { LoadingButton } from './LoadingButton'

interface ConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
  children?: ReactNode
}

export const ConfirmationDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  children
}: ConfirmationDialogProps) => {
  if (!isOpen) return null

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: 'text-red-400',
          iconBg: 'bg-red-100',
          confirmVariant: 'danger' as const
        }
      case 'warning':
        return {
          icon: 'text-yellow-400',
          iconBg: 'bg-yellow-100',
          confirmVariant: 'warning' as const
        }
      case 'info':
        return {
          icon: 'text-blue-400',
          iconBg: 'bg-blue-100',
          confirmVariant: 'primary' as const
        }
      default:
        return {
          icon: 'text-red-400',
          iconBg: 'bg-red-100',
          confirmVariant: 'danger' as const
        }
    }
  }

  const styles = getVariantStyles()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${styles.iconBg}`}>
                <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">
                {title}
              </h3>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="mb-6">
            <p className="text-sm text-gray-600 leading-relaxed">
              {message}
            </p>
            {children && (
              <div className="mt-4">
                {children}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <LoadingButton
              variant="secondary"
              onClick={onClose}
              disabled={loading}
              size="sm"
            >
              {cancelText}
            </LoadingButton>
            <LoadingButton
              variant={styles.confirmVariant}
              onClick={onConfirm}
              loading={loading}
              loadingText="Processing..."
              size="sm"
            >
              {confirmText}
            </LoadingButton>
          </div>
        </div>
      </div>
    </div>
  )
}

// Convenience hook for confirmation dialogs
export const useConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [config, setConfig] = useState<{
    title: string
    message: string
    onConfirm: () => void
    variant?: 'danger' | 'warning' | 'info'
    confirmText?: string
    cancelText?: string
  } | null>(null)

  const confirm = (config: {
    title: string
    message: string
    onConfirm: () => void
    variant?: 'danger' | 'warning' | 'info'
    confirmText?: string
    cancelText?: string
  }) => {
    setConfig(config)
    setIsOpen(true)
  }

  const handleConfirm = () => {
    if (config?.onConfirm) {
      config.onConfirm()
    }
    setIsOpen(false)
    setConfig(null)
  }

  const handleClose = () => {
    setIsOpen(false)
    setConfig(null)
  }

  return {
    isOpen,
    config,
    confirm,
    handleConfirm,
    handleClose
  }
}
