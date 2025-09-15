'use client'

import { useState, useEffect } from 'react'
import { 
  Settings, 
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Database,
  Key,
  Bell,
  Shield
} from 'lucide-react'

interface SystemStatus {
  database: 'connected' | 'disconnected' | 'error'
  mpesa_api: 'active' | 'inactive' | 'error'
  callbacks: 'working' | 'not_working' | 'error'
  notifications: 'enabled' | 'disabled' | 'error'
}

export default function SettingsPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: 'disconnected',
    mpesa_api: 'inactive',
    callbacks: 'not_working',
    notifications: 'disabled'
  })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState({
    auto_refresh: true,
    notifications_enabled: true,
    debug_mode: false,
    max_retry_attempts: 3,
    callback_timeout: 30
  })

  useEffect(() => {
    loadSystemStatus()
    loadSettings()
  }, [])

  const loadSystemStatus = async () => {
    try {
      // Mock system status for now
      setSystemStatus({
        database: 'connected',
        mpesa_api: 'active',
        callbacks: 'working',
        notifications: 'enabled'
      })
    } catch (error) {
      console.error('Failed to load system status:', error)
      setSystemStatus({
        database: 'error',
        mpesa_api: 'error',
        callbacks: 'error',
        notifications: 'error'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = () => {
    // Load settings from localStorage or API
    const savedSettings = localStorage.getItem('mpesa_vault_settings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }

  const saveSettings = () => {
    localStorage.setItem('mpesa_vault_settings', JSON.stringify(settings))
    alert('Settings saved successfully!')
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'working':
      case 'enabled':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'disconnected':
      case 'inactive':
      case 'not_working':
      case 'disabled':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-600" />
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'working':
      case 'enabled':
        return 'Working'
      case 'disconnected':
      case 'inactive':
      case 'not_working':
      case 'disabled':
        return 'Inactive'
      case 'error':
        return 'Error'
      default:
        return 'Unknown'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
      case 'working':
      case 'enabled':
        return 'bg-green-100 text-green-800'
      case 'disconnected':
      case 'inactive':
      case 'not_working':
      case 'disabled':
        return 'bg-yellow-100 text-yellow-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading system status...</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
              <p className="text-sm text-gray-500">Manage system configuration and monitor service status</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* System Status */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                System Status
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Database className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Database</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(systemStatus.database)}
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemStatus.database)}`}>
                    {getStatusText(systemStatus.database)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Key className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">M-Pesa API</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(systemStatus.mpesa_api)}
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemStatus.mpesa_api)}`}>
                    {getStatusText(systemStatus.mpesa_api)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Callbacks</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(systemStatus.callbacks)}
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemStatus.callbacks)}`}>
                    {getStatusText(systemStatus.callbacks)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Bell className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-sm font-medium text-gray-700">Notifications</span>
                </div>
                <div className="flex items-center">
                  {getStatusIcon(systemStatus.notifications)}
                  <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(systemStatus.notifications)}`}>
                    {getStatusText(systemStatus.notifications)}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={loadSystemStatus}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Status
                </button>
              </div>
            </div>
          </div>

          {/* Application Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Application Settings
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.auto_refresh}
                    onChange={(e) => setSettings({...settings, auto_refresh: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto-refresh data</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Automatically refresh data every 30 seconds</p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.notifications_enabled}
                    onChange={(e) => setSettings({...settings, notifications_enabled: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Enable notifications</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Show success/error notifications</p>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.debug_mode}
                    onChange={(e) => setSettings({...settings, debug_mode: e.target.checked})}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Debug mode</span>
                </label>
                <p className="text-xs text-gray-500 mt-1">Show detailed debug information</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Retry Attempts
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={settings.max_retry_attempts}
                  onChange={(e) => setSettings({...settings, max_retry_attempts: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Number of retry attempts for failed requests</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Callback Timeout (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={settings.callback_timeout}
                  onChange={(e) => setSettings({...settings, callback_timeout: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Timeout for M-Pesa callback responses</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={saveSettings}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>


        {/* Quick Actions */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Quick Actions</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href="/debug"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <AlertTriangle className="w-6 h-6 text-yellow-600 mb-2" />
                <h3 className="font-medium text-gray-900">System Diagnostics</h3>
                <p className="text-sm text-gray-500">Run system diagnostics and check logs</p>
              </a>

              <a
                href="/partners"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Database className="w-6 h-6 text-blue-600 mb-2" />
                <h3 className="font-medium text-gray-900">Manage Partners</h3>
                <p className="text-sm text-gray-500">Add, edit, or remove partner organizations</p>
              </a>

              <a
                href="/balance-monitoring"
                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Bell className="w-6 h-6 text-green-600 mb-2" />
                <h3 className="font-medium text-gray-900">Balance Monitoring</h3>
                <p className="text-sm text-gray-500">Monitor account balances and alerts</p>
              </a>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="/admin-dashboard"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Shield className="w-6 h-6 text-purple-600 mb-2" />
                  <h3 className="font-medium text-gray-900">Admin Dashboard</h3>
                  <p className="text-sm text-gray-500">Full admin access to manage users and system</p>
                </a>

                <a
                  href="/secure-login"
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Key className="w-6 h-6 text-indigo-600 mb-2" />
                  <h3 className="font-medium text-gray-900">Login Page</h3>
                  <p className="text-sm text-gray-500">Access the user authentication system</p>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
