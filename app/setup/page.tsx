'use client'

import { useState, useEffect } from 'react'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'

interface SetupStatus {
  status: 'migration_required' | 'admin_required' | 'ready' | 'error'
  message: string
  admin?: {
    email: string
    role: string
    is_active: boolean
  }
  credentials?: {
    email: string
    password: string
  }
}

export default function SetupPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    checkSetupStatus()
  }, [])

  const checkSetupStatus = async () => {
    try {
      const response = await fetch('/api/setup/admin')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Setup Check Failed',
        message: 'Could not check setup status'
      })
    } finally {
      setLoading(false)
    }
  }

  const createAdmin = async () => {
    setCreating(true)
    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST'
      })
      const data = await response.json()

      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Admin Created',
          message: 'Admin user created successfully'
        })
        checkSetupStatus()
      } else {
        addNotification({
          type: 'error',
          title: 'Creation Failed',
          message: data.error || 'Failed to create admin user'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Creation Failed',
        message: 'Could not create admin user'
      })
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking setup status...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationSystem notifications={notifications} onRemove={removeNotification} />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">M-Pesa Vault Setup</h1>
          <p className="mt-2 text-lg text-gray-600">Configure your system for first use</p>
        </div>

        <div className="bg-white shadow rounded-lg p-8">
          {status?.status === 'migration_required' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Database Migration Required</h3>
              <p className="text-gray-600 mb-6">{status.message}</p>
              <div className="bg-gray-100 p-4 rounded-md text-left">
                <p className="text-sm font-mono text-gray-800">
                  Run this command in your terminal:
                </p>
                <code className="block mt-2 text-sm bg-gray-800 text-green-400 p-2 rounded">
                  supabase db push
                </code>
              </div>
              <button
                onClick={checkSetupStatus}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Check Again
              </button>
            </div>
          )}

          {status?.status === 'admin_required' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Create Admin User</h3>
              <p className="text-gray-600 mb-6">{status.message}</p>
              
              <div className="bg-blue-50 p-4 rounded-md mb-6">
                <h4 className="font-medium text-blue-900 mb-2">Default Admin Credentials:</h4>
                <p className="text-sm text-blue-800">
                  <strong>Email:</strong> {status.credentials?.email}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Password:</strong> {status.credentials?.password}
                </p>
                <p className="text-xs text-blue-700 mt-2">
                  ⚠️ Change this password immediately after first login
                </p>
              </div>

              <button
                onClick={createAdmin}
                disabled={creating}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating...' : 'Create Admin User'}
              </button>
            </div>
          )}

          {status?.status === 'ready' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Complete!</h3>
              <p className="text-gray-600 mb-6">{status.message}</p>
              
              <div className="bg-green-50 p-4 rounded-md mb-6">
                <h4 className="font-medium text-green-900 mb-2">Admin User Ready:</h4>
                <p className="text-sm text-green-800">
                  <strong>Email:</strong> {status.admin?.email}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Role:</strong> {status.admin?.role}
                </p>
                <p className="text-sm text-green-800">
                  <strong>Status:</strong> {status.admin?.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>

              <div className="space-y-3">
                <a
                  href="/login"
                  className="block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
                >
                  Go to Login
                </a>
                <button
                  onClick={checkSetupStatus}
                  className="block bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
                >
                  Refresh Status
                </button>
              </div>
            </div>
          )}

          {status?.status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Setup Error</h3>
              <p className="text-gray-600 mb-6">{status.message}</p>
              <button
                onClick={checkSetupStatus}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Setup Instructions</h3>
          <div className="space-y-4 text-sm text-gray-600">
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">1</span>
              <div>
                <p className="font-medium">Run Database Migration</p>
                <p>Execute <code className="bg-gray-100 px-1 rounded">supabase db push</code> to create the required tables</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">2</span>
              <div>
                <p className="font-medium">Create Admin User</p>
                <p>Use the setup page to create the default admin user</p>
              </div>
            </div>
            <div className="flex items-start">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium mr-3">3</span>
              <div>
                <p className="font-medium">Login and Configure</p>
                <p>Login with admin credentials and set up your system</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
