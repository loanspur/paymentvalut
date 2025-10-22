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
import { 
  BALANCE_THRESHOLDS, 
  SYNC_INTERVALS, 
  NOTIFICATION_DURATION, 
  AUTO_REFRESH_INTERVALS 
} from '../../lib/constants'
import { formatCurrency, formatVariance, getStatusColorClass, getFreshnessColorClass } from '../../lib/utils'

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
    data_source?: string
    data_freshness?: string
    balance_status?: string
  }
  has_balance_data?: boolean
  data_freshness?: 'fresh' | 'recent' | 'stale'
  last_balance_update?: string
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
  slack_mentions: string
  is_enabled: boolean
  last_checked_at: string
  // Additional configuration options
  working_account_threshold: number
  utility_account_threshold: number
  charges_account_threshold: number
  notify_on_low_balance: boolean
  notify_on_unusual_drop: boolean
  notify_on_balance_recovery: boolean
  unusual_drop_percentage: number
}

export default function TransactionMonitoringPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [configs, setConfigs] = useState<Record<string, TenantConfig>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [syncSettings, setSyncSettings] = useState<Record<string, any>>({})
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [realtimeStatus, setRealtimeStatus] = useState<any>(null)
  const [isClient, setIsClient] = useState(false)
  
  const { notifications, addNotification, removeNotification } = useNotifications()

  // Single method to fetch real-time status
  const fetchRealtimeStatus = async () => {
    try {
      const response = await fetch('/api/balance/realtime-status')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setRealtimeStatus(data)
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Single method to fetch configurations
  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/balance/monitoring-config')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          const configsMap: Record<string, TenantConfig> = {}
          data.configs.forEach((config: any) => {
            configsMap[config.partner_id] = {
              id: config.id,
              partner_id: config.partner_id,
              balance_threshold: config.balance_threshold || 1000,
              variance_threshold: config.variance_threshold || 5000,
              variance_drop_threshold: config.variance_drop_threshold || 1000,
              check_interval_minutes: config.check_interval_minutes || 15,
              slack_webhook_url: config.slack_webhook_url || '',
              slack_channel: config.slack_channel || '#mpesa-alerts',
              slack_mentions: config.slack_mentions || '',
              is_enabled: config.is_enabled !== false,
              last_checked_at: config.last_checked_at || '',
              // Additional configuration options with defaults
              working_account_threshold: config.working_account_threshold || 1000.00,
              utility_account_threshold: config.utility_account_threshold || 500.00,
              charges_account_threshold: config.charges_account_threshold || 200.00,
              notify_on_low_balance: config.notify_on_low_balance !== false,
              notify_on_unusual_drop: config.notify_on_unusual_drop !== false,
              notify_on_balance_recovery: config.notify_on_balance_recovery !== false,
              unusual_drop_percentage: config.unusual_drop_percentage || 20.00
            }
          })
          setConfigs(configsMap)
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Single method to save configuration
  const handleSaveConfig = async (tenantId: string, config: TenantConfig) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/balance/monitoring-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: tenantId,
          ...config
        }),
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          addNotification({
            type: 'success',
            title: 'Configuration Saved',
            message: 'Partner configuration has been updated successfully.',
            duration: 3000
          })
          // Refresh configurations
          await fetchConfigs()
      } else {
        addNotification({
          type: 'error',
            title: 'Save Failed',
            message: data.error || 'Failed to save configuration',
            duration: 5000
          })
        }
      } else {
        addNotification({
          type: 'error',
          title: 'Save Failed',
          message: 'Failed to save configuration',
          duration: 5000
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Save Failed',
        message: 'An error occurred while saving configuration',
        duration: 5000
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Single method to fetch tenants data
  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/balance/official-balances')
      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.partners) {
          const tenantsWithBalances = data.partners.map((partner: any) => {
            let currentBalance = 0
            let lastBalance = 0
            let lastChecked = null
            let status: 'healthy' | 'warning' | 'critical' = 'healthy'
            
            if (partner.balance_data) {
              // Debug: Log balance data structure for troubleshooting
              console.log(`Balance data for ${partner.name}:`, partner.balance_data)
              
              currentBalance = (partner.balance_data as any).utility_balance || 0
              lastBalance = (partner.balance_data as any).working_balance || 0
              lastChecked = (partner.balance_data as any).last_updated
              status = (partner.balance_data as any).balance_status || 'healthy'
            } else {
              // No balance data available
              currentBalance = 0
              lastBalance = 0
              lastChecked = null
              status = 'critical' // Mark as critical when no data
            }

            const variance = currentBalance - lastBalance

            return {
              id: partner.id,
              name: partner.name,
              short_code: partner.short_code,
              is_active: true,
              is_mpesa_configured: true,
              current_balance: currentBalance,
              last_balance: lastBalance,
              balance_variance: variance,
              last_checked: lastChecked,
              status,
              alerts_count: 0,
              balance_data: partner.balance_data ? {
                ...partner.balance_data,
                data_freshness: partner.data_freshness,
                data_source: partner.balance_data.data_source,
                balance_status: partner.balance_data.balance_status
              } : null,
              has_balance_data: partner.has_balance_data,
              data_freshness: partner.data_freshness,
              last_balance_update: partner.last_balance_update
            }
          })
          
          setTenants(tenantsWithBalances)
        }
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch balance data',
        duration: NOTIFICATION_DURATION.MEDIUM
      })
    }
  }

  // Single method to fetch sync settings
  const fetchSyncSettings = async () => {
    try {
      const response = await fetch('/api/balance/sync')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSyncSettings(data.settings || {})
          setAutoSyncEnabled(data.auto_sync_enabled || false)
        }
      }
    } catch (error) {
      // Silent error handling
    }
  }

  // Single refresh method
  const handleRefresh = async () => {
    setIsLoading(true)
    await fetchTenants()
    setLastRefresh(new Date())
    setIsLoading(false)
  }

  // Single balance check method
  const handleRefreshWithCheck = async () => {
    setIsLoading(true)
    
    try {
      addNotification({
        type: 'info',
        title: 'Balance Check Started',
        message: 'Checking balances for all partners...',
        duration: 5000
      })
      
      const response = await fetch('/api/balance/official-balances', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          force_refresh: true,
          all_tenants: true
        })
      })

      if (response.ok) {
        const result = await response.json()
      
      if (result.success) {
          const triggerResult = result.trigger_result
          const successful = triggerResult?.summary?.successful || 0
          const failed = triggerResult?.summary?.failed || 0
          const total = triggerResult?.summary?.total || 0
        
        if (successful > 0) {
            addNotification({
              type: 'success',
              title: 'Balance Check Completed',
              message: `Successfully checked ${successful}/${total} partner balances`,
              duration: 5000
            })
        }
        
        setTimeout(async () => {
            await Promise.all([
              fetchTenants(),
              fetchRealtimeStatus()
            ])
          setLastRefresh(new Date())
          setIsLoading(false)
            
            addNotification({
              type: 'success',
              title: 'Balance Data Updated',
              message: 'Balance data has been refreshed',
              duration: 5000
            })
          }, 40000)
      } else {
          throw new Error(result.error || 'Failed to trigger balance refresh')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to trigger balance refresh')
      }
    } catch (error: any) {
      setIsLoading(false)
      addNotification({
        type: 'error',
        title: 'Balance Check Error',
        message: error.message || 'An error occurred while checking balances',
        duration: 5000
      })
    }
  }


  // Set client flag on mount
  useEffect(() => {
    setIsClient(true)
  }, [])

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      setLastRefresh(new Date()) // Set initial date only on client side
      await Promise.all([
        fetchTenants(),
        fetchSyncSettings(),
        fetchRealtimeStatus(),
        fetchConfigs()
      ])
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTenants()
      fetchRealtimeStatus()
      setLastRefresh(new Date())
    }, AUTO_REFRESH_INTERVALS.BALANCE_MONITORING)

    return () => clearInterval(interval)
  }, [])


    return (
    <div className="min-h-screen bg-gray-50">
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transaction Monitoring</h1>
              <p className="mt-2 text-gray-600">Real-time balance monitoring and transaction tracking</p>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-sm text-gray-500">
                Last updated: {isClient && lastRefresh ? lastRefresh.toISOString().slice(11, 19) : 'Loading...'}
              </div>
              {realtimeStatus?.statistics && (
                <div className="flex items-center space-x-2 text-xs">
                  {realtimeStatus.statistics.checking > 0 && (
                    <div className="flex items-center space-x-1 text-blue-600">
                      <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
                      <span>{realtimeStatus.statistics.checking} checking</span>
                </div>
                  )}
                  {realtimeStatus.statistics.fresh_data > 0 && (
                    <div className="flex items-center space-x-1 text-green-600">
                      <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      <span>{realtimeStatus.statistics.fresh_data} fresh</span>
              </div>
                  )}
                  {realtimeStatus.statistics.stale_data > 0 && (
                    <div className="flex items-center space-x-1 text-red-600">
                      <div className="w-2 h-2 bg-red-600 rounded-full"></div>
                      <span>{realtimeStatus.statistics.stale_data} stale</span>
            </div>
                  )}
              </div>
              )}
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
                title="Trigger real-time balance checks for all tenants"
              >
                <Zap className={`w-4 h-4 mr-2 ${isLoading ? 'animate-pulse' : ''}`} />
                {isLoading ? 'Checking Balances...' : 'Check All Balances'}
            </button>
          </div>
        </div>
      </div>

        {/* Tenants Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Partner Balances</h2>
              </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Updated
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Building2 className="h-5 w-5 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                          <div className="text-sm text-gray-500">{tenant.short_code}</div>
                          </div>
                        </div>
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {(tenant.balance_data as any)?.utility_balance ? formatCurrency((tenant.balance_data as any).utility_balance) : 
                         tenant.current_balance > 0 ? formatCurrency(tenant.current_balance) : 'No Data'}
                      </div>
                      {(tenant.balance_data as any)?.working_balance && (
                        <div className="text-xs text-gray-500">
                          Working: {formatCurrency((tenant.balance_data as any).working_balance)}
                        </div>
                      )}
                      {(tenant.balance_data as any)?.charges_balance && (
                        <div className="text-xs text-gray-500">
                          Charges: {formatCurrency((tenant.balance_data as any).charges_balance)}
                        </div>
                      )}
                      {tenant.balance_variance !== undefined && ((tenant.balance_data as any)?.utility_balance || tenant.current_balance > 0) && (
                        <div className={`text-sm ${tenant.balance_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {tenant.balance_variance >= 0 ? '+' : ''}{formatCurrency(tenant.balance_variance)}
                        </div>
                      )}
                      {!(tenant.balance_data as any)?.utility_balance && tenant.current_balance === 0 && (
                        <div className="text-sm text-red-600">
                          No balance data available
                        </div>
                      )}
                    </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColorClass(tenant.status || 'healthy')}`}>
                        {tenant.status || 'healthy'}
                        </span>
                      {tenant.data_freshness && (
                        <div className={`text-xs mt-1 ${getFreshnessColorClass(tenant.data_freshness)}`}>
                          {tenant.data_freshness}
                        </div>
                      )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.last_checked ? new Date(tenant.last_checked).toISOString().slice(0, 19).replace('T', ' ') : 'No Data'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                          <button
                          onClick={() => handleRefreshWithCheck()}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          title="Refresh balance"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Expanded Tenant Details */}
        {expandedTenant && configs[expandedTenant] && (
          <div className="mt-6 bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Configuration - {tenants.find(t => t.id === expandedTenant)?.name}
              </h3>
            </div>
            <div className="px-6 py-4">
              {/* Monitoring Settings */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Monitoring Settings</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      Check Interval (minutes)
                                  </label>
                                  <input
                                    type="number"
                      value={configs[expandedTenant].check_interval_minutes}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          check_interval_minutes: parseInt(e.target.value)
                                      }
                                    }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={configs[expandedTenant].is_enabled}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          is_enabled: e.target.checked
                        }
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Enable Monitoring
                    </label>
                  </div>
                </div>
                                </div>
                                
              {/* Balance Thresholds */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Balance Thresholds</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      Working Account Threshold
                                  </label>
                                  <input
                                    type="number"
                      value={configs[expandedTenant].working_account_threshold}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          working_account_threshold: parseFloat(e.target.value)
                                      }
                                    }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Utility Account Threshold
                    </label>
                    <input
                      type="number"
                      value={configs[expandedTenant].utility_account_threshold}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          utility_account_threshold: parseFloat(e.target.value)
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Charges Account Threshold
                    </label>
                    <input
                      type="number"
                      value={configs[expandedTenant].charges_account_threshold}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          charges_account_threshold: parseFloat(e.target.value)
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                                </div>
                                
              {/* Alert Thresholds */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Alert Thresholds</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variance Threshold
                                  </label>
                    <input
                      type="number"
                      value={configs[expandedTenant].variance_threshold}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          variance_threshold: parseFloat(e.target.value)
                                      }
                                    }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variance Drop Threshold
                    </label>
                    <input
                      type="number"
                      value={configs[expandedTenant].variance_drop_threshold}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          variance_drop_threshold: parseFloat(e.target.value)
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Unusual Drop Percentage
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={configs[expandedTenant].unusual_drop_percentage}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          unusual_drop_percentage: parseFloat(e.target.value)
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                                </div>
                                
              {/* Notification Settings */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Notification Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Slack Webhook URL
                                  </label>
                                  <input
                                    type="url"
                      value={configs[expandedTenant].slack_webhook_url}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                                        slack_webhook_url: e.target.value
                                      }
                                    }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Slack Channel
                                  </label>
                                  <input
                                    type="text"
                      value={configs[expandedTenant].slack_channel}
                                    onChange={(e) => setConfigs(prev => ({
                                      ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                                        slack_channel: e.target.value
                                      }
                                    }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Slack Mentions
                    </label>
                    <input
                      type="text"
                      placeholder="@user1 @user2"
                      value={configs[expandedTenant].slack_mentions}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          slack_mentions: e.target.value
                        }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                                </div>
                                
              {/* Notification Preferences */}
              <div className="mb-8">
                <h4 className="text-md font-medium text-gray-900 mb-4">Notification Preferences</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                  <div className="flex items-center">
                                    <input
                                      type="checkbox"
                      checked={configs[expandedTenant].notify_on_low_balance}
                                      onChange={(e) => setConfigs(prev => ({
                                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          notify_on_low_balance: e.target.checked
                                        }
                                      }))}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      Notify on Low Balance
                                    </label>
                                  </div>
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                      checked={configs[expandedTenant].notify_on_unusual_drop}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          notify_on_unusual_drop: e.target.checked
                        }
                      }))}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                    <label className="ml-2 block text-sm text-gray-900">
                      Notify on Unusual Drop
                                      </label>
                  </div>
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                      checked={configs[expandedTenant].notify_on_balance_recovery}
                      onChange={(e) => setConfigs(prev => ({
                        ...prev,
                        [expandedTenant]: {
                          ...prev[expandedTenant],
                          notify_on_balance_recovery: e.target.checked
                        }
                      }))}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                    <label className="ml-2 block text-sm text-gray-900">
                      Notify on Balance Recovery
                                      </label>
                                    </div>
                                  </div>
                                </div>
                                
              <div className="mt-6 flex justify-end">
                                  <button
                  onClick={() => handleSaveConfig(expandedTenant, configs[expandedTenant])}
                                    disabled={isSaving}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    {isSaving ? 'Saving...' : 'Save Configuration'}
                                  </button>
                                </div>
                              </div>
                              </div>
                            )}
                          </div>
    </div>
  )
}
