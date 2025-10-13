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
  // Additional properties for sync functionality
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
  const [syncSettings, setSyncSettings] = useState<Record<string, any>>({})
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  
  // Notification system
  const { notifications, addNotification, removeNotification } = useNotifications()

  // Fetch tenants data with real balances
  const fetchTenants = async () => {
    try {
      // Fetch official balance data from single source of truth
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
              // Use standardized balance data structure
              currentBalance = partner.balance_data.utility_balance || 0
              lastBalance = partner.balance_data.working_balance || 0
              lastChecked = partner.balance_data.last_updated
              
              // Use balance status from API (already calculated)
              status = partner.balance_data.balance_status || 'healthy'
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
              // Enhanced balance data with freshness and source info
              balance_data: partner.balance_data ? {
                ...partner.balance_data,
                data_freshness: partner.data_freshness,
                data_source: partner.balance_data.data_source,
                balance_status: partner.balance_data.balance_status
              } : null,
              // Additional metadata
              has_balance_data: partner.has_balance_data,
              data_freshness: partner.data_freshness,
              last_balance_update: partner.last_balance_update
            }
          })

          setTenants(tenantsWithBalances)
          
          // Show data freshness summary
          const freshCount = data.metadata.fresh_data_count
          const staleCount = data.metadata.stale_data_count
          if (staleCount > 0) {
            addNotification({
              type: 'warning',
              title: 'Balance Data Status',
              message: `${staleCount} partner(s) have stale balance data. Consider refreshing balances.`,
              duration: NOTIFICATION_DURATION.MEDIUM
            })
          }
        }
      } else {
        addNotification({
          type: 'error',
          title: 'Failed to Load Balance Data',
          message: `Unable to fetch balance information (${response.status})`,
          duration: NOTIFICATION_DURATION.MEDIUM
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Connection Error',
        message: 'Unable to connect to balance monitoring service',
        duration: NOTIFICATION_DURATION.MEDIUM
      })
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
      // Silently handle config fetch errors
    }
  }

  // Fetch partner sync settings
  const fetchSyncSettings = async () => {
    try {
      const response = await fetch('/api/balance/partner-settings')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.partners) {
          const settingsMap: Record<string, any> = {}
          data.partners.forEach((partner: any) => {
            settingsMap[partner.id] = {
              ...partner.sync_status,
              sync_logs: partner.sync_logs
            }
          })
          setSyncSettings(settingsMap)
          
          // Check if any partner has auto sync enabled
          const hasAutoSync = data.partners.some((p: any) => p.auto_sync_enabled)
          setAutoSyncEnabled(hasAutoSync)
        }
      }
    } catch (error) {
      // Silently handle sync settings fetch errors
    }
  }

  // Update partner sync settings
  const updateSyncSettings = async (partnerId: string, settings: any) => {
    try {
      const response = await fetch('/api/balance/partner-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: partnerId,
          ...settings
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          addNotification({
            type: 'success',
            title: 'Sync Settings Updated',
            message: 'Partner balance sync settings updated successfully',
            duration: NOTIFICATION_DURATION.SHORT
          })
          // Refresh sync settings
          await fetchSyncSettings()
        }
      } else {
        const errorData = await response.json()
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message: errorData.error || 'Failed to update sync settings',
          duration: NOTIFICATION_DURATION.MEDIUM
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Update Error',
        message: 'An error occurred while updating sync settings',
        duration: NOTIFICATION_DURATION.MEDIUM
      })
    }
  }

  // Trigger manual sync for a specific partner
  const triggerPartnerSync = async (partnerId: string) => {
    try {
      const response = await fetch('/api/balance/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          partner_id: partnerId,
          sync_mode: 'manual',
          force_sync: true
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          addNotification({
            type: 'success',
            title: 'Sync Triggered',
            message: 'Balance synchronization started for this partner',
            duration: NOTIFICATION_DURATION.SHORT
          })
          // Refresh data after sync
          setTimeout(() => {
            fetchTenants()
            fetchSyncSettings()
          }, 5000)
        }
      } else {
        const errorData = await response.json()
        addNotification({
          type: 'error',
          title: 'Sync Failed',
          message: errorData.error || 'Failed to trigger balance sync',
          duration: NOTIFICATION_DURATION.MEDIUM
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Sync Error',
        message: 'An error occurred while triggering balance sync',
        duration: NOTIFICATION_DURATION.MEDIUM
      })
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
      // Trigger balance checks for all tenants
      
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
        // Balance checks triggered successfully
        return result
      } else {
        const errorData = await response.json()
        // Failed to trigger balance checks
        return { success: false, error: errorData.error }
      }
    } catch (error: any) {
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
      // Starting real-time balance check process
      addNotification({
        type: 'info',
        title: 'Balance Refresh Started',
        message: 'Triggering real-time balance checks for all partners...',
        duration: 3000
      })
      
      // Use the new official balance API for refresh
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
        
        // Show success message
        if (successful > 0) {
            addNotification({
              type: 'success',
              title: 'Balance Check Completed',
              message: `Successfully checked ${successful}/${total} partner balances`,
              duration: 5000
            })
        }
        
        // Wait for balance checks to complete, then fetch updated data
        setTimeout(async () => {
          await fetchTenants()
          setLastRefresh(new Date())
          setIsLoading(false)
        }, 3000) // Wait 3 seconds for balance checks to complete
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

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchTenants(),
        fetchSyncSettings()
      ])
      setIsLoading(false)
    }
    loadData()
  }, [])

  // Auto-refresh for real-time monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTenants()
      setLastRefresh(new Date())
    }, AUTO_REFRESH_INTERVALS.BALANCE_MONITORING)

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

  // formatCurrency is now imported from lib/utils

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
    <div className="space-y-6">
      {/* Status Bar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
              <div>
              <h2 className="text-lg font-semibold text-gray-900">Tenant Monitoring Center</h2>
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
            <button
              onClick={() => {
                const syncUrl = new URL('/api/balance/sync', window.location.origin)
                syncUrl.searchParams.set('mode', 'auto')
                fetch(syncUrl.toString(), { method: 'GET' })
                  .then(response => response.json())
                  .then(data => {
                    if (data.success) {
                      addNotification({
                        type: 'success',
                        title: 'Auto Sync Triggered',
                        message: `Synchronized ${data.summary.successful} partners`,
                        duration: NOTIFICATION_DURATION.SHORT
                      })
                      fetchTenants()
                      fetchSyncSettings()
                    }
                  })
                  .catch(error => {
                    addNotification({
                      type: 'error',
                      title: 'Auto Sync Failed',
                      message: 'Failed to trigger automatic synchronization',
                      duration: NOTIFICATION_DURATION.MEDIUM
                    })
                  })
              }}
              disabled={isLoading}
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              title="Trigger automatic balance synchronization based on partner settings"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Auto Sync
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="w-full">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
            <h2 className="text-lg font-semibold text-gray-900">Real-Time Balance Monitoring</h2>
            <p className="text-sm text-gray-600">Live balance data from M-Pesa accounts • Click on any tenant to configure monitoring settings</p>
              </div>
              {tenants.length > 0 && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-600">
                      Fresh: {tenants.filter(t => t.data_freshness === 'fresh').length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-gray-600">
                      Recent: {tenants.filter(t => t.data_freshness === 'recent').length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                    <span className="text-gray-600">
                      Stale: {tenants.filter(t => t.data_freshness === 'stale').length}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {lastRefresh && (
              <div className="mt-2 text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </div>
            )}
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
                          <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getFreshnessColorClass(tenant.data_freshness || 'stale')}`}>
                                {tenant.data_freshness === 'fresh' ? 'Fresh' :
                                 tenant.data_freshness === 'recent' ? 'Recent' : 'Stale'}
                              </span>
                              <span className="text-gray-500">
                                {tenant.balance_data.data_source === 'balance_check' ? 'Live Check' : 
                                 tenant.balance_data.data_source === 'transaction' ? 'From Transaction' : 'Unknown'}
                              </span>
                            </div>
                            {(tenant.balance_data as any).utility_balance && (
                              <div className="text-blue-600">
                                Utility: {formatCurrency((tenant.balance_data as any).utility_balance)}
                              </div>
                            )}
                            {(tenant.balance_data as any).working_balance && (
                              <div className="text-green-600">
                                Working: {formatCurrency((tenant.balance_data as any).working_balance)}
                              </div>
                            )}
                            {tenant.last_balance_update && (
                              <div className="text-gray-400">
                                Updated: {new Date(tenant.last_balance_update).toLocaleString()}
                              </div>
                            )}
                            {syncSettings[tenant.id] && (
                              <div className="flex items-center space-x-2 mt-1">
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass(syncSettings[tenant.id]?.sync_enabled ? 'success' : 'disabled')}`}>
                                  {syncSettings[tenant.id].sync_enabled ? 'Sync On' : 'Sync Off'}
                                </span>
                                {syncSettings[tenant.id].auto_sync_enabled && (
                                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getStatusColorClass('pending')}`}>
                                    Auto
                              </span>
                                )}
                              </div>
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColorClass('pending')}`}>
                          <Bell className="w-3 h-3 mr-1" />
                          {tenant.alerts_count || 0}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                          className="text-blue-600 hover:text-blue-900 flex items-center"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          {expandedTenant === tenant.id ? 'Hide' : 'Configure'}
                          {expandedTenant === tenant.id ? <ChevronDown className="w-4 h-4 ml-1" /> : <ChevronRight className="w-4 h-4 ml-1" />}
                        </button>
                          <button
                            onClick={() => triggerPartnerSync(tenant.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                            title="Trigger balance sync for this partner"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        </div>
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
                                
                                {/* Balance Sync Settings */}
                                <div className="md:col-span-2 border-t pt-6">
                                  <h4 className="text-md font-semibold text-gray-900 mb-4">Balance Sync Settings</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Enable Balance Sync
                                      </label>
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={syncSettings[tenant.id]?.sync_enabled || false}
                                          onChange={(e) => updateSyncSettings(tenant.id, { balance_sync_enabled: e.target.checked })}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                          {syncSettings[tenant.id]?.sync_enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Auto Sync
                                      </label>
                                      <div className="flex items-center">
                                        <input
                                          type="checkbox"
                                          checked={syncSettings[tenant.id]?.auto_sync_enabled || false}
                                          onChange={(e) => updateSyncSettings(tenant.id, { auto_sync_enabled: e.target.checked })}
                                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <span className="ml-2 text-sm text-gray-700">
                                          {syncSettings[tenant.id]?.auto_sync_enabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Sync Interval (minutes)
                                      </label>
                                      <input
                                        type="number"
                                        min={SYNC_INTERVALS.MIN}
                                        max={SYNC_INTERVALS.MAX}
                                        value={syncSettings[tenant.id]?.sync_interval || SYNC_INTERVALS.DEFAULT}
                                        onChange={(e) => updateSyncSettings(tenant.id, { balance_sync_interval: parseInt(e.target.value) })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={SYNC_INTERVALS.DEFAULT.toString()}
                                      />
                                    </div>
                                  </div>
                                  
                                  {syncSettings[tenant.id]?.last_sync && (
                                    <div className="mt-4 text-sm text-gray-600">
                                      <p>Last sync: {new Date(syncSettings[tenant.id].last_sync).toLocaleString()}</p>
                                      <p>Next sync: {new Date(syncSettings[tenant.id].next_sync).toLocaleString()}</p>
                                    </div>
                                  )}
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