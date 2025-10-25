'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, MessageSquare, FileText, Users, Eye } from 'lucide-react'
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

interface SMSTemplate {
  id: string
  partner_id: string
  template_name: string
  template_type: string
  template_content: string
  variables: string[]
  is_active: boolean
  is_default: boolean
  created_at: string
  partners: Partner
}

const TEMPLATE_TYPES = [
  { value: 'balance_alert', label: 'Balance Alert' },
  { value: 'disbursement_confirmation', label: 'Disbursement Confirmation' },
  { value: 'payment_receipt', label: 'Payment Receipt' },
  { value: 'topup_confirmation', label: 'Top-up Confirmation' },
  { value: 'loan_approval', label: 'Loan Approval' },
  { value: 'loan_disbursement', label: 'Loan Disbursement' },
  { value: 'custom', label: 'Custom' }
]

export default function SMSTemplatesPage() {
  const { addToast } = useToast()
  const { isOpen, config, confirm, handleConfirm, handleClose } = useConfirmation()
  
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<SMSTemplate | null>(null)
  const [previewModal, setPreviewModal] = useState(false)
  const [previewContent, setPreviewContent] = useState('')
  const [formData, setFormData] = useState({
    partner_id: '',
    template_name: '',
    template_type: '',
    template_content: '',
    is_active: true,
    is_default: false
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [templatesResponse, partnersResponse] = await Promise.all([
        fetch('/api/admin/sms/templates'),
        fetch('/api/partners')
      ])

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json()
        setTemplates(templatesData.data || [])
      }

      if (partnersResponse.ok) {
        const partnersData = await partnersResponse.json()
        setPartners(partnersData.partners || [])
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
      const response = await fetch('/api/admin/sms/templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          id: editingTemplate?.id
        })
      })

      const result = await response.json()

      if (result.success) {
        setShowModal(false)
        setEditingTemplate(null)
        resetForm()
        loadData()
        addToast({
          type: 'success',
          title: 'SMS Template Saved',
          message: result.message || 'SMS template has been saved successfully'
        })
      } else {
        addToast({
          type: 'error',
          title: 'Failed to Save SMS Template',
          message: result.error || 'An error occurred while saving SMS template'
        })
      }
    } catch (error) {
      console.error('Error saving SMS template:', error)
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to save SMS template. Please check your connection and try again.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (template: SMSTemplate) => {
    setEditingTemplate(template)
    setFormData({
      partner_id: template.partner_id,
      template_name: template.template_name,
      template_type: template.template_type,
      template_content: template.template_content,
      is_active: template.is_active,
      is_default: template.is_default
    })
    setShowModal(true)
  }

  const handleDelete = async (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    const templateName = template?.template_name || 'Unknown Template'
    
    confirm({
      title: 'Delete SMS Template',
      message: `Are you sure you want to delete the SMS template "${templateName}"? This action cannot be undone.`,
      variant: 'danger',
      confirmText: 'Delete',
      onConfirm: async () => {
        setDeleting(templateId)
        try {
          const response = await fetch(`/api/admin/sms/templates?template_id=${templateId}`, {
            method: 'DELETE'
          })

          const result = await response.json()

          if (result.success) {
            loadData()
            addToast({
              type: 'success',
              title: 'SMS Template Deleted',
              message: `SMS template "${templateName}" has been deleted successfully`
            })
          } else {
            addToast({
              type: 'error',
              title: 'Failed to Delete SMS Template',
              message: result.error || 'An error occurred while deleting SMS template'
            })
          }
        } catch (error) {
          console.error('Error deleting SMS template:', error)
          addToast({
            type: 'error',
            title: 'Network Error',
            message: 'Failed to delete SMS template. Please check your connection and try again.'
          })
        } finally {
          setDeleting(null)
        }
      }
    })
  }

  const handlePreview = (template: SMSTemplate) => {
    setPreviewContent(template.template_content)
    setPreviewModal(true)
  }

  const resetForm = () => {
    setFormData({
      partner_id: '',
      template_name: '',
      template_type: '',
      template_content: '',
      is_active: true,
      is_default: false
    })
  }

  const openModal = () => {
    resetForm()
    setEditingTemplate(null)
    setShowModal(true)
  }

  const extractVariables = (content: string) => {
    const matches = content.match(/\{([^}]+)\}/g)
    return matches ? matches.map(match => match.slice(1, -1)) : []
  }

  const getTemplateTypeLabel = (type: string) => {
    const templateType = TEMPLATE_TYPES.find(t => t.value === type)
    return templateType ? templateType.label : type
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
              <FileText className="w-8 h-8 text-blue-600" />
              SMS Templates Management
            </h1>
            <p className="text-gray-600 mt-2">
              Create and manage SMS message templates for each partner
            </p>
          </div>
          <button
            onClick={openModal}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Template
          </button>
        </div>
      </div>

      {/* Templates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Template Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content Preview
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Variables
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.map((template) => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {template.partners?.name || 'Unknown Partner'}
                      </div>
                      <div className="text-sm text-gray-500">
                        {template.partners?.short_code || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {template.template_name}
                    </div>
                    {template.is_default && (
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getTemplateTypeLabel(template.template_type)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                    <div className="truncate">
                      {template.template_content.length > 100 
                        ? `${template.template_content.substring(0, 100)}...`
                        : template.template_content
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {template.variables.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {template.variables.slice(0, 3).map((variable, index) => (
                          <span key={index} className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded">
                            {variable}
                          </span>
                        ))}
                        {template.variables.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{template.variables.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      template.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePreview(template)}
                        className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(template)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {!template.is_default && (
                        <DangerButton
                          onClick={() => handleDelete(template.id)}
                          loading={deleting === template.id}
                          size="sm"
                          className="!p-1 !min-w-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </DangerButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {templates.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No SMS Templates</h3>
            <p className="text-gray-500 mb-4">Get started by creating an SMS template for a partner.</p>
            <button
              onClick={openModal}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Template
            </button>
          </div>
        )}
      </div>

      {/* Template Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">
              {editingTemplate ? 'Edit SMS Template' : 'Add SMS Template'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    disabled={!!editingTemplate}
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

                {/* Template Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Template Type *
                  </label>
                  <select
                    value={formData.template_type}
                    onChange={(e) => setFormData({ ...formData, template_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select template type</option>
                    {TEMPLATE_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Template Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter template name"
                  required
                />
              </div>

              {/* Template Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Content *
                </label>
                <textarea
                  value={formData.template_content}
                  onChange={(e) => setFormData({ ...formData, template_content: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={6}
                  placeholder="Enter SMS template content. Use {variable_name} for dynamic content."
                  required
                />
                <div className="mt-2">
                  <p className="text-sm text-gray-600">
                    <strong>Available variables:</strong> {extractVariables(formData.template_content).join(', ') || 'None detected'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Use curly braces for variables: {`{customer_name}, {amount}, {balance}`}
                  </p>
                </div>
              </div>

              {/* Status Options */}
              <div className="flex space-x-6">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Active
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_default" className="ml-2 block text-sm text-gray-900">
                    Default template for this type
                  </label>
                </div>
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
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-bold mb-4">Template Preview</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">SMS Content:</p>
              <p className="whitespace-pre-wrap">{previewContent}</p>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => setPreviewModal(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Close
              </button>
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
        loading={deleting !== null}
      />
    </div>
  )
}
