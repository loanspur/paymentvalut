'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Send, Eye, Users, MessageSquare, Calendar, DollarSign, X, Bell, BarChart3, Upload, Download, FileText, Search, Filter, CheckCircle2, Circle } from 'lucide-react'
import { useToast } from '../../../components/ToastSimple'
import { LoadingButton, DangerButton, SuccessButton } from '../../../components/LoadingButton'
import { ConfirmationDialog, useConfirmation } from '../../../components/ConfirmationDialog'

export const dynamic = 'force-dynamic'

interface Partner {
  id: string
  name: string
  short_code: string
  is_active: boolean
}

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
  partners: Partner
  sms_templates: SMSTemplate
}

const CAMPAIGN_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-800' },
  { value: 'scheduled', label: 'Scheduled', color: 'bg-blue-100 text-blue-800' },
  { value: 'sending', label: 'Sending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'Completed', color: 'bg-green-100 text-green-800' },
  { value: 'failed', label: 'Failed', color: 'bg-red-100 text-red-800' }
]

export default function SMSCampaignsPage() {
  const { addToast } = useToast()
  const { isOpen, config, confirm, handleConfirm, handleClose } = useConfirmation()
  
  const [campaigns, setCampaigns] = useState<SMSCampaign[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sending, setSending] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingCampaign, setEditingCampaign] = useState<SMSCampaign | null>(null)
  const [showStatisticsModal, setShowStatisticsModal] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<SMSCampaign | null>(null)
  const [campaignStatistics, setCampaignStatistics] = useState<any>(null)
  const [statisticsLoading, setStatisticsLoading] = useState(false)
  const [formData, setFormData] = useState({
    partner_id: '',
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
  
  // Loanspur Clients state
  const [showLoanspurClients, setShowLoanspurClients] = useState(false)
  const [loanspurClients, setLoanspurClients] = useState<any[]>([])
  const [fetchingClients, setFetchingClients] = useState(false)
  const [selectedClients, setSelectedClients] = useState<Set<number>>(new Set())
  const [clientFilters, setClientFilters] = useState({
    officeId: '',
    loanOfficerId: '',
    loanStatus: '',
    withSavings: undefined as boolean | undefined,
    savingsLastDepositDate: ''
  })
  const [filterOptions, setFilterOptions] = useState({
    offices: [] as any[],
    loanOfficers: [] as any[]
  })

  useEffect(() => {
    loadData()
  }, [])

  // Auto-refresh campaigns every 5 seconds if there are campaigns in "sending" status
  useEffect(() => {
    const hasSendingCampaigns = campaigns.some(c => c.status === 'sending')
    if (!hasSendingCampaigns) return

    const interval = setInterval(() => {
      loadData()
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [campaigns])

  // Load filter options when partner is selected
  const loadFilterOptions = async () => {
    if (!formData.partner_id) return

    try {
      const response = await fetch(`/api/mifos/clients?partner_id=${formData.partner_id}`)
      const data = await response.json()
      
      if (response.ok && data.success) {
        setFilterOptions({
          offices: data.offices || [],
          loanOfficers: data.loanOfficers || []
        })
      } else {
        console.error('Error loading filter options:', data.error)
        addToast({
          type: 'error',
          title: 'Failed to Load Filter Options',
          message: data.error || 'Failed to load offices and loan officers from Mifos X'
        })
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to load filter options. Please check your connection and try again.'
      })
    }
  }

  const loadLoanOfficers = async (officeId: string) => {
    if (!formData.partner_id || !officeId) {
      setFilterOptions(prev => ({ ...prev, loanOfficers: [] }))
      return
    }

    try {
      const response = await fetch(`/api/mifos/clients?partner_id=${formData.partner_id}&office_id=${officeId}`)
      if (response.ok) {
        const data = await response.json()
        setFilterOptions(prev => ({ ...prev, loanOfficers: data.loanOfficers || [] }))
      }
    } catch (error) {
      console.error('Error loading loan officers:', error)
    }
  }

  const fetchLoanspurClients = async () => {
    if (!formData.partner_id) {
      addToast({
        type: 'error',
        title: 'Partner Required',
        message: 'Please select a partner first'
      })
      return
    }

    setFetchingClients(true)
    try {
      const response = await fetch('/api/mifos/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partner_id: formData.partner_id,
          filters: clientFilters
        })
      })

      const result = await response.json()

      if (response.ok && result.success) {
        setLoanspurClients(result.clients || [])
        setSelectedClients(new Set())
        addToast({
          type: 'success',
          title: 'Clients Fetched',
          message: `Found ${result.clients?.length || 0} clients matching your filters`
        })
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Fetch Clients',
          message: result.error || 'Failed to fetch clients from Mifos X'
        })
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to fetch clients. Please check your connection and try again.'
      })
    } finally {
      setFetchingClients(false)
    }
  }

  const addSelectedClientsToRecipients = () => {
    if (selectedClients.size === 0) {
      addToast({
        type: 'warning',
        title: 'No Clients Selected',
        message: 'Please select at least one client to add to recipients'
      })
      return
    }

    const selectedClientsData = loanspurClients.filter(c => selectedClients.has(c.id))
    const phoneNumbers = selectedClientsData
      .map(c => c.mobileNo)
      .filter(phone => phone && phone.trim() !== '')
      .map(phone => {
        // Format phone number
        let phoneStr = phone.replace(/\D/g, '')
        if (phoneStr.startsWith('0')) {
          phoneStr = '254' + phoneStr.substring(1)
        } else if (!phoneStr.startsWith('254')) {
          phoneStr = '254' + phoneStr
        }
        return phoneStr
      })

    if (phoneNumbers.length === 0) {
      addToast({
        type: 'warning',
        title: 'No Valid Phone Numbers',
        message: 'Selected clients do not have valid phone numbers'
      })
      return
    }

    // Add phone numbers to recipient list
    const currentRecipients = formData.recipient_list
      .split(/[,\n]/)
      .map(r => r.trim())
      .filter(r => r.length > 0)
    
    const newRecipients = [...currentRecipients, ...phoneNumbers]
    
    setFormData({
      ...formData,
      recipient_list: newRecipients.join('\n')
    })

    // If using CSV mode, prepare CSV data with merge fields
    if (uploadMethod === 'csv') {
      const newCsvData = selectedClientsData.map(client => ({
        phone_number: client.mobileNo?.replace(/\D/g, '') || '',
        first_name: client.displayName?.split(' ')[0] || '',
        last_name: client.displayName?.split(' ').slice(1).join(' ') || '',
        account_no: client.accountNo || '',
        loan_amount: client.loanAmount?.toString() || '',
        loan_outstanding: client.loanOutstanding?.toString() || '',
        savings_balance: client.totalSavings?.toString() || '',
        overdue_days: client.overdueDays?.toString() || ''
      }))

      setCsvData([...csvData, ...newCsvData])
      
      // Update merge fields
      const newMergeFields = ['phone_number', 'first_name', 'last_name', 'account_no', 'loan_amount', 'loan_outstanding', 'savings_balance', 'overdue_days']
      const existingMergeFields = new Set(mergeFields)
      newMergeFields.forEach(field => existingMergeFields.add(field))
      setMergeFields(Array.from(existingMergeFields))
    }

    addToast({
      type: 'success',
      title: 'Clients Added',
      message: `Added ${phoneNumbers.length} clients to recipients`
    })
  }

  const loadData = async () => {
    try {
      const [campaignsResponse, partnersResponse, templatesResponse] = await Promise.all([
        fetch('/api/admin/sms/campaigns', { cache: 'no-store' }),
        fetch('/api/partners'),
        fetch('/api/admin/sms/templates')
      ])

      if (campaignsResponse.ok) {
        const campaignsData = await campaignsResponse.json()
        setCampaigns(campaignsData.data || [])
      }

      if (partnersResponse.ok) {
        const partnersData = await partnersResponse.json()
        setPartners(partnersData.partners || [])
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.data || [])
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    
    try {
      const url = editingCampaign ? `/api/admin/sms/campaigns/${editingCampaign.id}` : '/api/admin/sms/campaigns'
      const method = editingCampaign ? 'PUT' : 'POST'

      const requestData = {
        ...formData,
        recipient_list: formData.recipient_list
          .split(/[,\n]/) // Split by both comma and newline
          .map(phone => phone.trim()) // Trim whitespace
          .filter(phone => phone.length > 0), // Remove empty entries
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
        setFormData({
          partner_id: '',
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

  const openModal = (campaign?: SMSCampaign) => {
    if (campaign) {
      setEditingCampaign(campaign)
      setFormData({
        partner_id: campaign.partner_id,
        campaign_name: campaign.campaign_name,
        template_id: campaign.template_id,
        message_content: campaign.message_content,
        recipient_list: campaign.recipient_list.join('\n'),
        scheduled_at: campaign.scheduled_at ? new Date(campaign.scheduled_at).toISOString().slice(0, 16) : '',
        status: campaign.status
      })
    } else {
      setEditingCampaign(null)
      setFormData({
        partner_id: '',
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
    setShowModal(true)
  }

  const openStatisticsModal = async (campaign: SMSCampaign) => {
    setSelectedCampaign(campaign)
    setStatisticsLoading(true)
    setShowStatisticsModal(true)
    
    try {
      // Fetch campaign statistics
      const response = await fetch(`/api/admin/sms/campaigns/${campaign.id}/statistics`)
      if (response.ok) {
        const data = await response.json()
        setCampaignStatistics(data.data)
      } else {
        console.error('Failed to fetch campaign statistics')
        setCampaignStatistics(null)
      }
    } catch (error) {
      console.error('Error fetching campaign statistics:', error)
      setCampaignStatistics(null)
    } finally {
      setStatisticsLoading(false)
    }
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
          const response = await fetch(`/api/admin/sms/campaigns/${id}`, {
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
    const recipientCount = campaign?.total_recipients || 0
    
    confirm({
      title: 'Send SMS Campaign',
      message: `Are you sure you want to send the SMS campaign "${campaignName}" to ${recipientCount} recipients? This action cannot be undone.`,
      variant: 'warning',
      confirmText: 'Send Campaign',
      onConfirm: async () => {
        setSending(id)
        try {
          const response = await fetch(`/api/admin/sms/campaigns/${id}/send`, {
            method: 'POST'
          })

          const result = await response.json()

          if (response.ok && result.success) {
            await loadData()
            addToast({
              type: 'success',
              title: 'SMS Campaign Sent',
              message: `SMS campaign "${campaignName}" has been sent successfully to ${recipientCount} recipients`
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

  const getStatusColor = (status: string) => {
    const statusConfig = CAMPAIGN_STATUSES.find(s => s.value === status)
    return statusConfig?.color || 'bg-gray-100 text-gray-800'
  }

  const getPartnerTemplates = (partnerId: string) => {
    return templates.filter(template => template.partner_id === partnerId)
  }

  // CSV Template Download
  const downloadCSVTemplate = () => {
    const headers = ['phone_number', 'first_name', 'last_name', 'amount', 'date', 'reference']
    const sampleData = [
      ['254700000000', 'John', 'Doe', '1000', '2024-01-15', 'REF001'],
      ['254700000001', 'Jane', 'Smith', '2500', '2024-01-16', 'REF002'],
      ['254700000002', 'Mike', 'Johnson', '500', '2024-01-17', 'REF003']
    ]
    
    let csvContent = headers.join(',') + '\n'
    sampleData.forEach(row => {
      csvContent += row.join(',') + '\n'
    })
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', 'sms_campaign_template.csv')
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // CSV File Upload Handler
  const handleCSVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setCsvFile(file)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        addToast({
          type: 'error',
          title: 'Invalid CSV',
          message: 'CSV file must have at least a header row and one data row'
        })
        return
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      })

      // Validate phone numbers
      const phoneColumn = headers.find(h => h.includes('phone') || h.includes('number'))
      if (!phoneColumn) {
        addToast({
          type: 'error',
          title: 'Invalid CSV',
          message: 'CSV must contain a phone number column (phone_number, phone, or number)'
        })
        return
      }

      const validData = data.filter(row => {
        const phone = row[phoneColumn]
        if (!phone) return false
        
        // Fix phone number format - handle scientific notation
        let phoneStr = phone.toString()
        if (phoneStr.includes('E+')) {
          phoneStr = parseFloat(phoneStr).toString()
        }
        
        // Ensure it's a valid phone number format
        const cleanPhone = phoneStr.replace(/\D/g, '')
        return cleanPhone.length >= 10
      }).map(row => {
        // Fix phone numbers in the data
        const phone = row[phoneColumn]
        let phoneStr = phone.toString()
        if (phoneStr.includes('E+')) {
          phoneStr = parseFloat(phoneStr).toString()
        }
        
        return {
          ...row,
          [phoneColumn]: phoneStr
        }
      })

      if (validData.length === 0) {
        addToast({
          type: 'error',
          title: 'Invalid CSV',
          message: 'No valid phone numbers found in the CSV file'
        })
        return
      }

      setCsvData(validData)
      setMergeFields(headers.filter(h => h !== phoneColumn))
      
      // Update recipient list with phone numbers
      const phoneNumbers = validData.map(row => row[phoneColumn]).join('\n')
      setFormData(prev => ({ ...prev, recipient_list: phoneNumbers }))


      addToast({
        type: 'success',
        title: 'CSV Uploaded',
        message: `Successfully loaded ${validData.length} recipients from CSV file`
      })

    } catch (error) {
      console.error('CSV parsing error:', error)
      addToast({
        type: 'error',
        title: 'CSV Upload Failed',
        message: 'Failed to parse CSV file. Please check the format and try again.'
      })
    } finally {
      setUploading(false)
    }
  }

  // Process message with merge fields
  const processMessageWithMergeFields = (message: string, recipientData: any) => {
    let processedMessage = message
    
    // Replace merge fields like {{first_name}}, {{amount}}, etc.
    Object.keys(recipientData).forEach(field => {
      const placeholder = `{{${field}}}`
      processedMessage = processedMessage.replace(new RegExp(placeholder, 'g'), recipientData[field])
    })
    
    return processedMessage
  }

  if (loading) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
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
              <Bell className="w-8 h-8 text-blue-600" />
              Bulk SMS Campaigns
            </h1>
            <p className="text-gray-600 mt-2">
              Create and manage bulk SMS campaigns for partners
            </p>
          </div>
          <button
            onClick={() => openModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Create Campaign
          </button>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Recipients
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {campaigns.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {campaign.campaign_name}
                      </div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">
                        {campaign.message_content}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {campaign.partners?.name || 'Unknown'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {campaign.partners?.short_code || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div className="text-sm text-gray-900">
                        {campaign.sent_count}/{campaign.total_recipients}
                      </div>
                    </div>
                    {campaign.delivered_count > 0 && (
                      <div className="text-xs text-green-600">
                        {campaign.delivered_count} delivered
                      </div>
                    )}
                    {campaign.failed_count > 0 && (
                      <div className="text-xs text-red-600">
                        {campaign.failed_count} failed
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                      {CAMPAIGN_STATUSES.find(s => s.value === campaign.status)?.label || campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        KES {campaign.total_cost.toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openStatisticsModal(campaign)}
                        className="text-purple-600 hover:text-purple-900 p-1 rounded hover:bg-purple-50 transition-colors"
                        title="View Campaign Statistics"
                      >
                        <BarChart3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openModal(campaign)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Edit Campaign"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {campaign.status === 'draft' && (
                        <SuccessButton
                          onClick={() => handleSendCampaign(campaign.id)}
                          loading={sending === campaign.id}
                          size="sm"
                          className="!p-1 !min-w-0"
                        >
                          <Send className="w-4 h-4" />
                        </SuccessButton>
                      )}
                      <DangerButton
                        onClick={() => handleDelete(campaign.id)}
                        loading={deleting === campaign.id}
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
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Partner
                  </label>
                  <select
                    value={formData.partner_id}
                    onChange={(e) => {
                      setFormData({ ...formData, partner_id: e.target.value })
                      // Reset Loanspur Clients section when partner changes
                      setShowLoanspurClients(false)
                      setLoanspurClients([])
                      setSelectedClients(new Set())
                      setClientFilters({
                        officeId: '',
                        loanOfficerId: '',
                        loanStatus: '',
                        withSavings: undefined,
                        savingsLastDepositDate: ''
                      })
                      setFilterOptions({ offices: [], loanOfficers: [] })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a partner</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.short_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign Name
                  </label>
                  <input
                    type="text"
                    value={formData.campaign_name}
                    onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template
                  </label>
                  <select
                    value={formData.template_id}
                    onChange={(e) => {
                      const template = templates.find(t => t.id === e.target.value)
                      setFormData({ 
                        ...formData, 
                        template_id: e.target.value,
                        message_content: template?.template_content || formData.message_content
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select a template</option>
                    {formData.partner_id && getPartnerTemplates(formData.partner_id).map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.template_name} ({template.template_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message Content
                  </label>
                  <div className="relative">
                    <textarea
                      value={formData.message_content}
                      onChange={(e) => setFormData({ ...formData, message_content: e.target.value })}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <div className="absolute bottom-2 right-2 flex items-center gap-2 text-xs text-gray-500 bg-white px-2 py-1 rounded">
                      <span>{formData.message_content.length} characters</span>
                      <span className="text-gray-400">|</span>
                      <span className="font-medium text-gray-700">
                        {Math.ceil(formData.message_content.length / 160)} SMS
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipient Upload Method
                  </label>
                  
                  {/* Upload Method Selection */}
                  <div className="flex gap-4 mb-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="manual"
                        checked={uploadMethod === 'manual'}
                        onChange={(e) => setUploadMethod(e.target.value as 'manual' | 'csv')}
                        className="mr-2"
                      />
                      Manual Entry
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="csv"
                        checked={uploadMethod === 'csv'}
                        onChange={(e) => setUploadMethod(e.target.value as 'manual' | 'csv')}
                        className="mr-2"
                      />
                      CSV/Excel Upload
                    </label>
                  </div>

                  {uploadMethod === 'manual' ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Phone Numbers (separated by comma or new line)
                      </label>
                      <textarea
                        value={formData.recipient_list}
                        onChange={(e) => setFormData({ ...formData, recipient_list: e.target.value })}
                        rows={6}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="254700000000, 254700000001, 254700000002&#10;or&#10;254700000000&#10;254700000001&#10;254700000002"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You can separate phone numbers with commas (,) or put each number on a new line
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <button
                          type="button"
                          onClick={downloadCSVTemplate}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download Template
                        </button>
                        <div className="text-sm text-gray-600">
                          Download CSV template with sample data and merge fields
                        </div>
                      </div>

                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept=".csv,.xlsx,.xls"
                          onChange={handleCSVUpload}
                          className="hidden"
                          id="csv-upload"
                          disabled={uploading}
                        />
                        <label
                          htmlFor="csv-upload"
                          className={`cursor-pointer flex flex-col items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <Upload className="w-8 h-8 text-gray-400" />
                          <div className="text-sm text-gray-600">
                            {uploading ? 'Processing CSV...' : 'Click to upload CSV/Excel file'}
                          </div>
                          <div className="text-xs text-gray-500">
                            Supports .csv, .xlsx, .xls files
                          </div>
                        </label>
                      </div>

                      {csvFile && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <div className="flex items-center gap-2 text-green-800">
                            <FileText className="w-4 h-4" />
                            <span className="font-medium">{csvFile.name}</span>
                          </div>
                          <div className="text-sm text-green-700 mt-1">
                            {csvData.length} recipients loaded
                            {mergeFields.length > 0 && (
                              <span> • {mergeFields.length} merge fields available: {mergeFields.join(', ')}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {mergeFields.length > 0 && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="text-sm font-medium text-blue-800 mb-2">
                            Available Merge Fields:
                          </div>
                          <div className="text-sm text-blue-700">
                            Use these in your message: {mergeFields.map(field => `{{${field}}}`).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Loanspur Clients Section */}
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center justify-between mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Loanspur Clients
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        if (!showLoanspurClients && formData.partner_id) {
                          loadFilterOptions()
                        }
                        setShowLoanspurClients(!showLoanspurClients)
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      <Filter className="w-4 h-4" />
                      {showLoanspurClients ? 'Hide' : 'Fetch from Mifos X'}
                    </button>
                  </div>

                  {showLoanspurClients && formData.partner_id && (
                    <div className="space-y-4 bg-gray-50 p-4 rounded-lg border">
                      {/* Filters */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Office
                          </label>
                          <select
                            value={clientFilters.officeId}
                            onChange={(e) => {
                              setClientFilters({ ...clientFilters, officeId: e.target.value, loanOfficerId: '' })
                              loadLoanOfficers(e.target.value)
                            }}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          >
                            <option value="">All Offices</option>
                            {filterOptions.offices.map((office) => (
                              <option key={office.id} value={office.id}>
                                {office.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Loan Officer
                          </label>
                          <select
                            value={clientFilters.loanOfficerId}
                            onChange={(e) => setClientFilters({ ...clientFilters, loanOfficerId: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                            disabled={!clientFilters.officeId}
                          >
                            <option value="">All Loan Officers</option>
                            {filterOptions.loanOfficers.map((officer) => (
                              <option key={officer.id} value={officer.id}>
                                {officer.displayName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Loan Status
                          </label>
                          <select
                            value={clientFilters.loanStatus}
                            onChange={(e) => setClientFilters({ ...clientFilters, loanStatus: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="overpaid">Overpaid</option>
                            <option value="closed">Closed</option>
                            <option value="writeoff">Written Off</option>
                            <option value="rescheduled">Rescheduled</option>
                            <option value="without_loans">Without Loans</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Savings
                          </label>
                          <select
                            value={clientFilters.withSavings === undefined ? '' : clientFilters.withSavings.toString()}
                            onChange={(e) => setClientFilters({ 
                              ...clientFilters, 
                              withSavings: e.target.value === '' ? undefined : e.target.value === 'true' 
                            })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          >
                            <option value="">All</option>
                            <option value="true">With Savings</option>
                            <option value="false">Without Savings</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Savings Last Deposit Date
                          </label>
                          <input
                            type="date"
                            value={clientFilters.savingsLastDepositDate}
                            onChange={(e) => setClientFilters({ ...clientFilters, savingsLastDepositDate: e.target.value })}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md"
                          />
                        </div>
                      </div>

                      {/* Fetch Button */}
                      <div className="flex justify-end">
                        <LoadingButton
                          type="button"
                          onClick={fetchLoanspurClients}
                          loading={fetchingClients}
                          variant="primary"
                          size="sm"
                          className="flex items-center gap-2"
                        >
                          <Search className="w-4 h-4" />
                          Fetch Clients
                        </LoadingButton>
                      </div>

                      {/* Clients List */}
                      {loanspurClients.length > 0 && (
                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                              Found {loanspurClients.length} clients
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const allSelected = new Set(loanspurClients.map(c => c.id))
                                  setSelectedClients(selectedClients.size === loanspurClients.length ? new Set() : allSelected)
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                {selectedClients.size === loanspurClients.length ? 'Deselect All' : 'Select All'}
                              </button>
                              <button
                                type="button"
                                onClick={addSelectedClientsToRecipients}
                                className="text-xs text-green-600 hover:text-green-800 font-medium"
                              >
                                Add {selectedClients.size > 0 ? `${selectedClients.size} ` : ''}Selected to Recipients
                              </button>
                            </div>
                          </div>
                          
                          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                            <table className="min-w-full divide-y divide-gray-200 text-xs">
                              <thead className="bg-gray-100 sticky top-0">
                                <tr>
                                  <th className="px-2 py-2 text-left">
                                    <input
                                      type="checkbox"
                                      checked={selectedClients.size === loanspurClients.length && loanspurClients.length > 0}
                                      onChange={(e) => {
                                        const allSelected = new Set(loanspurClients.map(c => c.id))
                                        setSelectedClients(e.target.checked ? allSelected : new Set())
                                      }}
                                      className="rounded"
                                    />
                                  </th>
                                  <th className="px-2 py-2 text-left">Name</th>
                                  <th className="px-2 py-2 text-left">Phone</th>
                                  <th className="px-2 py-2 text-left">Account</th>
                                  <th className="px-2 py-2 text-left">Loan Amount</th>
                                  <th className="px-2 py-2 text-left">Outstanding</th>
                                  <th className="px-2 py-2 text-left">Savings</th>
                                  <th className="px-2 py-2 text-left">Overdue</th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {loanspurClients.map((client) => (
                                  <tr key={client.id} className="hover:bg-gray-50">
                                    <td className="px-2 py-2">
                                      <input
                                        type="checkbox"
                                        checked={selectedClients.has(client.id)}
                                        onChange={(e) => {
                                          const newSelected = new Set(selectedClients)
                                          if (e.target.checked) {
                                            newSelected.add(client.id)
                                          } else {
                                            newSelected.delete(client.id)
                                          }
                                          setSelectedClients(newSelected)
                                        }}
                                        className="rounded"
                                      />
                                    </td>
                                    <td className="px-2 py-2 font-medium">{client.displayName}</td>
                                    <td className="px-2 py-2">{client.mobileNo || 'N/A'}</td>
                                    <td className="px-2 py-2 text-gray-600">{client.accountNo || '-'}</td>
                                    <td className="px-2 py-2">
                                      {(() => {
                                        const loanAmount = Number(client.loanAmount || 0)
                                        const totalLoans = Number(client.totalLoans || client.activeLoanCount || 0)
                                        
                                        if (totalLoans > 0) {
                                          return (
                                            <div className="flex flex-col">
                                              <span className="text-blue-600 font-medium">
                                                KES {loanAmount.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {totalLoans} {totalLoans === 1 ? 'loan' : 'loans'}
                                              </span>
                                            </div>
                                          )
                                        } else {
                                          return <span className="text-gray-400">KES 0.00</span>
                                        }
                                      })()}
                                    </td>
                                    <td className="px-2 py-2">
                                      {(() => {
                                        const loanOutstanding = Number(client.loanOutstanding || 0)
                                        
                                        if (loanOutstanding > 0) {
                                          return (
                                            <span className="text-orange-600 font-medium">
                                              KES {loanOutstanding.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          )
                                        } else {
                                          return <span className="text-gray-400">KES 0.00</span>
                                        }
                                      })()}
                                    </td>
                                    <td className="px-2 py-2">
                                      {(() => {
                                        const savings = Number(client.totalSavings || 0)
                                        
                                        if (savings > 0) {
                                          return (
                                            <span className="text-green-600 font-medium">
                                              KES {savings.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          )
                                        } else {
                                          return <span className="text-gray-400">KES 0.00</span>
                                        }
                                      })()}
                                    </td>
                                    <td className="px-2 py-2">
                                      {(() => {
                                        const overdueDays = Number(client.overdueDays || 0)
                                        const loanOutstanding = Number(client.loanOutstanding || 0)
                                        
                                        if (overdueDays > 0) {
                                          return (
                                            <div className="flex flex-col">
                                              <span className="text-red-600 font-medium">
                                                {overdueDays} {overdueDays === 1 ? 'day' : 'days'}
                                              </span>
                                              {loanOutstanding > 0 && (
                                                <span className="text-xs text-gray-500">
                                                  O/S: KES {loanOutstanding.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </span>
                                              )}
                                            </div>
                                          )
                                        } else {
                                          return <span className="text-gray-400">Current</span>
                                        }
                                      })()}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduled_at}
                    onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={submitting}
                    loadingText="Saving..."
                    variant="primary"
                    size="sm"
                  >
                    {editingCampaign ? 'Update Campaign' : 'Create Campaign'}
                  </LoadingButton>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Statistics Modal */}
      {showStatisticsModal && selectedCampaign && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-4 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-[95vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <h2 className="text-xl font-bold text-gray-900">
                    Campaign Statistics: {selectedCampaign.campaign_name}
                  </h2>
                </div>
                <button
                  onClick={() => setShowStatisticsModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {statisticsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                  <span className="ml-3 text-gray-600">Loading statistics...</span>
                </div>
              ) : campaignStatistics ? (
                <div className="space-y-6">
                  {/* Campaign Overview */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">Campaign Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center">
                          <Users className="w-8 h-8 text-blue-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Total Recipients</p>
                            <p className="text-2xl font-bold text-gray-900">{campaignStatistics.overview.total_sms}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-green-600 font-bold">✓</span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Sent Successfully</p>
                            <p className="text-2xl font-bold text-green-600">{campaignStatistics.overview.sent_sms}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <span className="text-red-600 font-bold">✗</span>
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Failed</p>
                            <p className="text-2xl font-bold text-red-600">{campaignStatistics.overview.failed_sms}</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex items-center">
                          <DollarSign className="w-8 h-8 text-yellow-600" />
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-500">Total Cost</p>
                            <p className="text-2xl font-bold text-gray-900">KES {campaignStatistics.overview.total_cost.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Success Rate */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Success Rate</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div 
                            className="bg-green-600 h-4 rounded-full transition-all duration-500"
                            style={{ width: `${campaignStatistics.overview.success_rate}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="text-2xl font-bold text-gray-900">
                        {campaignStatistics.overview.success_rate}%
                      </div>
                    </div>
                  </div>

                  {/* Pie Chart - Success vs Failed */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">SMS Delivery Status</h3>
                    <div className="flex items-center justify-center">
                      <div className="relative w-64 h-64">
                        {/* Simple pie chart using CSS */}
                        <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                        {campaignStatistics.chart_data.success_vs_failed.map((item, index) => {
                          const percentage = campaignStatistics.overview.total_sms > 0 
                            ? (item.value / campaignStatistics.overview.total_sms) * 100 
                            : 0
                          const rotation = campaignStatistics.chart_data.success_vs_failed
                            .slice(0, index)
                            .reduce((sum, prevItem) => sum + (prevItem.value / campaignStatistics.overview.total_sms) * 360, 0)
                          
                          return (
                            <div
                              key={item.name}
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: `conic-gradient(from ${rotation}deg, ${item.color} 0deg ${percentage * 3.6}deg, transparent ${percentage * 3.6}deg)`
                              }}
                            ></div>
                          )
                        })}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-900">
                              {campaignStatistics.overview.total_sms}
                            </div>
                            <div className="text-sm text-gray-500">Total SMS</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center gap-6 mt-4">
                      {campaignStatistics.chart_data.success_vs_failed.map((item) => (
                        <div key={item.name} className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: item.color }}
                          ></div>
                          <span className="text-sm text-gray-600">
                            {item.name}: {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent SMS Activity</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Phone Number
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Status
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Message
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Cost
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {campaignStatistics.recent_activity.map((activity, index) => (
                            <tr key={index}>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {activity.phone}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  activity.status === 'sent' 
                                    ? 'bg-green-100 text-green-800'
                                    : activity.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {activity.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">
                                {activity.message}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                KES {activity.cost.toFixed(2)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                {new Date(activity.timestamp).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Error Analysis */}
                  {campaignStatistics.analysis.error_breakdown.length > 0 && (
                    <div className="bg-white rounded-lg p-6 shadow-sm">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Analysis</h3>
                      <div className="space-y-3">
                        {campaignStatistics.analysis.error_breakdown.map((error, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                            <span className="text-sm text-red-800">{error.error}</span>
                            <span className="text-sm font-semibold text-red-600">{error.count} occurrences</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Campaign Details */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Campaign Name</p>
                        <p className="text-sm font-medium text-gray-900">{campaignStatistics.campaign.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Partner</p>
                        <p className="text-sm font-medium text-gray-900">{campaignStatistics.campaign.partner}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          campaignStatistics.campaign.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : campaignStatistics.campaign.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {campaignStatistics.campaign.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Created</p>
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(campaignStatistics.campaign.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm text-gray-500">Message Content</p>
                      <p className="text-sm font-medium text-gray-900 mt-1 p-3 bg-gray-50 rounded-lg">
                        {campaignStatistics.campaign.message_content}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</h3>
                  <p className="text-gray-500">Unable to load campaign statistics at this time.</p>
                </div>
              )}
            </div>
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
        loading={deleting !== null || sending !== null}
      />
    </div>
  )
}
