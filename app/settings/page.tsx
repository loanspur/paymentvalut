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
  Shield,
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Check,
  Server,
  Cloud
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

  const [ncbaSettings, setNcbaSettings] = useState({
    ncba_business_short_code: '880100',
    ncba_notification_username: '',
    ncba_notification_password: '',
    ncba_notification_secret_key: '',
    ncba_notification_endpoint_url: '',
    ncba_account_number: '123456',
    ncba_account_reference_separator: '#'
  })

  const [showPasswords, setShowPasswords] = useState({
    username: false,
    password: false,
    secret_key: false,
    uat_username: false,
    uat_password: false,
    uat_subscription_key: false,
    prod_username: false,
    prod_password: false,
    prod_subscription_key: false
  })

  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'paybill' | 'uat' | 'prod'>('paybill')

  const [uatSettings, setUatSettings] = useState({
    ncba_ob_uat_base_url: 'https://apidev.ncbagroup.com/openbankingapigateway/dev',
    ncba_ob_token_path: '/api/v1/Auth/generate-token',
    ncba_ob_float_purchase_path: '/api/v1/FloatPurchase/floatpurchase',
    ncba_ob_subscription_key: '',
    ncba_ob_username: '',
    ncba_ob_password: '',
    ncba_ob_debit_account_number: '',
    ncba_ob_debit_account_currency: 'KES',
    ncba_ob_country: 'Kenya'
  })

  const [prodSettings, setProdSettings] = useState({
    ncba_ob_prod_base_url: '',
    ncba_ob_token_path: '/api/v1/Auth/generate-token',
    ncba_ob_float_purchase_path: '/api/v1/FloatPurchase/floatpurchase',
    ncba_ob_subscription_key: '',
    ncba_ob_username: '',
    ncba_ob_password: '',
    ncba_ob_debit_account_number: '',
    ncba_ob_debit_account_currency: 'KES',
    ncba_ob_country: 'Kenya'
  })

  const [obEnvironment, setObEnvironment] = useState<'uat' | 'prod'>('uat')

  useEffect(() => {
    loadSystemStatus()
    loadSettings()
    loadNcbaSettings()
    loadObSettings()
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

  const loadNcbaSettings = async () => {
    try {
      const response = await fetch('/api/system/settings?category=ncba')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const settings = data.data
          setNcbaSettings({
            ncba_business_short_code: settings.ncba_business_short_code?.value || '880100',
            ncba_notification_username: settings.ncba_notification_username?.value || '',
            ncba_notification_password: settings.ncba_notification_password?.value || '',
            ncba_notification_secret_key: settings.ncba_notification_secret_key?.value || '',
            ncba_notification_endpoint_url: settings.ncba_notification_endpoint_url?.value || '',
            ncba_account_number: settings.ncba_account_number?.value || '123456',
            ncba_account_reference_separator: settings.ncba_account_reference_separator?.value || '#'
          })
        }
      }
    } catch (error) {
      console.error('Failed to load NCBA settings:', error)
    }
  }

  const loadObSettings = async () => {
    try {
      const response = await fetch('/api/system/settings?category=ncba_ob')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const settings = data.data
          
          // Load environment setting
          if (settings.ncba_ob_environment?.value) {
            setObEnvironment(settings.ncba_ob_environment.value as 'uat' | 'prod')
          }

          // Load UAT settings
          setUatSettings({
            ncba_ob_uat_base_url: settings.ncba_ob_uat_base_url?.value || 'https://apidev.ncbagroup.com/openbankingapigateway/dev',
            ncba_ob_token_path: settings.ncba_ob_token_path?.value || '/api/v1/Auth/generate-token',
            ncba_ob_float_purchase_path: settings.ncba_ob_float_purchase_path?.value || '/api/v1/FloatPurchase/floatpurchase',
            ncba_ob_subscription_key: settings.ncba_ob_subscription_key?.value || '',
            ncba_ob_username: settings.ncba_ob_username?.value || '',
            ncba_ob_password: settings.ncba_ob_password?.value || '',
            ncba_ob_debit_account_number: settings.ncba_ob_debit_account_number?.value || '',
            ncba_ob_debit_account_currency: settings.ncba_ob_debit_account_currency?.value || 'KES',
            ncba_ob_country: settings.ncba_ob_country?.value || 'Kenya'
          })

          // Load Production settings
          setProdSettings({
            ncba_ob_prod_base_url: settings.ncba_ob_prod_base_url?.value || '',
            ncba_ob_token_path: settings.ncba_ob_token_path?.value || '/api/v1/Auth/generate-token',
            ncba_ob_float_purchase_path: settings.ncba_ob_float_purchase_path?.value || '/api/v1/FloatPurchase/floatpurchase',
            ncba_ob_subscription_key: settings.ncba_ob_prod_subscription_key?.value || '',
            ncba_ob_username: settings.ncba_ob_prod_username?.value || '',
            ncba_ob_password: settings.ncba_ob_prod_password?.value || '',
            ncba_ob_debit_account_number: settings.ncba_ob_prod_debit_account_number?.value || '',
            ncba_ob_debit_account_currency: settings.ncba_ob_debit_account_currency?.value || 'KES',
            ncba_ob_country: settings.ncba_ob_country?.value || 'Kenya'
          })
        }
      }
    } catch (error) {
      console.error('Failed to load OB settings:', error)
    }
  }

  const saveSettings = () => {
    localStorage.setItem('mpesa_vault_settings', JSON.stringify(settings))
    alert('Settings saved successfully!')
  }

  const saveNcbaSettings = async () => {
    try {
      const response = await fetch('/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings: ncbaSettings
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert('NCBA Paybill settings saved successfully!')
        } else {
          alert('Failed to save NCBA settings: ' + (data.error || 'Unknown error'))
        }
      } else {
        alert('Failed to save NCBA settings')
      }
    } catch (error) {
      console.error('Failed to save NCBA settings:', error)
      alert('Failed to save NCBA settings')
    }
  }

  const saveObSettings = async (env: 'uat' | 'prod') => {
    try {
      const prefix = env === 'uat' ? 'ncba_ob_' : 'ncba_ob_prod_'
      
      const settings: Record<string, string> = {}
      
      if (env === 'uat') {
        // UAT settings
        settings['ncba_ob_uat_base_url'] = uatSettings.ncba_ob_uat_base_url
        settings['ncba_ob_token_path'] = uatSettings.ncba_ob_token_path
        settings['ncba_ob_float_purchase_path'] = uatSettings.ncba_ob_float_purchase_path
        settings['ncba_ob_subscription_key'] = uatSettings.ncba_ob_subscription_key
        settings['ncba_ob_username'] = uatSettings.ncba_ob_username
        settings['ncba_ob_password'] = uatSettings.ncba_ob_password
        settings['ncba_ob_debit_account_number'] = uatSettings.ncba_ob_debit_account_number
        settings['ncba_ob_debit_account_currency'] = uatSettings.ncba_ob_debit_account_currency
        settings['ncba_ob_country'] = uatSettings.ncba_ob_country
      } else {
        // Production settings
        settings['ncba_ob_prod_base_url'] = prodSettings.ncba_ob_prod_base_url
        settings['ncba_ob_prod_token_path'] = prodSettings.ncba_ob_token_path
        settings['ncba_ob_prod_float_purchase_path'] = prodSettings.ncba_ob_float_purchase_path
        settings['ncba_ob_prod_subscription_key'] = prodSettings.ncba_ob_subscription_key
        settings['ncba_ob_prod_username'] = prodSettings.ncba_ob_username
        settings['ncba_ob_prod_password'] = prodSettings.ncba_ob_password
        settings['ncba_ob_prod_debit_account_number'] = prodSettings.ncba_ob_debit_account_number
        settings['ncba_ob_prod_debit_account_currency'] = prodSettings.ncba_ob_debit_account_currency
        settings['ncba_ob_prod_country'] = prodSettings.ncba_ob_country
      }

      // Also save environment setting
      settings['ncba_ob_environment'] = obEnvironment

      const response = await fetch('/api/system/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          alert(`NCBA ${env.toUpperCase()} settings saved successfully!`)
        } else {
          alert(`Failed to save ${env.toUpperCase()} settings: ` + (data.error || 'Unknown error'))
        }
      } else {
        alert(`Failed to save ${env.toUpperCase()} settings`)
      }
    } catch (error) {
      console.error(`Failed to save ${env.toUpperCase()} settings:`, error)
      alert(`Failed to save ${env.toUpperCase()} settings`)
    }
  }

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  const PasswordField = ({ 
    label, 
    value, 
    onChange, 
    fieldKey, 
    placeholder,
    helpText 
  }: {
    label: string
    value: string
    onChange: (value: string) => void
    fieldKey: keyof typeof showPasswords
    placeholder?: string
    helpText?: string
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex">
        <input
          type={showPasswords[fieldKey] ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => togglePasswordVisibility(fieldKey)}
          className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
        >
          {showPasswords[fieldKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
      {helpText && <p className="text-xs text-gray-500 mt-1">{helpText}</p>}
    </div>
  )

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  const generateAccountReference = (partnerId: string) => {
    return `${ncbaSettings.ncba_account_number}${ncbaSettings.ncba_account_reference_separator}${partnerId}`
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

      <div className="w-full">

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

        {/* NCBA Settings */}
        <div className="mt-8 bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              NCBA Settings
            </h2>
            <p className="text-sm text-gray-500 mt-1">Configure NCBA Paybill and Open Banking settings</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('paybill')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'paybill'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CreditCard className="w-4 h-4 inline mr-2" />
                Paybill Settings
              </button>
              <button
                onClick={() => setActiveTab('uat')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'uat'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Server className="w-4 h-4 inline mr-2" />
                UAT/Sandbox
              </button>
              <button
                onClick={() => setActiveTab('prod')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'prod'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Cloud className="w-4 h-4 inline mr-2" />
                Production
              </button>
            </nav>
          </div>
          
          <div className="p-6">
            {/* Paybill Settings Tab */}
            {activeTab === 'paybill' && (
              <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Configuration */}
              <div className="space-y-6">
                <h3 className="text-md font-medium text-gray-900">Basic Configuration</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Short Code
                  </label>
                  <input
                    type="text"
                    value={ncbaSettings.ncba_business_short_code}
                    onChange={(e) => setNcbaSettings({...ncbaSettings, ncba_business_short_code: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="880100"
                  />
                  <p className="text-xs text-gray-500 mt-1">NCBA Paybill business short code (global)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={ncbaSettings.ncba_account_number}
                    onChange={(e) => setNcbaSettings({...ncbaSettings, ncba_account_number: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="123456"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your NCBA account number</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Account Reference Separator
                  </label>
                  <input
                    type="text"
                    value={ncbaSettings.ncba_account_reference_separator}
                    onChange={(e) => setNcbaSettings({...ncbaSettings, ncba_account_reference_separator: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="#"
                    maxLength={1}
                  />
                  <p className="text-xs text-gray-500 mt-1">Separator between account number and partner ID</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Endpoint URL
                  </label>
                  <div className="flex">
                    <input
                      type="text"
                      value={ncbaSettings.ncba_notification_endpoint_url}
                      onChange={(e) => setNcbaSettings({...ncbaSettings, ncba_notification_endpoint_url: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://your-domain.com/api/ncba/paybill-notification"
                    />
                    <button
                      onClick={() => copyToClipboard(ncbaSettings.ncba_notification_endpoint_url, 'endpoint')}
                      className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                    >
                      {copiedField === 'endpoint' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">URL where NCBA will send payment notifications</p>
                </div>
              </div>

              {/* Authentication Settings */}
              <div className="space-y-6">
                <h3 className="text-md font-medium text-gray-900">Authentication Settings</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Username
                  </label>
                  <div className="flex">
                    <input
                      type={showPasswords.username ? "text" : "password"}
                      value={ncbaSettings.ncba_notification_username}
                      onChange={(e) => setNcbaSettings({...ncbaSettings, ncba_notification_username: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter username"
                    />
                    <button
                      onClick={() => togglePasswordVisibility('username')}
                      className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                    >
                      {showPasswords.username ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Username for NCBA notification authentication</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notification Password
                  </label>
                  <div className="flex">
                    <input
                      type={showPasswords.password ? "text" : "password"}
                      value={ncbaSettings.ncba_notification_password}
                      onChange={(e) => setNcbaSettings({...ncbaSettings, ncba_notification_password: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter password"
                    />
                    <button
                      onClick={() => togglePasswordVisibility('password')}
                      className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                    >
                      {showPasswords.password ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Password for NCBA notification authentication</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Secret Key
                  </label>
                  <div className="flex">
                    <input
                      type={showPasswords.secret_key ? "text" : "password"}
                      value={ncbaSettings.ncba_notification_secret_key}
                      onChange={(e) => setNcbaSettings({...ncbaSettings, ncba_notification_secret_key: e.target.value})}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter secret key"
                    />
                    <button
                      onClick={() => togglePasswordVisibility('secret_key')}
                      className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg hover:bg-gray-200 transition-colors"
                    >
                      {showPasswords.secret_key ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Secret key for hash validation</p>
                </div>
              </div>
            </div>

            {/* Account Reference Example */}
            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Account Reference Format</h4>
              <p className="text-sm text-blue-800 mb-2">
                Partners will use this format when making payments to your NCBA Paybill:
              </p>
              <div className="bg-white p-3 rounded border border-blue-200">
                <div className="font-mono text-sm">
                  <div className="mb-1">
                    <span className="text-gray-600">Paybill:</span> <span className="font-bold text-blue-600">{ncbaSettings.ncba_business_short_code}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Account:</span> <span className="font-bold text-blue-600">{ncbaSettings.ncba_account_number}{ncbaSettings.ncba_account_reference_separator}&lt;PARTNER_ID&gt;</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Example: {generateAccountReference('example-partner-id')}
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={saveNcbaSettings}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <Save className="w-4 h-4 mr-2" />
                Save Paybill Settings
              </button>
            </div>
              </>
            )}

            {/* UAT/Sandbox Settings Tab */}
            {activeTab === 'uat' && (
              <>
            <div className="space-y-6">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>UAT/Sandbox Environment:</strong> Use these settings for testing Float Purchase and other Open Banking operations. 
                  Base URL is pre-configured for the NCBA sandbox environment.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-md font-medium text-gray-900">API Configuration</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={uatSettings.ncba_ob_uat_base_url}
                      onChange={(e) => setUatSettings({...uatSettings, ncba_ob_uat_base_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://apidev.ncbagroup.com/openbankingapigateway/dev"
                    />
                    <p className="text-xs text-gray-500 mt-1">NCBA UAT API base URL</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Path
                    </label>
                    <input
                      type="text"
                      value={uatSettings.ncba_ob_token_path}
                      onChange={(e) => setUatSettings({...uatSettings, ncba_ob_token_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/api/v1/Auth/generate-token"
                    />
                    <p className="text-xs text-gray-500 mt-1">Path to token endpoint</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Float Purchase Path
                    </label>
                    <input
                      type="text"
                      value={uatSettings.ncba_ob_float_purchase_path}
                      onChange={(e) => setUatSettings({...uatSettings, ncba_ob_float_purchase_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/api/v1/FloatPurchase/floatpurchase"
                    />
                    <p className="text-xs text-gray-500 mt-1">Path to float purchase endpoint</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Account Number
                    </label>
                    <input
                      type="text"
                      value={uatSettings.ncba_ob_debit_account_number}
                      onChange={(e) => setUatSettings({...uatSettings, ncba_ob_debit_account_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your NCBA account number"
                    />
                    <p className="text-xs text-gray-500 mt-1">NCBA account to debit for float purchases</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Account Currency
                    </label>
                    <select
                      value={uatSettings.ncba_ob_debit_account_currency}
                      onChange={(e) => setUatSettings({...uatSettings, ncba_ob_debit_account_currency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Currency for debit account</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={uatSettings.ncba_ob_country}
                      onChange={(e) => setUatSettings({...uatSettings, ncba_ob_country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Kenya"
                    />
                    <p className="text-xs text-gray-500 mt-1">Country code</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-md font-medium text-gray-900">Authentication</h3>
                  
                  <PasswordField
                    label="Subscription Key"
                    value={uatSettings.ncba_ob_subscription_key}
                    onChange={(value) => setUatSettings({...uatSettings, ncba_ob_subscription_key: value})}
                    fieldKey="uat_subscription_key"
                    placeholder="7e0a42d930e34680b295951acb24b140"
                    helpText="API subscription key for UAT environment"
                  />

                  <PasswordField
                    label="Username (UserID)"
                    value={uatSettings.ncba_ob_username}
                    onChange={(value) => setUatSettings({...uatSettings, ncba_ob_username: value})}
                    fieldKey="uat_username"
                    placeholder="Your NCBA userID"
                    helpText="UserID for token generation (used as userID in API)"
                  />

                  <PasswordField
                    label="Password"
                    value={uatSettings.ncba_ob_password}
                    onChange={(value) => setUatSettings({...uatSettings, ncba_ob_password: value})}
                    fieldKey="uat_password"
                    placeholder="Your NCBA password"
                    helpText="Password for token generation"
                  />
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => saveObSettings('uat')}
                  className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save UAT/Sandbox Settings
                </button>
              </div>
            </div>
              </>
            )}

            {/* Production Settings Tab */}
            {activeTab === 'prod' && (
              <>
            <div className="space-y-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  <strong>Production Environment:</strong> ⚠️ These settings will be used for live transactions. 
                  Double-check all credentials before saving.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="text-md font-medium text-gray-900">API Configuration</h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Base URL
                    </label>
                    <input
                      type="text"
                      value={prodSettings.ncba_ob_prod_base_url}
                      onChange={(e) => setProdSettings({...prodSettings, ncba_ob_prod_base_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://c2bapis.ncbagroup.com/payments/api/v1"
                    />
                    <p className="text-xs text-gray-500 mt-1">NCBA Production API base URL</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Token Path
                    </label>
                    <input
                      type="text"
                      value={prodSettings.ncba_ob_token_path}
                      onChange={(e) => setProdSettings({...prodSettings, ncba_ob_token_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/api/v1/Auth/generate-token"
                    />
                    <p className="text-xs text-gray-500 mt-1">Path to token endpoint</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Float Purchase Path
                    </label>
                    <input
                      type="text"
                      value={prodSettings.ncba_ob_float_purchase_path}
                      onChange={(e) => setProdSettings({...prodSettings, ncba_ob_float_purchase_path: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="/api/v1/FloatPurchase/floatpurchase"
                    />
                    <p className="text-xs text-gray-500 mt-1">Path to float purchase endpoint</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Account Number
                    </label>
                    <input
                      type="text"
                      value={prodSettings.ncba_ob_debit_account_number}
                      onChange={(e) => setProdSettings({...prodSettings, ncba_ob_debit_account_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Your NCBA production account number"
                    />
                    <p className="text-xs text-gray-500 mt-1">NCBA production account to debit</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Debit Account Currency
                    </label>
                    <select
                      value={prodSettings.ncba_ob_debit_account_currency}
                      onChange={(e) => setProdSettings({...prodSettings, ncba_ob_debit_account_currency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Currency for debit account</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Country
                    </label>
                    <input
                      type="text"
                      value={prodSettings.ncba_ob_country}
                      onChange={(e) => setProdSettings({...prodSettings, ncba_ob_country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Kenya"
                    />
                    <p className="text-xs text-gray-500 mt-1">Country code</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-md font-medium text-gray-900">Authentication</h3>
                  
                  <PasswordField
                    label="Subscription Key"
                    value={prodSettings.ncba_ob_subscription_key}
                    onChange={(value) => setProdSettings({...prodSettings, ncba_ob_subscription_key: value})}
                    fieldKey="prod_subscription_key"
                    placeholder="Production subscription key"
                    helpText="API subscription key for Production environment"
                  />

                  <PasswordField
                    label="Username (UserID)"
                    value={prodSettings.ncba_ob_username}
                    onChange={(value) => setProdSettings({...prodSettings, ncba_ob_username: value})}
                    fieldKey="prod_username"
                    placeholder="Your NCBA production userID"
                    helpText="UserID for token generation (used as userID in API)"
                  />

                  <PasswordField
                    label="Password"
                    value={prodSettings.ncba_ob_password}
                    onChange={(value) => setProdSettings({...prodSettings, ncba_ob_password: value})}
                    fieldKey="prod_password"
                    placeholder="Your NCBA production password"
                    helpText="Password for token generation"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Active Environment
                    </label>
                    <select
                      value={obEnvironment}
                      onChange={(e) => setObEnvironment(e.target.value as 'uat' | 'prod')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="uat">UAT/Sandbox</option>
                      <option value="prod">Production</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Which environment to use for API calls</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => saveObSettings('prod')}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Production Settings
                </button>
              </div>
            </div>
              </>
            )}
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
