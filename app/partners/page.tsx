'use client'

import { useState, useEffect } from 'react'
import { supabase, supabaseConfig } from '../../lib/supabase'
import { generateStrongAPIKey, hashAPIKey } from '../../lib/api-key-utils'

// Partner interface
export interface Partner {
  id: string
  name: string
  short_code: string
  mpesa_shortcode: string
  mpesa_consumer_key: string
  mpesa_consumer_secret: string
  mpesa_passkey: string
  mpesa_initiator_name: string
  mpesa_initiator_password: string
  security_credential?: string
  mpesa_environment: string
  is_active: boolean
  is_mpesa_configured: boolean
  api_key: string
  allowed_ips: string[]
  ip_whitelist_enabled: boolean
  // Mifos X configuration
  mifos_host_url?: string
  mifos_username?: string
  mifos_password?: string
  mifos_tenant_id?: string
  mifos_api_endpoint?: string
  mifos_webhook_url?: string
  mifos_webhook_secret_token?: string
  is_mifos_configured: boolean
  mifos_auto_disbursement_enabled: boolean
  mifos_max_disbursement_amount?: number
  mifos_min_disbursement_amount?: number
  created_at: string
  updated_at: string
}
import ConfirmationModal from '../../components/ConfirmationModal'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'
import MifosConfiguration from '../../components/MifosConfiguration'

