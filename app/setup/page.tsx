'use client'

import { useState } from 'react'
import { Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function SetupPage() {
  const [status, setStatus] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [adminInfo, setAdminInfo] = useState<any>(null)

  const checkAdminStatus = async () => {
    setIsLoading(true)
    setStatus('')
    
    try {
      const response = await fetch('/api/debug/admin-check')
      const data = await response.json()
      
      if (response.ok) {
        setStatus('success')
        setAdminInfo(data.adminUser)
      } else {
        setStatus('error')
        setStatus(data.error || 'Unknown error')
      }
    } catch (error) {
      setStatus('error')
      setStatus('Failed to check admin status')
    } finally {
      setIsLoading(false)
    }
  }

  const ensureAdmin = async () => {
    setIsLoading(true)
    setStatus('')
    
    try {
      const response = await fetch('/api/setup/ensure-admin', { method: 'POST' })
      const data = await response.json()
      
      if (response.ok) {
        setStatus('success')
        setAdminInfo(data.user)
        setStatus(`Admin user ${data.action} successfully!`)
      } else {
        setStatus('error')
        setStatus(data.error || 'Failed to create/update admin')
      }
    } catch (error) {
      setStatus('error')
      setStatus('Failed to ensure admin user')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <div className="text-center mb-6">
          <Shield className="h-12 w-12 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">System Setup</h1>
          <p className="text-gray-600">Configure admin user for M-Pesa B2C Vault</p>
        </div>

        <div className="space-y-4">
          <button
            onClick={checkAdminStatus}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Check Admin Status
          </button>

          <button
            onClick={ensureAdmin}
            disabled={isLoading}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Create/Update Admin User
          </button>
        </div>

        {status && (
          <div className={`mt-4 p-4 rounded-md ${
            status.includes('success') || status.includes('created') || status.includes('updated')
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className="flex">
              {status.includes('success') || status.includes('created') || status.includes('updated') ? (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-400 mr-2" />
              )}
              <div>
                <p className={`text-sm ${
                  status.includes('success') || status.includes('created') || status.includes('updated')
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}>
                  {status}
                </p>
              </div>
            </div>
          </div>
        )}

        {adminInfo && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Admin User Info:</h3>
            <div className="text-sm text-blue-700">
              <p><strong>Email:</strong> {adminInfo.email}</p>
              <p><strong>Role:</strong> {adminInfo.role}</p>
              <p><strong>Active:</strong> {adminInfo.is_active ? 'Yes' : 'No'}</p>
              <p><strong>Has Password:</strong> {adminInfo.has_password ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Default Credentials:</h3>
          <div className="text-sm text-yellow-700">
            <p><strong>Email:</strong> admin@mpesavault.com</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/secure-login"
            className="text-blue-600 hover:text-blue-500 text-sm font-medium"
          >
            Go to Login Page →
          </a>
        </div>
      </div>
    </div>
  )
}