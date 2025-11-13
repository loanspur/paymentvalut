'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Send, Eye, Users, MessageSquare, Calendar, DollarSign, X, Bell, BarChart3, Upload, Download, FileText, Search, Filter, CheckCircle2, Circle, Info } from 'lucide-react'
import { useToast } from '../../../components/ToastSimple'
import { LoadingButton, DangerButton, SuccessButton } from '../../../components/LoadingButton'
import { ConfirmationDialog, useConfirmation } from '../../../components/ConfirmationDialog'

export const dynamic = 'force-dynamic'

interface SMSTemplate {
  id: string
  template_name: string
  template_content: string
  template_type: string
  is_active: boolean
  partner_id: string
}

interface SMSCampaign {
  id: string
  partner_id: string
  campaign_name: string
  template_id: string
  message_content: string
  recipient_list: any[]
  total_recipients: number
  sent_count: number
  delivered_count: number
  failed_count: number
  total_cost: number
  status: 'draft' | 'scheduled' | 'sending' | 'completed' | 'failed'
  scheduled_at: string
  started_at: string
  completed_at: string
  created_at: string
  partners: any
  sms_templates: SMSTemplate
}

const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'sending', label: 'Sending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' }
]

export default function PartnerSMSCampaignsPage() {
  const { addToast } = useToast()
  const { isOpen, config, confirm, handleConfirm, handleClose } = useConfirmation()
  
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([])
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<SMSCampaign | null>(null)
  const [formData, setFormData] = useState({
    campaign_name: '',
    template_id: '',
    message_content: '',
    recipient_list: '',
    scheduled_at: '',
    status: 'draft'
  })
  const [uploadMethod, setUploadMethod] = useState<'manual' | 'csv'>('manual')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [mergeFields, setMergeFields] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    loadData()
  }, [])

  // Auto-refresh campaigns every 5 seconds if there are campaigns in "sending" status
  useEffect(() => {
    const hasSendingCampaigns = campaigns.some(c => c.status === 'sending')
    if (!hasSendingCampaigns) return

    const interval = setInterval(() => {
      loadData()
    }, 5000)

    return () => clearInterval(interval)
  }, [campaigns])

  const loadData = async () => {
    try {
      const [campaignsResponse, templatesResponse] = await Promise.all([
        fetch('/api/partner/sms/campaigns', { cache: 'no-store' }),
        fetch('/api/admin/sms/templates') // Templates API should allow partner access
      ])

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        setCampaigns(campaignsData.data || [])
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load SMS campaigns'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const url = editingCampaign ? `/api/partner/sms/campaigns/${editingCampaign.id}` : '/api/partner/sms/campaigns'
      const method = editingCampaign ? 'PUT' : 'POST'

      const requestData = {
        ...formData,
        recipient_list: formData.recipient_list
          .split(/[,\n]/)
          .map(phone => phone.trim())
          .filter(phone => phone.length > 0),
        csv_data: uploadMethod === 'csv' ? csvData : null,
        merge_fields: uploadMethod === 'csv' ? mergeFields : null
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (response.ok && result.success) {
        await loadData()
        setShowModal(false)
        setEditingCampaign(null)
        resetForm()
        addToast({
          type: 'success',
          title: 'SMS Campaign Saved',
          message: result.message || 'SMS campaign has been saved successfully'
        })
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Save SMS Campaign',
          message: result.error || 'An error occurred while saving SMS campaign'
        })
      }
    } catch (error) {
      console.error('Error saving campaign:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to save SMS campaign. Please check your connection and try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      campaign_name: '',
      template_id: '',
      message_content: '',
      recipient_list: '',
      scheduled_at: '',
      status: 'draft'
    })
    setUploadMethod('manual')
    setCsvFile(null)
    setCsvData([])
    setMergeFields([])
  }

  const openModal = (campaign?: SMSCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign)
      setFormData({
        campaign_name: campaign.campaign_name,
        template_id: campaign.template_id || '',
        message_content: campaign.message_content,
        recipient_list: Array.isArray(campaign.recipient_list) 
          ? campaign.recipient_list.join('\n')
          : '',
        scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
        status: campaign.status
      })
    } else {
      setEditingCampaign(null)
      resetForm()
    }
    setShowModal(true)
  }

  const handleDelete = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    const campaignName = campaign?.campaign_name || 'Unknown Campaign'
    
    confirm({
      title: 'Delete SMS Campaign',
      message: `Are you sure you want to delete the SMS campaign "${campaignName}"? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeleting(id)
        try {
          const response = await fetch(`/api/partner/sms/campaigns/${id}`, {
            method: 'DELETE'
          })

          const result = await response.json()

          if (response.ok && result.success) {
            await loadData()
            addToast({
              type: 'success',
              title: 'SMS Campaign Deleted',
              message: `SMS campaign "${campaignName}" has been deleted successfully`
            })
          } else {
            addToast({
              type: 'error',
              title: 'Failed to Delete SMS Campaign',
              message: result.error || 'An error occurred while deleting SMS campaign'
            })
          }
        } catch (error) {
          console.error('Error deleting campaign:', error)
          addToast({
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete SMS campaign. Please check your connection and try again.'
          })
        } finally {
          setDeleting(null)
        }
      }
    })
  }

  const handleSendCampaign = async (id: string) => {
    const campaign = campaigns.find(c => c.id === id)
    const campaignName = campaign?.campaign_name || 'Unknown Campaign'
    
    confirm({
      title: 'Send SMS Campaign',
      message: `Are you sure you want to send the SMS campaign "${campaignName}" to ${campaign?.total_recipients || 0} recipients? This will deduct KES ${campaign?.total_cost || 0} from your wallet.`,
      variant: 'default',
      confirmText: 'Send',
      onConfirm: async () => {
        setSending(id)
        try {
          const response = await fetch(`/api/partner/sms/campaigns/${id}/send`, {
            method: 'POST'
          })

          const result = await response.json()

          if (response.ok && result.success) {
            await loadData()
            addToast({
              type: 'success',
              title: 'SMS Campaign Started',
              message: result.message || 'SMS campaign has been started successfully'
            })
          } else {
            addToast({
              type: 'error',
              title: 'Failed to Send SMS Campaign',
              message: result.error || 'An error occurred while sending SMS campaign'
            })
          }
        } catch (error) {
          console.error('Error sending campaign:', error)
          addToast({
            type: 'error',
            title: 'Network Error',
            message: 'Failed to send SMS campaign. Please check your connection and try again.'
          })
        } finally {
          setSending(null)
        }
      }
    })
  }

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    setUploading(true)

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string
        const lines = text.split('\n').filter(line => line.trim())
        const headers = lines[0].split(',').map(h => h.trim())
        
        const data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim())
          const row: any = {}
          headers.forEach((header, index) => {
            row[header] = values[index] || ''
          })
          return row
        })

        setCsvData(data)
        setMergeFields(headers)
        setFormData(prev => ({
          ...prev,
          recipient_list: data.map(row => row.phone_number || row.phone || '').filter(p => p).join('\n')
        }))

        addToast({
          type: 'success',
          title: 'CSV Uploaded',
          message: `Loaded ${data.length} recipients from CSV`
        })
      } catch (error) {
        console.error('Error parsing CSV:', error)
        addToast({
          type: 'error',
          title: 'CSV Parse Error',
          message: 'Failed to parse CSV file. Please check the format.'
        })
      } finally {
        setUploading(false)
      }
    }

    reader.readAsText(file)
  }

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.campaign_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = !statusFilter || campaign.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading SMS campaigns...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">SMS Campaigns</h1>
        <p className="mt-2 text-gray-600">Create and manage your SMS campaigns</p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-semibold text-blue-900">SMS Settings</h3>
            <p className="text-sm text-blue-800 mt-1">
              SMS settings are managed by the system administrator. All campaigns use the system SMS gateway.
            </p>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 gap-4 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Statuses</option>
            {CAMPAIGN_STATUSES.map(status => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Campaign
        </button>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campaign Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recipients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchTerm || statusFilter ? 'No campaigns match your filters' : 'No SMS campaigns yet. Create your first campaign!'}
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map((campaign) => {
                  const statusConfig = CAMPAIGN_STATUSES.find(s => s.value === campaign.status) || CAMPAIGN_STATUSES[0]
                  return (
                    <tr key={campaign.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{campaign.campaign_name}</div>
                        {campaign.sms_templates && (
                          <div className="text-xs text-gray-500">Template: {campaign.sms_templates.template_name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{campaign.total_recipients}</div>
                        {campaign.status === 'completed' && (
                          <div className="text-xs text-gray-500">
                            Sent: {campaign.sent_count} | Delivered: {campaign.delivered_count} | Failed: {campaign.failed_count}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        KES {campaign.total_cost.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(campaign.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          {campaign.status === 'draft' && (
                            <>
                              <button
                                onClick={() => handleSendCampaign(campaign.id)}
                                disabled={sending === campaign.id}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                title="Send Campaign"
                              >
                                <Send className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => openModal(campaign)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit Campaign"
                              >
                                <Edit className="w-5 h-5" />
                              </button>
                            </>
                          )}
                          {(campaign.status === 'draft' || campaign.status === 'failed') && (
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              disabled={deleting === campaign.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Delete Campaign"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">
                {editingCampaign ? 'Edit SMS Campaign' : 'Create SMS Campaign'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  setEditingCampaign(null)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Campaign Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.campaign_name}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter campaign name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message Content *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.message_content}
                    onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter your SMS message. Use {{field_name}} for merge fields if using CSV."
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Character count: {formData.message_content.length} (SMS cost calculated automatically)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipients *
                  </label>
                  <div className="mb-2">
                    <div className="flex gap-2 mb-2">
                      <button
                        type="button"
                        onClick={() => setUploadMethod('manual')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          uploadMethod === 'manual'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        Manual Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setUploadMethod('csv')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium ${
                          uploadMethod === 'csv'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        CSV Upload
                      </button>
                    </div>
                  </div>
                  {uploadMethod === 'manual' ? (
                    <textarea
                      required
                      rows={6}
                      value={formData.recipient_list}
                      onChange={(e) => setFormData({ ...formData, recipient_list: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone numbers (one per line or comma-separated). Format: 254XXXXXXXXX"
                    />
                  ) : (
                    <div>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleCsvUpload}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {csvData.length > 0 && (
                        <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            ✓ Loaded {csvData.length} recipients from CSV
                          </p>
                          {mergeFields.length > 0 && (
                            <p className="text-xs text-green-700 mt-1">
                              Available merge fields: {mergeFields.join(', ')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {formData.scheduled_at && (
                    <p className="mt-2 text-xs text-gray-500">
                      Campaign will be scheduled for: {new Date(formData.scheduled_at).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingCampaign(null)
                    resetForm()
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmationDialog
        isOpen={isOpen}
        config={config}
        onConfirm={handleConfirm}
        onClose={handleClose}
      />
    </div>
  )
}

