'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  RefreshCw,
  Building2,
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  Settings,
  Download,
  Filter,
  Search,
  X
} from 'lucide-react'

interface PartnerCharge {
  id: string
  partner_id: string
  partner_name: string
  partner_active: boolean
  charge_type: string
  charge_name: string
  charge_amount: number
  charge_percentage?: number
  minimum_charge?: number
  maximum_charge?: number
  is_active: boolean
  is_automatic: boolean
  charge_frequency: string
  description?: string
  created_at: string
  updated_at: string
  total_transactions: number
  total_amount_collected: number
  completed_transactions: number
  pending_transactions: number
  failed_transactions: number
  today_transactions: number
  today_amount: number
}

interface ChargeFormData {
  partner_id: string
  charge_type: string
  charge_name: string
  charge_amount: number
  charge_percentage?: number
  minimum_charge?: number
  maximum_charge?: number
  is_active: boolean
  is_automatic: boolean
  charge_frequency: string
  description: string
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

export default function PartnerChargesPage() {
  const [charges, setCharges] = useState<PartnerCharge[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingCharge, setEditingCharge] = useState<PartnerCharge | null>(null)
  const [formData, setFormData] = useState<ChargeFormData>({
    partner_id: '',
    charge_type: '',
    charge_name: '',
    charge_amount: 0,
    charge_percentage: undefined,
    minimum_charge: undefined,
    maximum_charge: undefined,
    is_active: true,
    is_automatic: true,
    charge_frequency: 'per_transaction',
    description: ''
  })
  const [filters, setFilters] = useState({
    partner_id: '',
    charge_type: '',
    is_active: ''
  })
  const [toasts, setToasts] = useState<Toast[]>([])

  // Toast functions
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }
    setToasts(prev => [...prev, newToast])
    
    // Auto remove toast after duration
    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  const showSuccess = (title: string, message: string) => {
    addToast({ type: 'success', title, message })
  }

  const showError = (title: string, message: string) => {
    addToast({ type: 'error', title, message })
  }

  const showWarning = (title: string, message: string) => {
    addToast({ type: 'warning', title, message })
  }

  const showInfo = (title: string, message: string) => {
    addToast({ type: 'info', title, message })
  }

  useEffect(() => {
    loadCharges()
    loadPartners()
  }, [filters])

