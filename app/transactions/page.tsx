'use client'

import React, { useState, useEffect } from 'react'
import { 
  RefreshCw, 
  Settings,
  Bell,
  Clock,
  DollarSign,
  Save,
  CheckCircle,
  XCircle,
  Building2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Eye,
  ChevronDown,
  ChevronRight,
  Activity,
  BarChart3,
  Zap,
  History,
  Target,
  Shield,
  Wifi,
  WifiOff
} from 'lucide-react'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'

interface Tenant {
  id: string
  name: string
  short_code: string
  is_active: boolean
  is_mpesa_configured: boolean
  current_balance?: number
  last_balance?: number
  balance_variance?: number
  last_checked?: string
  status?: 'healthy' | 'warning' | 'critical'
  alerts_count?: number
  balance_data?: {
    balance_after?: number
    utility_account_balance?: number
    balance_before?: number
    last_updated?: string
    status?: string
  }
}

interface TenantConfig {
  id: string
  partner_id: string
  balance_threshold: number
  variance_threshold: number
  variance_drop_threshold: number
  check_interval_minutes: number
  slack_webhook_url: string
  slack_channel: string
  is_enabled: boolean
  last_checked_at: string
}

export default function TransactionMonitoringPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [configs, setConfigs] = useState<Record<string, TenantConfig>>({})
  const [isSaving, setIsSaving] = useState(false)
  
  // Notification system
  const { notifications, addNotification, removeNotification } = useNotifications()

  // Fetch tenants data with real balances
  const fetchTenants = async () => {
    try {
      // Fetch all tenant balances in one API call
      const response = await fetch('/api/balance/tenant-balances')
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.tenants) {
          const tenantsWithBalances = data.tenants.map((tenant: any) => {
            let currentBalance = 0
            let lastBalance = 0
            let lastChecked = null
            let status: 'healthy' | 'warning' | 'critical' = 'healthy'
            
            // Debug logging
            console.log(`🔍 [Frontend] Processing tenant: ${tenant.name}`, {
              balance_data: tenant.balance_data,
              hasBalanceData: !!tenant.balance_data
            })
            
            if (tenant.balance_data) {
              // Use utility account balance as the primary balance
              currentBalance = tenant.balance_data.utility_balance || tenant.balance_data.balance_after || 0
              lastBalance = tenant.balance_data.working_balance || tenant.balance_data.balance_before || 0
              lastChecked = tenant.balance_data.last_updated
              
              console.log(`💰 [Frontend] Balance data for ${tenant.name}:`, {
                currentBalance,
                lastBalance,
                lastChecked,
                utility_balance: tenant.balance_data.utility_balance,
                working_balance: tenant.balance_data.working_balance,
                balance_after: tenant.balance_data.balance_after,
                balance_before: tenant.balance_data.balance_before
              })
              
              // Determine status based on utility account balance
              if (currentBalance < 1000) {
                status = 'critical'
              } else if (currentBalance < 5000) {
                status = 'warning'
              }
            }

            const variance = currentBalance - lastBalance

            return {
              id: tenant.id,
              name: tenant.name,
              short_code: tenant.short_code,
              is_active: true,
              is_mpesa_configured: true,
              current_balance: currentBalance,
              last_balance: lastBalance,
              balance_variance: variance,
              last_checked: lastChecked,
              status,
              alerts_count: 0, // TODO: Fetch from balance_alerts table
              balance_data: {
                ...tenant.balance_data,
                source: tenant.balance_data.source || 'balance_requests'
              }
            }
          })

          setTenants(tenantsWithBalances)
        }
      } else {
        console.error('Failed to fetch tenant balances:', response.statusText)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    }
  }

  // Fetch configuration for a tenant
  const fetchTenantConfig = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/balance/monitoring-config?partner_id=${tenantId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.config) {
          setConfigs(prev => ({
            ...prev,
            [tenantId]: {
              id: data.config.id,
              partner_id: data.config.partner_id,
              balance_threshold: data.config.working_account_threshold || 1000,
              variance_threshold: 20, // 20% variance threshold (not used in current system)
              variance_drop_threshold: data.config.variance_drop_threshold || 5000, // Use saved value from database
              check_interval_minutes: data.config.check_interval_minutes || 15,
              slack_webhook_url: data.config.slack_webhook_url || '',
              slack_channel: data.config.slack_channel || '#mpesa-alerts', // Use saved value from database
              is_enabled: data.config.is_enabled || false,
              last_checked_at: data.config.last_checked_at || ''
            }
          }))
        }
      }
    } catch (error) {
      console.error('Error fetching tenant config:', error)
    }
  }

  // Save configuration for a tenant
  const saveTenantConfig = async (tenantId: string, config: Partial<TenantConfig>) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/balance/monitoring-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: tenantId,
          working_account_threshold: config.balance_threshold,
          utility_account_threshold: config.balance_threshold,
          charges_account_threshold: config.balance_threshold,
          variance_drop_threshold: config.variance_drop_threshold,
          check_interval_minutes: config.check_interval_minutes,
          slack_webhook_url: config.slack_webhook_url,
          slack_channel: config.slack_channel,
          is_enabled: config.is_enabled
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setConfigs(prev => ({
            ...prev,
            [tenantId]: { ...prev[tenantId], ...config }
          }))
          
          // Show success notification
          addNotification({
            type: 'success',
            title: 'Configuration Saved',
            message: 'Monitoring configuration has been updated successfully.'
          })
        } else {
          // Show error notification for API error
          addNotification({
            type: 'error',
            title: 'Save Failed',
            message: data.error || 'Failed to save configuration. Please try again.'
          })
        }
      } else {
        // Show error notification for HTTP error
        const errorData = await response.json().catch(() => ({}))
        addNotification({
          type: 'error',
          title: 'Save Failed',
          message: errorData.error || `HTTP ${response.status}: Failed to save configuration.`
        })
      }
    } catch (error) {
      console.error('Error saving tenant config:', error)
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'Network error occurred while saving configuration. Please check your connection and try again.'
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Trigger balance check for all tenants using Edge Function
  const triggerAllBalanceChecks = async () => {
    try {
      console.log('🔄 [UI] Triggering balance checks for all tenants...')
      
      const response = await fetch('/api/balance/trigger-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          all_tenants: true
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('✅ [UI] Balance checks triggered successfully:', result)
        return result
      } else {
        const errorData = await response.json()
        console.error('❌ [UI] Failed to trigger balance checks:', errorData)
        return { success: false, error: errorData.error }
      }
    } catch (error: any) {
      console.error('❌ [UI] Error triggering balance checks:', error)
      return { success: false, error: error.message }
    }
  }

  // Handle refresh - fetch latest data
  const handleRefresh = async () => {
    setIsLoading(true)
    await fetchTenants()
    setLastRefresh(new Date())
    setIsLoading(false)
  }

  // Handle refresh with balance check - trigger new balance checks for all tenants
  const handleRefreshWithCheck = async () => {
    setIsLoading(true)
    
    try {
      console.log('🔄 [UI] Starting real-time balance check process...')
      
      // Trigger balance checks for all tenants via Edge Function
      const result = await triggerAllBalanceChecks()
      
      if (result.success) {
        const successful = result.summary?.successful || 0
        const failed = result.summary?.failed || 0
        const total = result.summary?.total || 0
        
        console.log(`✅ [UI] Balance checks completed: ${successful}/${total} successful, ${failed} failed`)
        
        // Show success message
        if (successful > 0) {
          console.log(`🎉 [UI] Successfully triggered balance checks for ${successful} tenants`)
        }
        
        // Wait for balance checks to complete, then fetch updated data
        // Reduced wait time since we're using force_check
        setTimeout(async () => {
          console.log('🔄 [UI] Fetching updated balance data...')
          await fetchTenants()
          setLastRefresh(new Date())
          setIsLoading(false)
          console.log('✅ [UI] Balance monitoring data refreshed')
        }, 3000) // Wait 3 seconds for balance checks to complete
      } else {
        console.error('❌ [UI] Balance check failed:', result.error)
        setIsLoading(false)
        alert(`Failed to trigger balance checks: ${result.error}`)
      }
    } catch (error: any) {
      console.error('❌ [UI] Error in balance check process:', error)
      setIsLoading(false)
      alert(`Error triggering balance checks: ${error.message}`)
    }
  }

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await fetchTenants()
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Auto-refresh every 30 seconds for real-time monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 [Auto-refresh] Fetching latest tenant data...')
      fetchTenants()
      setLastRefresh(new Date())
    }, 30000) // 30 seconds

    return () => clearInterval(interval)
  }, [])

  // Load config when tenant is expanded
  useEffect(() => {
    if (expandedTenant && !configs[expandedTenant]) {
      fetchTenantConfig(expandedTenant)
    }
  }, [expandedTenant, configs])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100'
      case 'warning': return 'text-yellow-600 bg-yellow-100'
      case 'critical': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4" />
      case 'warning': return <AlertTriangle className="w-4 h-4" />
      case 'critical': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatVariance = (variance: number) => {
    const isPositive = variance >= 0
    return (
      <span className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {formatCurrency(Math.abs(variance))}
      </span>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tenant monitoring data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Tenant Monitoring Center</h1>
                <p className="text-sm text-gray-600">Real-time balance monitoring and alerts for all tenants</p>
                <div className="flex items-center mt-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs text-green-600 font-medium">Live Monitoring Active</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
              <button
                onClick={handleRefreshWithCheck}
                disabled={isLoading}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 shadow-sm"
                title="Trigger real-time balance checks for all tenants using M-Pesa Edge Functions"
              >
                <Zap className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading ? 'Checking Balances...' : 'Check All Balances'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Real-Time Balance Monitoring</h2>
            <p className="text-sm text-gray-600">Live balance data from M-Pesa accounts • Click on any tenant to configure monitoring settings</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M-Pesa Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance Change
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Health Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alerts
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <React.Fragment key={tenant.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="p-2 bg-gray-100 rounded-lg mr-3">
                            <Building2 className="w-4 h-4 text-gray-600" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                            <div className="text-sm text-gray-500">ID: {tenant.short_code}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {tenant.current_balance && tenant.current_balance > 0 ? formatCurrency(tenant.current_balance) : 'N/A'}
                        </div>
                        {tenant.balance_data && (
                          <div className="text-xs text-gray-500">
                            {(tenant.balance_data as any).source === 'disbursement_requests' ? 'From Transaction' : 'From Balance Check'}
                            {(tenant.balance_data as any).utility_balance && (
                              <span className="ml-2 text-blue-600">
                                Utility: {formatCurrency((tenant.balance_data as any).utility_balance)}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tenant.balance_variance !== undefined ? formatVariance(tenant.balance_variance) : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(tenant.status || 'healthy')}`}>
                          {getStatusIcon(tenant.status || 'healthy')}
                          <span className="ml-1 capitalize">{tenant.status || 'healthy'}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {tenant.last_checked ? new Date(tenant.last_checked).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Bell className="w-3 h-3 mr-1" />
                          {tenant.alerts_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {expandedTenant === tenant.id ? 'Hide' : 'Configure'}
                          {expandedTenant === tenant.id ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                        </button>
                      </td>
                    </tr>
                    
                    {/* Expanded Configuration Row */}
                    {expandedTenant === tenant.id && (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="bg-white rounded-lg border p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Monitoring Configuration</h3>
                            
                            {configs[tenant.id] ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Balance Threshold (KES)
                                  </label>
                                  <input
                                    type="number"
                                    value={configs[tenant.id].balance_threshold}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                                      [tenant.id]: {
                                        ...prev[tenant.id],
                                        balance_threshold: parseFloat(e.target.value)
                                      }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="1000"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Alert when balance drops below this amount</p>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Variance Drop Threshold (KES)
                                  </label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={configs[tenant.id].variance_drop_threshold}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                                      [tenant.id]: {
                                        ...prev[tenant.id],
                                        variance_drop_threshold: parseFloat(e.target.value)
                                      }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="5000"
                                  />
                                  <p className="text-xs text-gray-500 mt-1">Alert when balance drops by this amount</p>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Check Interval (minutes)
                                  </label>
                                  <select
                                    value={configs[tenant.id].check_interval_minutes}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                                      [tenant.id]: {
                                        ...prev[tenant.id],
                                        check_interval_minutes: parseInt(e.target.value)
                                      }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                  >
                                    <option value={5}>5 minutes</option>
                                    <option value={15}>15 minutes</option>
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>1 hour</option>
                                  </select>
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Slack Webhook URL
                                  </label>
                                  <input
                                    type="url"
                                    value={configs[tenant.id].slack_webhook_url}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                                      [tenant.id]: {
                                        ...prev[tenant.id],
                                        slack_webhook_url: e.target.value
                                      }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="https://hooks.slack.com/services/..."
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Slack Channel
                                  </label>
                                  <input
                                    type="text"
                                    value={configs[tenant.id].slack_channel}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                                      [tenant.id]: {
                                        ...prev[tenant.id],
                                        slack_channel: e.target.value
                                      }
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="#alerts"
                                  />
                                </div>
                                
                                <div className="md:col-span-2">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                                      id={`enabled-${tenant.id}`}
                                      checked={configs[tenant.id].is_enabled}
                                      onChange={(e) => setConfigs(prev => ({
                                        ...prev,
                                        [tenant.id]: {
                                          ...prev[tenant.id],
                                          is_enabled: e.target.checked
                                        }
                                      }))}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor={`enabled-${tenant.id}`} className="ml-2 block text-sm text-gray-700">
                                      Enable monitoring for this tenant
                                    </label>
                                  </div>
                                </div>
                                
                                <div className="md:col-span-2 flex justify-end">
                                  <button
                                    onClick={() => saveTenantConfig(tenant.id, configs[tenant.id])}
                                    disabled={isSaving}
                                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save Configuration'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="text-center py-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                <p className="text-gray-600">Loading configuration...</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
    </div>
  )
}