export default function PartnersPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  
  // Notification system
  const { notifications, addNotification, removeNotification } = useNotifications()
  
  // Confirmation modal state
  const [confirmationModal, setConfirmationModal] = useState<{
    isOpen: boolean
    title: string
    message: string
    type: 'danger' | 'warning' | 'info' | 'success'
    onConfirm: () => void
    confirmText?: string
    cancelText?: string
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'warning',
    onConfirm: () => {}
  })
  const [formData, setFormData] = useState({
    name: '',
    short_code: '',
    mpesa_shortcode: '',
    mpesa_consumer_key: '',
    mpesa_consumer_secret: '',
    mpesa_passkey: '',
    mpesa_initiator_name: '',
    mpesa_initiator_password: '',
    security_credential: '',
    mpesa_environment: 'sandbox' as 'sandbox' | 'production',
    is_active: true,
    is_mpesa_configured: false,
    api_key: '',
    allowed_ips: [] as string[],
    ip_whitelist_enabled: false,
    // Mifos X configuration
    mifos_host_url: '',
    mifos_username: '',
    mifos_password: '',
    mifos_tenant_id: '',
    mifos_api_endpoint: '/fineract-provider/api/v1',
    mifos_webhook_url: '',
    mifos_webhook_secret_token: '',
    is_mifos_configured: false,
    mifos_auto_disbursement_enabled: false,
    mifos_max_disbursement_amount: 100000,
    mifos_min_disbursement_amount: 100
  })

  // Environment configuration loaded

  useEffect(() => {
    fetchPartners()
  }, [])

  const fetchPartners = async (retryCount = 0) => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching partners:', error)
        
        // Retry on network errors
        if (retryCount < 3 && (error.message.includes('network') || error.message.includes('fetch'))) {
          console.log(`Retrying partners fetch (attempt ${retryCount + 1})`)
          setTimeout(() => fetchPartners(retryCount + 1), 2000 * (retryCount + 1))
          return
        }
        
        addNotification({
          type: 'error',
          title: 'Database Error',
          message: `Failed to fetch partners: ${error.message}`
        })
        return
      }

      setPartners(data || [])
    } catch (error) {
      console.error('Error fetching partners:', error)
      
      // Retry on network errors
      if (retryCount < 3 && (error.message.includes('network') || error.message.includes('fetch') || error.message.includes('ERR_NETWORK'))) {
        console.log(`Retrying partners fetch (attempt ${retryCount + 1})`)
        setTimeout(() => fetchPartners(retryCount + 1), 2000 * (retryCount + 1))
        return
      }
      
      addNotification({
        type: 'error',
        title: 'Network Error',
        message: 'Failed to connect to database. Please check your internet connection and try again.'
      })
    } finally {
      if (retryCount === 0) {
        setLoading(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingPartner) {
        // Update existing partner in database
        
        const updateData: any = {
          name: formData.name,
          short_code: formData.short_code,
          mpesa_shortcode: formData.mpesa_shortcode,
          mpesa_consumer_key: formData.mpesa_consumer_key,
          mpesa_consumer_secret: formData.mpesa_consumer_secret,
          mpesa_passkey: formData.mpesa_passkey,
          mpesa_initiator_name: formData.mpesa_initiator_name,
          mpesa_initiator_password: formData.mpesa_initiator_password,
          security_credential: formData.security_credential, // Add security_credential to main record
          mpesa_environment: formData.mpesa_environment,
          is_active: formData.is_active,
          is_mpesa_configured: formData.is_mpesa_configured,
          updated_at: new Date().toISOString()
        }

        // Only include columns that exist in the database
        // These columns might not exist in the current schema
        if (formData.allowed_ips !== undefined) {
          updateData.allowed_ips = formData.allowed_ips
        }
        if (formData.ip_whitelist_enabled !== undefined) {
          updateData.ip_whitelist_enabled = formData.ip_whitelist_enabled
        }

        // Always update API key if provided
        if (formData.api_key) {
          const apiKeyHashHex = await hashAPIKey(formData.api_key)
          updateData.api_key = formData.api_key
          updateData.api_key_hash = apiKeyHashHex
        }

        // Always update M-Pesa credentials if provided (for fallback mechanism)
        if (formData.mpesa_consumer_key) {
          updateData.consumer_key = formData.mpesa_consumer_key
        }
        if (formData.mpesa_consumer_secret) {
          updateData.consumer_secret = formData.mpesa_consumer_secret
        }
        if (formData.mpesa_initiator_password) {
          updateData.initiator_password = formData.mpesa_initiator_password
        }
        if (formData.security_credential) {
          updateData.security_credential = formData.security_credential
        }

        const { data, error } = await supabase
          .from('partners')
          .update(updateData)
          .eq('id', editingPartner.id)
          .select()

        if (error) {
          console.error('Error updating partner:', error)
          
          // Provide more specific error messages
          let errorMessage = error.message
          if (error.message.includes('allowed_ips')) {
            errorMessage = 'Database schema issue: allowed_ips column missing. Please contact administrator.'
          } else if (error.message.includes('ip_whitelist_enabled')) {
            errorMessage = 'Database schema issue: ip_whitelist_enabled column missing. Please contact administrator.'
          } else if (error.message.includes('Could not find')) {
            errorMessage = 'Database schema issue: Some columns are missing. Please contact administrator.'
          }
          
          addNotification({
            type: 'error',
            title: 'Update Failed',
            message: errorMessage
          })
          return
        }

        // Store credentials in vault if M-Pesa credentials are provided
        if (formData.mpesa_consumer_key && formData.mpesa_consumer_secret && formData.mpesa_initiator_password) {
          const credentials = {
            consumer_key: formData.mpesa_consumer_key,
            consumer_secret: formData.mpesa_consumer_secret,
            passkey: formData.mpesa_passkey || '',
            initiator_name: formData.mpesa_initiator_name || '',
            initiator_password: formData.mpesa_initiator_password,
            security_credential: formData.security_credential,
            environment: formData.mpesa_environment
          }

          try {
            const response = await fetch('/api/partners/store-credentials', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                partnerId: editingPartner.id,
                credentials
              })
            })

            if (response.ok) {
              addNotification({
                type: 'success',
                title: 'Vault Updated',
                message: 'M-Pesa credentials stored securely in vault'
              })
            } else {
              addNotification({
                type: 'warning',
                title: 'Vault Warning',
                message: 'Partner updated but credentials not stored in vault'
              })
            }
          } catch (vaultError) {
            console.error('Vault error:', vaultError)
            
            // Provide more specific error messages for vault errors
            let vaultErrorMessage = 'Partner updated but failed to store credentials in vault'
            if (vaultError.message && vaultError.message.includes('encrypted_credentials')) {
              vaultErrorMessage = 'Partner updated but database schema issue: encrypted_credentials column missing. Please contact administrator.'
            } else if (vaultError.message && vaultError.message.includes('Could not find')) {
              vaultErrorMessage = 'Partner updated but database schema issue: Some columns are missing. Please contact administrator.'
            }
            
            addNotification({
              type: 'warning',
              title: 'Vault Warning',
              message: vaultErrorMessage
            })
          }
        }

        addNotification({
          type: 'success',
          title: 'Partner Updated',
          message: 'Partner updated successfully!'
        })
      } else {
        // Add new partner to database
        
        // Generate strong API key with familiar prefix
        const apiKey = formData.api_key || generateStrongAPIKey(formData.name, 'live')
        const apiKeyHashHex = await hashAPIKey(apiKey)

        const insertData: any = {
          name: formData.name,
          short_code: formData.short_code,
          mpesa_shortcode: formData.mpesa_shortcode,
          mpesa_consumer_key: formData.mpesa_consumer_key,
          mpesa_consumer_secret: formData.mpesa_consumer_secret,
          mpesa_passkey: formData.mpesa_passkey,
          mpesa_initiator_name: formData.mpesa_initiator_name,
          mpesa_initiator_password: formData.mpesa_initiator_password,
          security_credential: formData.security_credential, // Add security_credential to main record
          mpesa_environment: formData.mpesa_environment,
          is_active: formData.is_active,
          is_mpesa_configured: formData.is_mpesa_configured,
          api_key: apiKey, // Add the actual API key
          api_key_hash: apiKeyHashHex,
          // Also store in the fallback columns for redundancy
          consumer_key: formData.mpesa_consumer_key,
          consumer_secret: formData.mpesa_consumer_secret,
          initiator_password: formData.mpesa_initiator_password
        }

        // Only include columns that exist in the database
        if (formData.allowed_ips !== undefined) {
          insertData.allowed_ips = formData.allowed_ips
        }
        if (formData.ip_whitelist_enabled !== undefined) {
          insertData.ip_whitelist_enabled = formData.ip_whitelist_enabled
        }

        const { data, error } = await supabase
          .from('partners')
          .insert(insertData)
          .select()

        if (error) {
          console.error('Error adding partner:', error)
          
          // Provide more specific error messages
          let errorMessage = error.message
          if (error.message.includes('allowed_ips')) {
            errorMessage = 'Database schema issue: allowed_ips column missing. Please contact administrator.'
          } else if (error.message.includes('ip_whitelist_enabled')) {
            errorMessage = 'Database schema issue: ip_whitelist_enabled column missing. Please contact administrator.'
          } else if (error.message.includes('api_key')) {
            errorMessage = 'Database schema issue: api_key column missing. Please contact administrator.'
          } else if (error.message.includes('duplicate key')) {
            errorMessage = 'Partner with this name or short code already exists.'
          } else if (error.message.includes('Could not find')) {
            errorMessage = 'Database schema issue: Some columns are missing. Please contact administrator.'
          }
          
          addNotification({
            type: 'error',
            title: 'Add Failed',
            message: errorMessage
          })
          return
        }

        addNotification({
          type: 'success',
          title: 'Partner Added',
          message: 'Partner added successfully!'
        })

        // Store credentials in vault if M-Pesa credentials are provided
        if (formData.mpesa_consumer_key && formData.mpesa_consumer_secret && formData.mpesa_initiator_password) {
          const credentials = {
            consumer_key: formData.mpesa_consumer_key,
            consumer_secret: formData.mpesa_consumer_secret,
            passkey: formData.mpesa_passkey || '',
            initiator_name: formData.mpesa_initiator_name || '',
            initiator_password: formData.mpesa_initiator_password,
            security_credential: formData.security_credential,
            environment: formData.mpesa_environment
          }

          try {
            const partnerId = data[0].id
          const response = await fetch('/api/partners/store-credentials', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              partnerId,
              credentials
            })
          })

           if (response.ok) {
             addNotification({
               type: 'success',
               title: 'Vault Updated',
               message: 'M-Pesa credentials stored securely in vault'
             })
           } else {
             addNotification({
               type: 'warning',
               title: 'Vault Warning',
               message: 'Partner saved but credentials not stored in vault'
             })
           }
         } catch (vaultError) {
            console.error('Vault error:', vaultError)
           addNotification({
              type: 'warning',
              title: 'Vault Warning',
              message: 'Partner saved but failed to store credentials in vault'
           })
         }
        }
      }

      // Refresh the partners list
      await fetchPartners()
      
      // Reset form
      setFormData({
        name: '',
        short_code: '',
        mpesa_shortcode: '',
        mpesa_consumer_key: '',
        mpesa_consumer_secret: '',
        mpesa_passkey: '',
        mpesa_initiator_name: '',
        mpesa_initiator_password: '',
        security_credential: '',
        mpesa_environment: 'sandbox',
        is_active: true,
        is_mpesa_configured: false,
        api_key: '',
        allowed_ips: [],
        ip_whitelist_enabled: false,
        // Mifos X configuration
        mifos_host_url: '',
        mifos_username: '',
        mifos_password: '',
        mifos_tenant_id: '',
        mifos_api_endpoint: '',
        mifos_webhook_url: '',
        mifos_webhook_secret_token: '',
        is_mifos_configured: false,
        mifos_auto_disbursement_enabled: false,
        mifos_max_disbursement_amount: 0,
        mifos_min_disbursement_amount: 0
      })
      setShowAddForm(false)
      setEditingPartner(null)
    } catch (error) {
      console.error('Error saving partner:', error)
      addNotification({
        type: 'error',
        title: 'Save Error',
        message: 'Error saving partner. Please try again.'
      })
    }
  }

  const handleEdit = (partner: Partner) => {
    const formDataToSet = {
      name: partner.name || '',
      short_code: partner.short_code || '',
      mpesa_shortcode: partner.mpesa_shortcode || '',
      mpesa_consumer_key: partner.mpesa_consumer_key || '',
      mpesa_consumer_secret: partner.mpesa_consumer_secret || '',
      mpesa_passkey: partner.mpesa_passkey || '',
      mpesa_initiator_name: partner.mpesa_initiator_name || '',
      mpesa_initiator_password: (partner as any).mpesa_initiator_password || '',
      security_credential: (partner as any).security_credential || '',
      mpesa_environment: (partner.mpesa_environment as 'sandbox' | 'production') || 'sandbox',
      is_active: partner.is_active ?? true,
      is_mpesa_configured: partner.is_mpesa_configured ?? false,
      api_key: partner.api_key || '',
      allowed_ips: (partner as any).allowed_ips || [],
      ip_whitelist_enabled: (partner as any).ip_whitelist_enabled || false,
      // Mifos X configuration
      mifos_host_url: partner.mifos_host_url || '',
      mifos_username: partner.mifos_username || '',
      mifos_password: partner.mifos_password || '',
      mifos_tenant_id: partner.mifos_tenant_id || '',
      mifos_api_endpoint: partner.mifos_api_endpoint || '',
      mifos_webhook_url: partner.mifos_webhook_url || '',
      mifos_webhook_secret_token: partner.mifos_webhook_secret_token || '',
      is_mifos_configured: partner.is_mifos_configured ?? false,
      mifos_auto_disbursement_enabled: partner.mifos_auto_disbursement_enabled ?? false,
      mifos_max_disbursement_amount: partner.mifos_max_disbursement_amount || 0,
      mifos_min_disbursement_amount: partner.mifos_min_disbursement_amount || 0
    }
    
    setFormData(formDataToSet)
    setEditingPartner(partner)
    setShowAddForm(true)
  }

  // IP whitelisting functions
  const [newIP, setNewIP] = useState('')
  
  const addIP = () => {
    if (newIP.trim() && !formData.allowed_ips.includes(newIP.trim())) {
      setFormData({
        ...formData,
        allowed_ips: [...formData.allowed_ips, newIP.trim()]
      })
      setNewIP('')
    }
  }

  const handleDelete = (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId)
    setConfirmationModal({
      isOpen: true,
      title: 'Delete Partner',
      message: `Are you sure you want to delete ${partner?.name}? This action cannot be undone and will remove all associated data.`,
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          
          const { error } = await supabase
            .from('partners')
            .delete()
            .eq('id', partnerId)

          if (error) {
            console.error('Error deleting partner:', error)
            addNotification({
              type: 'error',
              title: 'Delete Failed',
              message: `Failed to delete partner: ${error.message}`
            })
            return
          }

          setConfirmationModal({ ...confirmationModal, isOpen: false })
          addNotification({
            type: 'success',
            title: 'Partner Deleted',
            message: 'Partner deleted successfully!'
          })
          
          // Refresh the partners list
          await fetchPartners()
        } catch (error) {
          console.error('Error deleting partner:', error)
          addNotification({
            type: 'error',
            title: 'Delete Failed',
            message: 'An unexpected error occurred while deleting the partner.'
          })
        }
      }
    })
  }

  const toggleActive = async (partnerId: string) => {
    const partner = partners.find(p => p.id === partnerId)
    if (partner) {
      try {
        
        const { error } = await supabase
          .from('partners')
          .update({ 
            is_active: !partner.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', partnerId)

        if (error) {
          console.error('Error toggling partner status:', error)
          addNotification({
            type: 'error',
            title: 'Update Failed',
            message: `Failed to update partner: ${error.message}`
          })
          return
        }

        addNotification({
          type: 'success',
          title: 'Partner Updated',
          message: `Partner ${partner.is_active ? 'deactivated' : 'activated'} successfully!`
        })
        
        // Refresh the partners list
        await fetchPartners()
      } catch (error) {
        console.error('Error toggling partner status:', error)
        addNotification({
          type: 'error',
          title: 'Update Failed',
          message: 'An unexpected error occurred while updating the partner.'
        })
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading partners...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification System */}
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />
      
      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmationModal.isOpen}
        onClose={() => setConfirmationModal({ ...confirmationModal, isOpen: false })}
        onConfirm={confirmationModal.onConfirm}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type}
        confirmText={confirmationModal.confirmText}
        cancelText={confirmationModal.cancelText}
      />
      
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Partner Management</h1>
            <p className="mt-2 text-gray-600">Manage partner organizations and their M-Pesa credentials</p>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            + Add Partner
          </button>
        </div>
      </div>

      {/* Partners Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Partner Organizations</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Partner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M-Pesa Short Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Environment
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Initiator Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    M-Pesa Configured
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {partners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{partner.name}</div>
                        <div className="text-sm text-gray-500">{partner.short_code}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {partner.mpesa_shortcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        partner.mpesa_environment === 'production' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {partner.mpesa_environment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {partner.mpesa_initiator_name || 'Not set'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleActive(partner.id)}
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          partner.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {partner.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        partner.is_mpesa_configured 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {partner.is_mpesa_configured ? 'Configured' : 'Not Configured'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(partner)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPartner ? 'Edit Partner' : 'Add New Partner'}
                </h3>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Short Code
                      </label>
                      <input
                        type="text"
                        value={formData.short_code}
                        onChange={(e) => setFormData({...formData, short_code: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        M-Pesa Short Code
                      </label>
                      <input
                        type="text"
                        value={formData.mpesa_shortcode}
                        onChange={(e) => setFormData({...formData, mpesa_shortcode: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Environment
                      </label>
                      <select
                        value={formData.mpesa_environment}
                        onChange={(e) => setFormData({...formData, mpesa_environment: e.target.value as 'sandbox' | 'production'})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="sandbox">Sandbox</option>
                        <option value="production">Production</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* IP Whitelisting Section */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">🔒 Security & IP Whitelisting</h4>
                    
                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.ip_whitelist_enabled}
                          onChange={(e) => setFormData({...formData, ip_whitelist_enabled: e.target.checked})}
                          className="mr-2"
                        />
                        Enable IP Whitelisting
                      </label>
                    </div>

                    {formData.ip_whitelist_enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Allowed IP Addresses
                        </label>
                        <div className="space-y-2">
                          {(formData.allowed_ips || []).map((ip, index) => (
                            <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                              <span className="font-mono text-sm">{ip}</span>
                              <button
                                type="button"
                                onClick={() => setFormData({
                                  ...formData, 
                                  allowed_ips: formData.allowed_ips.filter((_, i) => i !== index)
                                })}
                                className="text-red-600 hover:text-red-800"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newIP}
                              onChange={(e) => setNewIP(e.target.value)}
                              placeholder="Enter IP address (e.g., 192.168.1.100)"
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addIP())}
                            />
                            <button
                              type="button"
                              onClick={addIP}
                              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                            >
                              Add IP
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-gray-900">M-Pesa Credentials</h4>
                      <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        🔒 Stored in Vault
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consumer Key
                      </label>
                      <input
                        type="text"
                        value={formData.mpesa_consumer_key}
                        onChange={(e) => setFormData({...formData, mpesa_consumer_key: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter M-Pesa Consumer Key"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Consumer Secret
                      </label>
                      <input
                        type="password"
                        value={formData.mpesa_consumer_secret}
                        onChange={(e) => setFormData({...formData, mpesa_consumer_secret: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter M-Pesa Consumer Secret"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Passkey <span className="text-gray-500 text-sm">(Optional for B2C)</span>
                      </label>
                      <input
                        type="text"
                        value={formData.mpesa_passkey}
                        onChange={(e) => setFormData({...formData, mpesa_passkey: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter M-Pesa Passkey (not required for B2C)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        B2C transactions do not require a passkey. Leave empty for B2C-only partners.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initiator Name
                      </label>
                      <input
                        type="text"
                        value={formData.mpesa_initiator_name}
                        onChange={(e) => setFormData({...formData, mpesa_initiator_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter M-Pesa Initiator Name"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The initiator name registered with Safaricom for B2C transactions
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Initiator Password
                      </label>
                      <input
                        type="password"
                        value={formData.mpesa_initiator_password}
                        onChange={(e) => setFormData({...formData, mpesa_initiator_password: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter M-Pesa Initiator Password"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        The initiator password used for SecurityCredential generation in B2C transactions
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Security Credential <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.security_credential || ''}
                        onChange={(e) => setFormData({...formData, security_credential: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter RSA-encrypted Security Credential from Safaricom"
                        rows={3}
                      />
                      <p className="text-xs text-red-600 mt-1">
                        ⚠️ REQUIRED: This must be the RSA-encrypted SecurityCredential from Safaricom, not the raw password
                      </p>
                    </div>
                  </div>
                  
                  {/* API Key Section */}
                  <div className="space-y-4">
                    <h4 className="text-md font-medium text-gray-900">🔑 API Key</h4>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API Key
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formData.api_key}
                          onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                          placeholder="API key will be generated automatically"
                          readOnly={!editingPartner}
                        />
                        {editingPartner && (
                          <button
                            type="button"
                            onClick={() => {
                              const newApiKey = generateStrongAPIKey(formData.name, 'live')
                              setFormData({...formData, api_key: newApiKey})
                            }}
                            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                          >
                            Regenerate
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {editingPartner 
                          ? "Click 'Regenerate' to create a new secure API key. The old key will be invalidated."
                          : "A secure API key will be generated automatically when you save this partner."
                        }
                      </p>
                    </div>
                  </div>
                  
                  {/* Mifos X Configuration */}
                  <MifosConfiguration 
                    formData={formData}
                    setFormData={setFormData}
                    isEditing={!!editingPartner}
                  />
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Active</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_mpesa_configured}
                        onChange={(e) => setFormData({...formData, is_mpesa_configured: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">M-Pesa Configured</span>
                    </label>
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddForm(false)
                        setEditingPartner(null)
                        setFormData({
                          name: '',
                          short_code: '',
                          mpesa_shortcode: '',
                          mpesa_consumer_key: '',
                          mpesa_consumer_secret: '',
                          mpesa_passkey: '',
                          mpesa_initiator_name: '',
                          mpesa_initiator_password: '',
                          security_credential: '',
                          mpesa_environment: 'sandbox',
                          is_active: true,
                          is_mpesa_configured: false,
                          api_key: '',
                          allowed_ips: [],
                          ip_whitelist_enabled: false,
                          // Mifos X configuration
                          mifos_host_url: '',
                          mifos_username: '',
                          mifos_password: '',
                          mifos_tenant_id: '',
                          mifos_api_endpoint: '/fineract-provider/api/v1',
                          mifos_webhook_url: '',
                          mifos_webhook_secret_token: '',
                          is_mifos_configured: false,
                          mifos_auto_disbursement_enabled: false,
                          mifos_max_disbursement_amount: 100000,
                          mifos_min_disbursement_amount: 100
                        })
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {editingPartner ? 'Update Partner' : 'Add Partner'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