  const loadCharges = async (showToast = false) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.partner_id) params.append('partner_id', filters.partner_id)
      if (filters.charge_type) params.append('charge_type', filters.charge_type)
      if (filters.is_active !== '') params.append('is_active', filters.is_active)

      const response = await fetch(`/api/admin/partner-charges?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCharges(data.data || [])
        if (showToast) {
          showSuccess('Data Refreshed', `Loaded ${data.data?.length || 0} charge configurations`)
        }
      } else {
        if (showToast) {
          showError('Load Failed', 'Failed to refresh charge data')
        }
      }
    } catch (error) {
      console.error('Failed to load charges:', error)
      if (showToast) {
        showError('Network Error', 'Failed to load charges. Please check your connection.')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadPartners = async () => {
    try {
      const response = await fetch('/api/admin/wallets/partners')
      if (response.ok) {
        const data = await response.json()
        setPartners(data.data || [])
      }
    } catch (error) {
      console.error('Failed to load partners:', error)
    }
  }

  const handleCreateCharge = async () => {
    if (!formData.partner_id || !formData.charge_type || !formData.charge_name) {
      showError('Validation Error', 'Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/admin/partner-charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        showSuccess('Success', result.message || 'Charge configuration saved successfully!')
        setShowCreateModal(false)
        resetForm()
        loadCharges()
      } else {
        const error = await response.json()
        showError('Save Failed', `Failed to save charge: ${error.error}`)
      }
    } catch (error) {
      console.error('Create charge error:', error)
      showError('Network Error', 'Failed to create charge. Please check your connection and try again.')
    }
  }

  const handleEditCharge = async () => {
    if (!editingCharge) return

    try {
      const response = await fetch(`/api/admin/partner-charges/${editingCharge.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        showSuccess('Success', 'Charge configuration updated successfully!')
        setShowEditModal(false)
        setEditingCharge(null)
        resetForm()
        loadCharges()
      } else {
        const error = await response.json()
        showError('Update Failed', `Failed to update charge: ${error.error}`)
      }
    } catch (error) {
      console.error('Update charge error:', error)
      showError('Network Error', 'Failed to update charge. Please check your connection and try again.')
    }
  }

  const handleDeleteCharge = async (chargeId: string) => {
    // Show confirmation dialog with toast
    showWarning('Confirm Delete', 'Are you sure you want to delete this charge configuration?')
    
    // For now, we'll use a simple confirm dialog, but this could be enhanced with a custom modal
    if (!confirm('Are you sure you want to delete this charge configuration?')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/partner-charges/${chargeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        showSuccess('Success', 'Charge configuration deleted successfully!')
        loadCharges()
      } else {
        const error = await response.json()
        showError('Delete Failed', `Failed to delete charge: ${error.error}`)
      }
    } catch (error) {
      console.error('Delete charge error:', error)
      showError('Network Error', 'Failed to delete charge. Please check your connection and try again.')
    }
  }

  const resetForm = () => {
    setFormData({
      partner_id: '',
      charge_type: '',
      charge_name: '',
      charge_amount: 0,
      charge_percentage: undefined,
      minimum_charge: undefined,
      maximum_charge: undefined,
      is_active: true,
      is_automatic: true,
      charge_frequency: 'per_transaction',
      description: ''
    })
  }

  const openEditModal = (charge: PartnerCharge) => {
    setEditingCharge(charge)
    setFormData({
      partner_id: charge.partner_id,
      charge_type: charge.charge_type,
      charge_name: charge.charge_name,
      charge_amount: charge.charge_amount,
      charge_percentage: charge.charge_percentage,
      minimum_charge: charge.minimum_charge,
      maximum_charge: charge.maximum_charge,
      is_active: charge.is_active,
      is_automatic: charge.is_automatic,
      charge_frequency: charge.charge_frequency,
      description: charge.description || ''
    })
    setShowEditModal(true)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getChargeTypeIcon = (type: string) => {
    switch (type) {
      case 'disbursement':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'float_purchase':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'top_up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'manual_allocation':
        return <Settings className="w-4 h-4 text-purple-600" />
      default:
        return <DollarSign className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  const downloadCSV = () => {
    try {
      const headers = [
        'Partner',
        'Charge Type',
        'Charge Name',
        'Amount',
        'Percentage',
        'Min/Max',
        'Status',
        'Automatic',
        'Total Collected',
        'Transactions',
        'Created'
      ]

      const csvContent = [
        headers.join(','),
        ...charges.map(c => [
          `"${c.partner_name}"`,
          c.charge_type,
          `"${c.charge_name}"`,
          c.charge_amount,
          c.charge_percentage || '',
          `"${c.minimum_charge || ''}/${c.maximum_charge || ''}"`,
          c.is_active ? 'Active' : 'Inactive',
          c.is_automatic ? 'Yes' : 'No',
          c.total_amount_collected || 0,
          c.total_transactions || 0,
          new Date(c.created_at).toLocaleDateString()
        ].join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `partner-charges-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
      
      showSuccess('Export Complete', `Partner charges data exported successfully! (${charges.length} records)`)
    } catch (error) {
      console.error('CSV export error:', error)
      showError('Export Failed', 'Failed to export CSV. Please try again.')
    }
  }

  const totalCollected = charges.reduce((sum, c) => sum + (c.total_amount_collected || 0), 0)
  const totalTransactions = charges.reduce((sum, c) => sum + (c.total_transactions || 0), 0)
  const activeCharges = charges.filter(c => c.is_active).length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading partner charges...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Partner Charges Management</h1>
                <p className="text-sm text-gray-500">Manage partner-specific charges and fees</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={downloadCSV}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Charge
              </button>
              <button
                onClick={() => loadCharges(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Collected</p>
              <p className="text-3xl font-bold text-gray-900">{formatAmount(totalCollected)}</p>
            </div>
            <DollarSign className="h-12 w-12 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Charges</p>
              <p className="text-3xl font-bold text-gray-900">{charges.length}</p>
              <p className="text-sm text-gray-500">{activeCharges} active</p>
            </div>
            <Settings className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{totalTransactions}</p>
              <p className="text-sm text-gray-500">Charge transactions</p>
            </div>
            <TrendingUp className="h-12 w-12 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Avg per Charge</p>
              <p className="text-3xl font-bold text-gray-900">
                {charges.length > 0 ? formatAmount(totalCollected / charges.length) : 'KSh 0'}
              </p>
              <p className="text-sm text-gray-500">Per configuration</p>
            </div>
            <Building2 className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg mb-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Filters</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Partner</label>
              <select
                value={filters.partner_id}
                onChange={(e) => setFilters(prev => ({ ...prev, partner_id: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Partners</option>
                {partners.map(partner => (
                  <option key={partner.partner_id} value={partner.partner_id}>{partner.partner_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Charge Type</label>
              <select
                value={filters.charge_type}
                onChange={(e) => setFilters(prev => ({ ...prev, charge_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="disbursement">Disbursement</option>
                <option value="float_purchase">Float Purchase</option>
                <option value="top_up">Top Up</option>
                <option value="manual_allocation">Manual Allocation</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filters.is_active}
                onChange={(e) => setFilters(prev => ({ ...prev, is_active: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Charges Table */}
      <div className="bg-white shadow rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charge Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statistics
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {charges.map((charge, index) => (
                <tr key={charge.id || `charge-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Building2 className="h-8 w-8 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {charge.partner_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {charge.partner_active ? 'Active Partner' : 'Inactive Partner'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getChargeTypeIcon(charge.charge_type)}
                      <div className="ml-2">
                        <div className="text-sm font-medium text-gray-900">
                          {charge.charge_name}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {charge.charge_type.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatAmount(charge.charge_amount)}
                    </div>
                    {charge.charge_percentage && (
                      <div className="text-sm text-gray-500">
                        + {charge.charge_percentage}%
                      </div>
                    )}
                    {(charge.minimum_charge || charge.maximum_charge) && (
                      <div className="text-xs text-gray-500">
                        Min: {charge.minimum_charge ? formatAmount(charge.minimum_charge) : 'N/A'} | 
                        Max: {charge.maximum_charge ? formatAmount(charge.maximum_charge) : 'N/A'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(charge.is_active)}`}>
                        {charge.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <div className="text-xs text-gray-500">
                        {charge.is_automatic ? 'Auto-deduct' : 'Manual'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>Total: {formatAmount(charge.total_amount_collected || 0)}</div>
                    <div>Transactions: {charge.total_transactions || 0}</div>
                    <div>Today: {charge.today_transactions || 0} ({formatAmount(charge.today_amount || 0)})</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openEditModal(charge)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCharge(charge.id)}
                        className="text-red-600 hover:text-red-900 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {charges.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No charge configurations found</h3>
            <p className="text-gray-500">Create your first charge configuration to get started.</p>
          </div>
        )}
      </div>

      {/* Create Charge Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create/Update Charge Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner *</label>
                  <select
                    value={formData.partner_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, partner_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Partner</option>
                    {partners.map(partner => (
                      <option key={partner.partner_id} value={partner.partner_id}>{partner.partner_name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Type *</label>
                  <select
                    value={formData.charge_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select Type</option>
                    <option value="disbursement">Disbursement</option>
                    <option value="float_purchase">Float Purchase</option>
                    <option value="top_up">Top Up</option>
                    <option value="manual_allocation">Manual Allocation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Name *</label>
                  <input
                    type="text"
                    value={formData.charge_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., M-Pesa B2C Fee"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Amount (KES)</label>
                  <input
                    type="number"
                    value={formData.charge_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Percentage (%)</label>
                  <input
                    type="number"
                    value={formData.charge_percentage || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_percentage: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                    <input
                      type="number"
                      value={formData.minimum_charge || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_charge: parseFloat(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                    <input
                      type="number"
                      value={formData.maximum_charge || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, maximum_charge: parseFloat(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Optional"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional description"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_automatic}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_automatic: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Auto-deduct</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateCharge}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Create Charge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Charge Modal */}
      {showEditModal && editingCharge && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Charge Configuration</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Partner</label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                    {editingCharge.partner_name}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Type</label>
                  <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 capitalize">
                    {editingCharge.charge_type.replace('_', ' ')}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Name *</label>
                  <input
                    type="text"
                    value={formData.charge_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Amount (KES)</label>
                  <input
                    type="number"
                    value={formData.charge_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Charge Percentage (%)</label>
                  <input
                    type="number"
                    value={formData.charge_percentage || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, charge_percentage: parseFloat(e.target.value) || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
                    <input
                      type="number"
                      value={formData.minimum_charge || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, minimum_charge: parseFloat(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
                    <input
                      type="number"
                      value={formData.maximum_charge || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, maximum_charge: parseFloat(e.target.value) || undefined }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Active</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_automatic}
                      onChange={(e) => setFormData(prev => ({ ...prev, is_automatic: e.target.checked }))}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Auto-deduct</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingCharge(null)
                    resetForm()
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditCharge}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Update Charge
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              max-w-sm w-full bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden
              transform transition-all duration-300 ease-in-out
              ${toast.type === 'success' ? 'border-l-4 border-green-500' : ''}
              ${toast.type === 'error' ? 'border-l-4 border-red-500' : ''}
              ${toast.type === 'warning' ? 'border-l-4 border-yellow-500' : ''}
              ${toast.type === 'info' ? 'border-l-4 border-blue-500' : ''}
            `}
          >
            <div className="p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  {toast.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500" />}
                  {toast.type === 'warning' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                  {toast.type === 'info' && <AlertCircle className="h-5 w-5 text-blue-500" />}
                </div>
                <div className="ml-3 w-0 flex-1 pt-0.5">
                  <p className="text-sm font-medium text-gray-900">
                    {toast.title}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    {toast.message}
                  </p>
                </div>
                <div className="ml-4 flex-shrink-0 flex">
                  <button
                    className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    onClick={() => removeToast(toast.id)}
                  >
                    <span className="sr-only">Close</span>
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
