'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase, supabaseConfig } from '../lib/supabase'
import { dataStore, type Partner, type DisbursementRequest } from '../lib/data'
import NotificationSystem, { useNotifications } from '../components/NotificationSystem'
import { 
  Send, 
  Users, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  Building2,
  Bell,
  Search,
  Filter,
  Calendar
} from 'lucide-react'

// Environment configuration is now checked in useEffect

// Types are now imported from lib/data.ts

export default function Dashboard() {
  const [disbursements, setDisbursements] = useState<DisbursementRequest[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [statsRefresh, setStatsRefresh] = useState(0)
  const [showDisburseForm, setShowDisburseForm] = useState(false)
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [partnerFilter, setPartnerFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('all')
  const [showFilters, setShowFilters] = useState(false)
  
  // Notification system
  const { notifications, addNotification, removeNotification } = useNotifications()
  const [disburseForm, setDisburseForm] = useState({
    amount: '',
    msisdn: '',
    tenant_id: '',
    customer_id: '',
    client_request_id: '',
    partner_id: ''
  })


  useEffect(() => {
    fetchDisbursements()
    fetchPartners()
  }, [])

  const fetchDisbursements = async () => {
    try {
      // Fetch from real Supabase database
      const { data: disbursements, error } = await supabase
        .from('disbursement_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching disbursements from database:', error)
        setDisbursements([])
      } else {
        setDisbursements(disbursements || [])
      }
    } catch (error) {
      console.error('Error fetching disbursements:', error)
      setDisbursements([])
    } finally {
      setLoading(false)
    }
  }

  const fetchPartners = async (retryCount = 0) => {
    try {
      // Fetch from real Supabase database
      const { data: partners, error } = await supabase
        .from('partners')
        .select('*')
        .eq('is_active', true)
        .order('name')

      if (error) {
        console.error('Error fetching partners from database:', error)
        
        // Retry on network errors
        if (retryCount < 3 && (error.message.includes('network') || error.message.includes('fetch'))) {
          console.log(`Retrying partners fetch (attempt ${retryCount + 1})`)
          setTimeout(() => fetchPartners(retryCount + 1), 2000 * (retryCount + 1))
          return
        }
        
        setPartners([])
      } else {
        setPartners(partners || [])
        
        // Set default partner if none selected
        if (partners && partners.length > 0 && !disburseForm.partner_id) {
          setDisburseForm(prev => ({ ...prev, partner_id: partners[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching partners:', error)
      
      // Retry on network errors
      if (retryCount < 3 && (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('ERR_NETWORK'))) {
        console.log(`Retrying partners fetch (attempt ${retryCount + 1})`)
        setTimeout(() => fetchPartners(retryCount + 1), 2000 * (retryCount + 1))
        return
      }
      
      setPartners([])
    }
  }

  const handleDisburse = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get the selected partner from the partners state
    const selectedPartner = partners.find(p => p.id === disburseForm.partner_id)
    if (!selectedPartner) {
      addNotification({
        type: 'error',
        title: 'Partner Required',
        message: 'Please select a partner before submitting the disbursement.'
      })
      return
    }
    
    // Check if partner has M-Pesa configured
    if (!selectedPartner.is_mpesa_configured) {
      addNotification({
        type: 'error',
        title: 'M-Pesa Not Configured',
        message: 'M-Pesa is not configured for this partner. Please contact support.'
      })
      return
    }
    
    // Get the API key from the selected partner
    const apiKey = selectedPartner.api_key
    
    if (!apiKey) {
      addNotification({
        type: 'error',
        title: 'API Key Missing',
        message: 'No API key configured for this partner. Please contact support.'
      })
      return
    }
    
    try {
      // Processing disbursement request

      const response = await fetch('/api/disburse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify({
          ...disburseForm,
          amount: parseFloat(disburseForm.amount),
          client_request_id: disburseForm.client_request_id || `UI-${Date.now()}`,
          tenant_id: disburseForm.tenant_id || 'DEFAULT_TENANT'
        })
      })

      const result = await response.json()
      
      if (result.status === 'accepted') {
        addNotification({
          type: 'success',
          title: 'Disbursement Accepted',
          message: `Disbursement request accepted! ID: ${result.disbursement_id || 'N/A'}. Check the list below for updates.`
        })
        
        // Refresh the disbursements list from database
        await fetchDisbursements()
        // Trigger statistics refresh
        setStatsRefresh(prev => prev + 1)
        
        setDisburseForm({
          amount: '',
          msisdn: '',
          tenant_id: '',
          customer_id: '',
          client_request_id: '',
          partner_id: ''
        })
        setShowDisburseForm(false)
      } else {
        addNotification({
          type: 'error',
          title: 'Disbursement Rejected',
          message: `Disbursement rejected: ${result.error_message || 'Unknown error'} (Code: ${result.error_code || 'N/A'})`
        })
      }
    } catch (error) {
      console.error('Error disbursing:', error)
      addNotification({
        type: 'error',
        title: 'Processing Error',
        message: 'Error processing disbursement request. Please try again.'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />
      case 'accepted':
        return <Activity className="w-4 h-4 text-blue-600" />
      case 'queued':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    return (
      <span className={`status-badge status-${status}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  // Filter disbursements based on search and filter criteria
  const filteredDisbursements = disbursements.filter(disbursement => {
    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesSearch = 
        disbursement.msisdn.toLowerCase().includes(searchLower) ||
        disbursement.customer_id.toLowerCase().includes(searchLower) ||
        (disbursement.transaction_receipt && disbursement.transaction_receipt.toLowerCase().includes(searchLower)) ||
        disbursement.id.toLowerCase().includes(searchLower)
      
      if (!matchesSearch) return false
    }

    // Status filter
    if (statusFilter !== 'all' && disbursement.status !== statusFilter) {
      return false
    }

    // Partner filter
    if (partnerFilter !== 'all') {
      const partner = partners.find(p => p.id === disbursement.partner_id)
      if (!partner || partner.name !== partnerFilter) {
        return false
      }
    }

    // Date filter
    if (dateFilter !== 'all') {
      const disbursementDate = new Date(disbursement.created_at)
      const now = new Date()
      
      switch (dateFilter) {
        case 'today':
          if (disbursementDate.toDateString() !== now.toDateString()) return false
          break
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          if (disbursementDate < weekAgo) return false
          break
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          if (disbursementDate < monthAgo) return false
          break
      }
    }

    return true
  })

  // Get unique partner names for filter
  const partnerNames = Array.from(new Set(partners.map(p => p.name))).sort()

  // Get real-time statistics from database
  const stats = {
    total: disbursements.length,
    success: disbursements.filter(d => d.status === 'success').length,
    failed: disbursements.filter(d => d.status === 'failed').length,
    pending: disbursements.filter(d => d.status === 'accepted').length,
    totalAmount: disbursements.reduce((sum, d) => sum + d.amount, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-primary-100 rounded-lg">
              <Send className="w-6 h-6 text-primary-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Disbursements</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Successful</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.success}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Failed</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.failed}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Disbursement Requests</h2>
        <div className="flex space-x-4">
          <div className="flex space-x-3">
            <a
              href="/partners"
              className="btn bg-green-600 hover:bg-green-700 text-white"
            >
              <Building2 className="w-4 h-4 mr-2" />
              Manage Partners
            </a>
            <a
              href="/balance-monitoring"
              className="btn bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Bell className="w-4 h-4 mr-2" />
              Balance Monitoring
            </a>
          </div>
          <button
            onClick={fetchDisbursements}
            className="btn btn-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={() => setShowDisburseForm(true)}
            className="btn btn-primary"
          >
            <Send className="w-4 h-4 mr-2" />
            New Disbursement
          </button>
        </div>
      </div>

      {/* Disbursement Form Modal */}
      {showDisburseForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Create Disbursement</h3>
            <form onSubmit={handleDisburse} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount (KES)
                </label>
                <input
                  type="number"
                  value={disburseForm.amount}
                  onChange={(e) => setDisburseForm({...disburseForm, amount: e.target.value})}
                  className="input"
                  placeholder="1200"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={disburseForm.msisdn}
                  onChange={(e) => setDisburseForm({...disburseForm, msisdn: e.target.value})}
                  className="input"
                  placeholder="2547XXXXXXXX"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner Organization
                </label>
                <select
                  value={disburseForm.partner_id}
                  onChange={(e) => setDisburseForm({...disburseForm, partner_id: e.target.value})}
                  className="input"
                  required
                >
                  <option value="">Select a partner</option>
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name} (Short Code: {partner.mpesa_shortcode})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer ID
                </label>
                <input
                  type="text"
                  value={disburseForm.customer_id}
                  onChange={(e) => setDisburseForm({...disburseForm, customer_id: e.target.value})}
                  className="input"
                  placeholder="CUST456"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request ID (optional)
                </label>
                <input
                  type="text"
                  value={disburseForm.client_request_id}
                  onChange={(e) => setDisburseForm({...disburseForm, client_request_id: e.target.value})}
                  className="input"
                  placeholder="Auto-generated if empty"
                />
              </div>
              
              <div className="flex space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDisburseForm(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1"
                >
                  Send Disbursement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filter Controls */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search by phone, customer ID, receipt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Filter Toggle Button */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
              {showFilters ? ' ↑' : ' ↓'}
            </button>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600">
            Showing {filteredDisbursements.length} of {disbursements.length} transactions
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                </select>
              </div>

              {/* Partner Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner
                </label>
                <select
                  value={partnerFilter}
                  onChange={(e) => setPartnerFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Partners</option>
                  {partnerNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date Range
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">All Time</option>
                  <option value="today">Today</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                </select>
              </div>
            </div>

            {/* Clear Filters Button */}
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                  setPartnerFilter('all')
                  setDateFilter('all')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Disbursements Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Phone
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner / Short Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction Receipt
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  M-Pesa Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDisbursements.length > 0 ? (
                filteredDisbursements.map((disbursement) => (
                  <tr key={disbursement.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(disbursement.status)}
                        <span className="ml-2">
                          {getStatusBadge(disbursement.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      KES {disbursement.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disbursement.msisdn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disbursement.customer_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {partners.find(p => p.id === disbursement.partner_shortcode_id)?.name || 'Unknown'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {disbursement.mpesa_shortcode || '-'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {disbursement.transaction_receipt || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col">
                        {disbursement.mpesa_working_account_balance !== null && (
                          <span className="text-xs">
                            Working: KES {disbursement.mpesa_working_account_balance?.toLocaleString() || 'N/A'}
                          </span>
                        )}
                        {disbursement.mpesa_utility_account_balance !== null && (
                          <span className="text-xs text-gray-500">
                            Utility: KES {disbursement.mpesa_utility_account_balance?.toLocaleString() || 'N/A'}
                          </span>
                        )}
                        {disbursement.mpesa_charges_account_balance !== null && (
                          <span className="text-xs text-gray-500">
                            Charges: KES {disbursement.mpesa_charges_account_balance?.toLocaleString() || 'N/A'}
                          </span>
                        )}
                        {!disbursement.mpesa_working_account_balance && 
                         !disbursement.mpesa_utility_account_balance && 
                         !disbursement.mpesa_charges_account_balance && (
                          <span className="text-xs text-gray-400">No balance data</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(disbursement.created_at), 'MMM dd, yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <Search className="w-12 h-12 text-gray-400 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
                      <p className="text-gray-500 mb-4">
                        {searchTerm || statusFilter !== 'all' || partnerFilter !== 'all' || dateFilter !== 'all'
                          ? 'Try adjusting your search criteria or filters.'
                          : 'No transactions have been processed yet.'}
                      </p>
                      {(searchTerm || statusFilter !== 'all' || partnerFilter !== 'all' || dateFilter !== 'all') && (
                        <button
                          onClick={() => {
                            setSearchTerm('')
                            setStatusFilter('all')
                            setPartnerFilter('all')
                            setDateFilter('all')
                          }}
                          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          Clear Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
