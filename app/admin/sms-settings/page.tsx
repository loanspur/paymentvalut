'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Settings, MessageSquare, Users, DollarSign } from 'lucide-react'
import { useToast } from '../../../components/ToastSimple'
import { LoadingButton, DangerButton } from '../../../components/LoadingButton'
import { ConfirmationDialog, useConfirmation } from '../../../components/ConfirmationDialog'

export const dynamic = 'force-dynamic'

interface Partner {
  id: string
  name: string
  short_code: string
  is_active: boolean
}

interface SMSSettings {
  id: string
  partner_id: string
  damza_api_key: string
  damza_sender_id: string
  damza_username: string
  damza_password: string
  sms_enabled: boolean
  low_balance_threshold: number
  notification_phone_numbers: string[]
  sms_charge_per_message: number
  partners: Partner
}

export default function SMSSettingsPage() {
  const { addToast } = useToast()
  const { isOpen, config, confirm, handleConfirm, handleClose } = useConfirmation()
  
  const [smsSettings, setSmsSettings] = useState<SMSSettings[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingSettings, setEditingSettings] = useState<SMSSettings | null>(null)
  const [formData, setFormData] = useState({
    partner_id: '',
    damza_api_key: '',
    damza_sender_id: '',
    damza_username: '',
    damza_password: '',
    sms_enabled: true,
    low_balance_threshold: 1000,
    notification_phone_numbers: '',
    sms_charge_per_message: 0.50
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setError(null)
      const [smsResponse, partnersResponse] = await Promise.all([
        fetch('/api/admin/sms/settings'),
        fetch('/api/partners')
      ])

      if (smsResponse.ok) {
        const smsData = await smsResponse.json()
        setSmsSettings(smsData.data || [])
        
        // Check if tables need migration
        if (smsData.message && smsData.message.includes('migration')) {
          setError('SMS tables not initialized. Please run the database migration first.')
        }
      } else {
        const errorData = await smsResponse.json()
        setError(errorData.error || 'Failed to load SMS settings')
      }

      if (partnersResponse.ok) {
        const partnersData = await partnersResponse.json()
        setPartners(partnersData.partners || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    
    try {
      const payload = {
        ...formData,
        notification_phone_numbers: formData.notification_phone_numbers
          .split(',')
          .map(phone => phone.trim())
          .filter(phone => phone)
      }

      const response = await fetch('/api/admin/sms/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const result = await response.json()

      if (result.success) {
        setShowModal(false)
        setEditingSettings(null)
        resetForm()
        loadData()
        addToast({
          type: 'success',
          title: 'SMS Settings Saved',
          message: result.message || 'SMS settings have been saved successfully'
        })
      } else {
        setError(result.error || 'Failed to save SMS settings')
        addToast({
          type: 'error',
          title: 'Failed to Save SMS Settings',
          message: result.error || 'An error occurred while saving SMS settings'
        })
      }
    } catch (error) {
      console.error('Error saving SMS settings:', error)
      setError('Failed to save SMS settings')
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to save SMS settings. Please check your connection and try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (settings: SMSSettings) => {
    setEditingSettings(settings)
    setFormData({
      partner_id: settings.partner_id,
      damza_api_key: settings.damza_api_key === '***encrypted***' ? '' : settings.damza_api_key,
      damza_sender_id: settings.damza_sender_id,
      damza_username: settings.damza_username === '***encrypted***' ? '' : settings.damza_username,
      damza_password: settings.damza_password === '***encrypted***' ? '' : settings.damza_password,
      sms_enabled: settings.sms_enabled,
      low_balance_threshold: settings.low_balance_threshold,
      notification_phone_numbers: settings.notification_phone_numbers.join(', '),
      sms_charge_per_message: settings.sms_charge_per_message
    })
    setShowModal(true)
  }

  const handleDelete = async (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId)
    const partnerName = partner?.name || 'Unknown Partner'
    
    confirm({
      title: 'Delete SMS Settings',
      message: `Are you sure you want to delete SMS settings for ${partnerName}? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeleting(partnerId)
        try {
          const response = await fetch(`/api/admin/sms/settings?partner_id=${partnerId}`, {
            method: 'DELETE'
          })

          const result = await response.json()

          if (result.success) {
            loadData()
            addToast({
              type: 'success',
              title: 'SMS Settings Deleted',
              message: `SMS settings for ${partnerName} have been deleted successfully`
            })
          } else {
            addToast({
              type: 'error',
              title: 'Failed to Delete SMS Settings',
              message: result.error || 'An error occurred while deleting SMS settings'
            })
          }
        } catch (error) {
          console.error('Error deleting SMS settings:', error)
          addToast({
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete SMS settings. Please check your connection and try again.'
          })
        } finally {
          setDeleting(null)
        }
      }
    })
  }

  const resetForm = () => {
    setFormData({
      partner_id: '',
      damza_api_key: '',
      damza_sender_id: '',
      damza_username: '',
      damza_password: '',
      sms_enabled: true,
      low_balance_threshold: 1000,
      notification_phone_numbers: '',
      sms_charge_per_message: 0.50
    })
  }

  const openModal = () => {
    resetForm()
    setEditingSettings(null)
    setShowModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-blue-600" />
              SMS Settings Management
            </h1>
            <p className="text-gray-600 mt-2">
              Configure Damza bulk SMS settings for each partner
            </p>
          </div>
          <button
            onClick={openModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add SMS Settings
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SMS settings...</p>
        </div>
      )}

      {/* SMS Settings Table */}
      {!loading && (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sender ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SMS Enabled
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Charge per SMS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Low Balance Threshold
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {smsSettings.map((settings) => (
                <tr key={settings.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {settings.partners?.name || 'Unknown Partner'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {settings.partners?.short_code || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {settings.damza_sender_id}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      settings.sms_enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {settings.sms_enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    KES {settings.sms_charge_per_message.toFixed(4)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    KES {settings.low_balance_threshold.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(settings)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Edit SMS Settings"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <DangerButton
                        onClick={() => handleDelete(settings.partner_id)}
                        loading={deleting === settings.partner_id}
                        size="sm"
                        className="!p-1 !min-w-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </DangerButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {smsSettings.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SMS Settings</h3>
            <p className="text-gray-500 mb-4">Get started by adding SMS settings for a partner.</p>
            <button
              onClick={openModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add SMS Settings
            </button>
          </div>
        )}
      </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingSettings ? 'Edit SMS Settings' : 'Add SMS Settings'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Partner Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner *
                </label>
                <select
                  value={formData.partner_id}
                  onChange={(e) => setFormData({ ...formData, partner_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={!!editingSettings}
                >
                  <option value="">Select a partner</option>
                  {partners
                    .filter(partner => partner.is_active)
                    .map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.short_code})
                      </option>
                    ))}
                </select>
              </div>

              {/* Damza API Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damza API Key {!editingSettings ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={formData.damza_api_key}
                  onChange={(e) => setFormData({ ...formData, damza_api_key: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingSettings ? "Leave blank to keep current value" : "Enter Damza API key"}
                  required={!editingSettings}
                />
                {editingSettings && (
                  <p className="text-sm text-gray-500 mt-1">
                    Leave blank to keep the current encrypted value
                  </p>
                )}
              </div>

              {/* Sender ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sender ID *
                </label>
                <input
                  type="text"
                  value={formData.damza_sender_id}
                  onChange={(e) => setFormData({ ...formData, damza_sender_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., ABC Bank, XYZ Sacco"
                  required
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damza Username {!editingSettings ? '*' : ''}
                </label>
                <input
                  type="text"
                  value={formData.damza_username}
                  onChange={(e) => setFormData({ ...formData, damza_username: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingSettings ? "Leave blank to keep current value" : "Enter Damza username"}
                  required={!editingSettings}
                />
                {editingSettings && (
                  <p className="text-sm text-gray-500 mt-1">
                    Leave blank to keep the current encrypted value
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damza Password {!editingSettings ? '*' : ''}
                </label>
                <input
                  type="password"
                  value={formData.damza_password}
                  onChange={(e) => setFormData({ ...formData, damza_password: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={editingSettings ? "Leave blank to keep current value" : "Enter Damza password"}
                  required={!editingSettings}
                />
                {editingSettings && (
                  <p className="text-sm text-gray-500 mt-1">
                    Leave blank to keep the current encrypted value
                  </p>
                )}
              </div>

              {/* SMS Charge per Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMS Charge per Message (KES) *
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.sms_charge_per_message}
                  onChange={(e) => setFormData({ ...formData, sms_charge_per_message: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.50"
                  required
                />
              </div>

              {/* Low Balance Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Low Balance Threshold (KES)
                </label>
                <input
                  type="number"
                  value={formData.low_balance_threshold}
                  onChange={(e) => setFormData({ ...formData, low_balance_threshold: parseFloat(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1000"
                />
              </div>

              {/* Notification Phone Numbers */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notification Phone Numbers
                </label>
                <input
                  type="text"
                  value={formData.notification_phone_numbers}
                  onChange={(e) => setFormData({ ...formData, notification_phone_numbers: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="254712345678, 254798765432"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Comma-separated phone numbers for notifications
                </p>
              </div>

              {/* SMS Enabled */}
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sms_enabled"
                  checked={formData.sms_enabled}
                  onChange={(e) => setFormData({ ...formData, sms_enabled: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="sms_enabled" className="ml-2 block text-sm text-gray-900">
                  Enable SMS for this partner
                </label>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={submitting}
                  loadingText="Saving..."
                  variant="primary"
                >
                  {editingSettings ? 'Update Settings' : 'Create Settings'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={config?.title || ''}
        message={config?.message || ''}
        confirmText={config?.confirmText}
        cancelText={config?.cancelText}
        variant={config?.variant}
        loading={deleting !== null}
      />
    </div>
  )
}
