'use client'

import { useState, useEffect } from 'react'
import { Send, Phone, CreditCard, RefreshCw, Building2 } from 'lucide-react'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'

interface Partner {
  id: string
  name: string
  short_code: string
  mpesa_shortcode: string
  is_mpesa_configured: boolean
  is_active: boolean
  api_key?: string
}

export default function DisbursePage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [disbursementForm, setDisbursementForm] = useState({
    partner_id: '',
    amount: '',
    msisdn: '',
    tenant_id: '',
    customer_id: '',
    client_request_id: ''
  })

  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    loadPartners()
  }, [])

  const loadPartners = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/partners')
      const data = await response.json()
      if (data.success) {
        setPartners(data.partners)
      }
    } catch (error) {
      console.error('Failed to fetch partners:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load partners'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisbursementSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const clientRequestId = disbursementForm.client_request_id || 
        `UI-${Date.now()}`

      const disbursementData = {
        amount: parseFloat(disbursementForm.amount),
        msisdn: disbursementForm.msisdn,
        tenant_id: disbursementForm.tenant_id,
        customer_id: disbursementForm.customer_id,
        client_request_id: clientRequestId,
        partner_id: disbursementForm.partner_id
      }

      // Get the API key for the selected partner
      const selectedPartner = partners.find(p => p.id === disbursementForm.partner_id)
      if (!selectedPartner) {
        addNotification({
          type: 'error',
          title: 'Disbursement Failed',
          message: 'Please select a partner'
        })
        return
      }

      if (!selectedPartner.api_key) {
        addNotification({
          type: 'error',
          title: 'Invalid Partner',
          message: 'Selected partner does not have a valid API key'
        })
        return
      }
      const apiKeyToUse = selectedPartner.api_key

      // Sending disbursement request

      const response = await fetch('/api/disburse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeyToUse
        },
        body: JSON.stringify(disbursementData)
      })

      const data = await response.json()

      // Response received

      if (response.ok && (data.status === 'accepted' || data.status === 'queued')) {
        addNotification({
          type: 'success',
          title: 'Disbursement Initiated',
          message: `KES ${disbursementForm.amount} sent to ${disbursementForm.msisdn}`
        })
        
        // Reset form
        setDisbursementForm({
          partner_id: '',
          amount: '',
          msisdn: '',
          tenant_id: '',
          customer_id: '',
          client_request_id: ''
        })
      } else {
        console.error('Disbursement failed:', {
          status: response.status,
          statusText: response.statusText,
          data: JSON.stringify(data, null, 2)
        })
        
        addNotification({
          type: 'error',
          title: 'Disbursement Failed',
          message: data.error_message || data.error_code || `HTTP ${response.status}: ${response.statusText}`
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Disbursement Failed',
        message: 'Network error occurred'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handlePartnerChange = (partnerId: string) => {
    const selectedPartner = partners.find(p => p.id === partnerId)
    
    if (selectedPartner) {
      // Auto-populate tenant ID with partner's short code
      const tenantId = selectedPartner.short_code
      // Auto-populate customer ID with a pattern based on partner
      const customerId = `CUST_${selectedPartner.short_code}_${Date.now().toString().slice(-6)}`
      
      setDisbursementForm(prev => ({
        ...prev,
        partner_id: partnerId,
        tenant_id: tenantId,
        customer_id: customerId
      }))
    } else {
      setDisbursementForm(prev => ({
        ...prev,
        partner_id: partnerId,
        tenant_id: '',
        customer_id: ''
      }))
    }
  }

  const resetForm = () => {
    setDisbursementForm({
      partner_id: '',
      amount: '',
      msisdn: '',
      tenant_id: '',
      customer_id: '',
      client_request_id: ''
    })
  }

  return (
    <>
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Send Money</h1>
          <p className="mt-2 text-gray-600">Initiate M-Pesa B2C disbursements to customers</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Disbursement Form</h2>
            <p className="text-sm text-gray-500">Fill in the details to send money via M-Pesa</p>
          </div>
          
          <div className="p-6">
            <form onSubmit={handleDisbursementSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner/Shortcode
                </label>
                <select
                  value={disbursementForm.partner_id}
                  onChange={(e) => handlePartnerChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={loading}
                >
                  <option value="">Select partner/shortcode</option>
                  {partners.filter(p => p.is_active && p.is_mpesa_configured).map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name} ({partner.mpesa_shortcode})
                    </option>
                  ))}
                </select>
                {loading && (
                  <p className="text-xs text-gray-500 mt-1">Loading partners...</p>
                )}
                {disbursementForm.partner_id && (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Partner selected - Tenant ID and Customer ID auto-populated
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number (MSISDN)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="tel"
                      value={disbursementForm.msisdn}
                      onChange={(e) => setDisbursementForm({...disbursementForm, msisdn: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="254XXXXXXXXX"
                      pattern="254[0-9]{9}"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Format: 254 followed by 9 digits (e.g., 254712345678)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount (KES)
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="number"
                      step="0.01"
                      min="1"
                      max="150000"
                      value={disbursementForm.amount}
                      onChange={(e) => setDisbursementForm({...disbursementForm, amount: e.target.value})}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Minimum: KES 1 | Maximum: KES 150,000
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tenant ID
                    {disbursementForm.partner_id && (
                      <span className="ml-2 text-xs text-green-600 font-normal">
                        (Auto-filled from partner)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={disbursementForm.tenant_id}
                    onChange={(e) => setDisbursementForm({...disbursementForm, tenant_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="TENANT_001"
                    required
                  />
                  {disbursementForm.partner_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Auto-populated from selected partner. You can modify if needed.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer ID
                    {disbursementForm.partner_id && (
                      <span className="ml-2 text-xs text-green-600 font-normal">
                        (Auto-generated)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={disbursementForm.customer_id}
                    onChange={(e) => setDisbursementForm({...disbursementForm, customer_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="CUST_001"
                    required
                  />
                  {disbursementForm.partner_id && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-500">
                        Auto-generated based on partner. You can modify if needed.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const selectedPartner = partners.find(p => p.id === disbursementForm.partner_id)
                          if (selectedPartner) {
                            const newCustomerId = `CUST_${selectedPartner.short_code}_${Date.now().toString().slice(-6)}`
                            setDisbursementForm(prev => ({ ...prev, customer_id: newCustomerId }))
                          }
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Generate New
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Client Request ID (Optional)
                </label>
                <input
                  type="text"
                  value={disbursementForm.client_request_id}
                  onChange={(e) => setDisbursementForm({...disbursementForm, client_request_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Auto-generated if empty"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Unique identifier for this disbursement request
                </p>
              </div>

              <div className="flex justify-end space-x-3 pt-6">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Money
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  )
}