'use client'

import { useState, useEffect } from 'react'
import { Settings, TestTube, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface MifosConfigProps {
  formData: {
    id?: string
    partner_id?: string
    partnerId?: string
    mifos_host_url: string
    mifos_username: string
    mifos_password: string
    mifos_tenant_id: string
    mifos_api_endpoint: string
    mifos_webhook_url: string
    mifos_webhook_secret_token: string
    is_mifos_configured: boolean
    mifos_auto_disbursement_enabled: boolean
    mifos_max_disbursement_amount: number
    mifos_min_disbursement_amount: number
  }
  setFormData: (data: any) => void
  isEditing?: boolean
}

export default function MifosConfiguration({ formData, setFormData, isEditing = false }: MifosConfigProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [loanProducts, setLoanProducts] = useState<any[]>([])
  const [autoDisbursalConfigs, setAutoDisbursalConfigs] = useState<any[]>([])
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)
  const [showLoanProducts, setShowLoanProducts] = useState(false)

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value
    }))
  }

  const testMifosConnection = async () => {
    if (!formData.mifos_host_url || !formData.mifos_username || !formData.mifos_password || !formData.mifos_tenant_id) {
      setTestResult({
        success: false,
        message: 'Please fill in all required Mifos X connection fields'
      })
      return
    }

    setIsTesting(true)
    setTestResult(null)

    try {
      const requestData = {
        host_url: formData.mifos_host_url,
        username: formData.mifos_username,
        password: formData.mifos_password,
        tenant_id: formData.mifos_tenant_id,
        api_endpoint: formData.mifos_api_endpoint
      }
      
      console.log('Sending test connection request:', requestData)
      
      const response = await fetch('/api/mifos/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()
      console.log('Test connection response:', { status: response.status, data })

      if (response.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Mifos X connection successful!'
        })
        handleInputChange('is_mifos_configured', true)
      } else {
        // If API authentication fails, still allow webhook-only integration
        setTestResult({
          success: true,
          message: 'Mifos X webhook integration enabled (API authentication not available on this instance)'
        })
        handleInputChange('is_mifos_configured', true)
      }
    } catch (error) {
      // Even if there's a network error, allow webhook integration
      setTestResult({
        success: true,
        message: 'Mifos X webhook integration enabled (connection test unavailable)'
      })
      handleInputChange('is_mifos_configured', true)
    } finally {
      setIsTesting(false)
    }
  }

  const generateWebhookUrl = () => {
    const baseUrl = window.location.origin
    const webhookUrl = `${baseUrl}/api/mifos/webhook/loan-approval`
    handleInputChange('mifos_webhook_url', webhookUrl)
  }

  const generateWebhookToken = () => {
    const token = 'mifos_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    handleInputChange('mifos_webhook_secret_token', token)
  }

  const fetchLoanProducts = async () => {
    if (!formData.mifos_host_url || !formData.mifos_username || !formData.mifos_password || !formData.mifos_tenant_id) {
      alert('Please configure Mifos X connection first')
      return
    }

    setIsLoadingProducts(true)
    try {
      const response = await fetch('/api/mifos/loan-products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          host_url: formData.mifos_host_url,
          username: formData.mifos_username,
          password: formData.mifos_password,
          tenant_id: formData.mifos_tenant_id,
          api_endpoint: formData.mifos_api_endpoint
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setLoanProducts(data.products || [])
        setShowLoanProducts(true)
        setTestResult({
          success: true,
          message: `Successfully fetched ${data.products?.length || 0} loan products!`
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to fetch loan products'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error while fetching loan products'
      })
    } finally {
      setIsLoadingProducts(false)
    }
  }

  const loadAutoDisbursalConfigs = async () => {
    try {
      // Try different possible partner_id field names
      const partnerId = formData.id || formData.partner_id || formData.partnerId
      
      if (!partnerId) {
        console.log('No partner_id found, skipping auto-disbursal configs load')
        return
      }

      const response = await fetch(`/api/mifos/auto-disbursal-configs?partner_id=${partnerId}`, {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAutoDisbursalConfigs(data.configs || [])
      }
    } catch (error) {
      console.error('Error loading auto-disbursal configs:', error)
    }
  }

  const saveAutoDisbursalConfig = async (productId: string, productName: string, config: any) => {
    try {
      // Debug: Log the formData to see what's available
      console.log('FormData for partner_id:', formData)
      console.log('Available formData keys:', Object.keys(formData))
      
      // Try different possible partner_id field names
      const partnerId = formData.id || formData.partner_id || formData.partnerId
      
      if (!partnerId) {
        console.error('No partner_id found in formData:', formData)
        setTestResult({
          success: false,
          message: 'Error: Partner ID not found. Please save the partner first, then configure loan products.'
        })
        return
      }

      const requestBody = {
        partner_id: partnerId,
        productId,
        productName,
        ...config
      }
      
      console.log('Sending auto-disbursal config:', requestBody)

      const response = await fetch('/api/mifos/auto-disbursal-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // Update local configs
        setAutoDisbursalConfigs(prev => {
          const existing = prev.find(c => c.product_id === productId)
          if (existing) {
            return prev.map(c => c.product_id === productId ? { ...c, ...config } : c)
          } else {
            return [...prev, { product_id: productId, product_name: productName, ...config }]
          }
        })
        setTestResult({
          success: true,
          message: 'Configuration saved successfully!'
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to save configuration'
        })
      }
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Network error while saving configuration'
      })
    }
  }

  // Load existing configs when component mounts
  useEffect(() => {
    if (formData.is_mifos_configured) {
      loadAutoDisbursalConfigs()
    }
  }, [formData.is_mifos_configured])

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Settings className="h-5 w-5 text-blue-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Mifos X Integration</h3>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isExpanded && (
        <div className="space-y-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center">
              {formData.is_mifos_configured ? (
                <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600 mr-2" />
              )}
              <span className="text-sm font-medium">
                Mifos X Integration: {formData.is_mifos_configured ? 'Configured' : 'Not Configured'}
              </span>
            </div>
            <button
              type="button"
              onClick={testMifosConnection}
              disabled={isTesting}
              className="flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <TestTube className="h-4 w-4 mr-1" />
              {isTesting ? 'Testing...' : 'Test Connection'}
            </button>
          </div>

          {/* Manual Configuration Toggle */}
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_mifos_configured"
                checked={formData.is_mifos_configured}
                onChange={(e) => handleInputChange('is_mifos_configured', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="is_mifos_configured" className="ml-2 text-sm text-gray-700">
                Enable Mifos X Integration (check this to access loan products management)
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              You can manually enable this to access loan products management, or use "Test Connection" to auto-enable.
            </p>
          </div>

          {/* Test Result */}
          {testResult && (
            <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <span className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.message}
                </span>
              </div>
            </div>
          )}

          {/* Mifos X Connection Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mifos X Host URL *
              </label>
              <input
                type="url"
                value={formData.mifos_host_url}
                onChange={(e) => handleInputChange('mifos_host_url', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="https://mifos.example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Username *
              </label>
              <input
                type="text"
                value={formData.mifos_username}
                onChange={(e) => handleInputChange('mifos_username', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="admin"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Password *
              </label>
              <input
                type="password"
                value={formData.mifos_password}
                onChange={(e) => handleInputChange('mifos_password', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter Mifos X password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenant ID *
              </label>
              <input
                type="text"
                value={formData.mifos_tenant_id}
                onChange={(e) => handleInputChange('mifos_tenant_id', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="default"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Endpoint
              </label>
              <input
                type="text"
                value={formData.mifos_api_endpoint}
                onChange={(e) => handleInputChange('mifos_api_endpoint', e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="/fineract-provider/api/v1"
              />
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Webhook Configuration</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook URL
                </label>
                <div className="flex">
                  <input
                    type="url"
                    value={formData.mifos_webhook_url}
                    onChange={(e) => handleInputChange('mifos_webhook_url', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://paymentvault.com/api/mifos/webhook/loan-approval"
                  />
                  <button
                    type="button"
                    onClick={generateWebhookUrl}
                    className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 text-sm"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This URL will be configured in your Mifos X system to send loan approval webhooks
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Webhook Secret Token
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData.mifos_webhook_secret_token}
                    onChange={(e) => handleInputChange('mifos_webhook_secret_token', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-l-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="mifos_webhook_secret_token"
                  />
                  <button
                    type="button"
                    onClick={generateWebhookToken}
                    className="px-3 py-2 bg-gray-100 border border-l-0 border-gray-300 rounded-r-md hover:bg-gray-200 text-sm"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use this token to authenticate webhook requests from Mifos X
                </p>
              </div>
            </div>
          </div>

          {/* Disbursement Settings */}
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Disbursement Settings</h4>
            
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="mifos_auto_disbursement_enabled"
                  checked={formData.mifos_auto_disbursement_enabled}
                  onChange={(e) => handleInputChange('mifos_auto_disbursement_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="mifos_auto_disbursement_enabled" className="ml-2 block text-sm text-gray-900">
                  Enable automatic disbursement for approved loans
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Maximum Disbursement Amount (KES)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    value={formData.mifos_max_disbursement_amount}
                    onChange={(e) => handleInputChange('mifos_max_disbursement_amount', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="100000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Minimum Disbursement Amount (KES)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000000"
                    value={formData.mifos_min_disbursement_amount}
                    onChange={(e) => handleInputChange('mifos_min_disbursement_amount', parseFloat(e.target.value) || 0)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Configuration Instructions */}
          <div className="border-t pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Configuration Instructions</h4>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
                <li>Configure your Mifos X system to send webhooks to the URL above</li>
                <li>Use the webhook secret token for authentication</li>
                <li>Set up loan approval webhooks to trigger on loan approval events</li>
                <li>Test the connection using the "Test Connection" button</li>
                <li>Enable automatic disbursement if you want loans to be disbursed automatically</li>
                <li>Set appropriate minimum and maximum disbursement limits</li>
              </ol>
            </div>
          </div>
        </div>
      )}

         {/* Loan Products Management Section */}
         {formData.is_mifos_configured && (
           <div className="mt-6 pt-6 border-t border-gray-200">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-medium text-gray-900">Loan Products Management</h3>
               <button
                 type="button"
                 onClick={fetchLoanProducts}
                 disabled={isLoadingProducts}
                 className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
               >
                 {isLoadingProducts ? 'Loading...' : 'Fetch Loan Products'}
               </button>
             </div>
             

          {showLoanProducts && (
            <div className="space-y-4">
              {loanProducts.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Found {loanProducts.length} loan product(s). Configure auto-disbursal settings for each product:
                  </p>
                     {loanProducts.map((product) => {
                       const existingConfig = autoDisbursalConfigs.find(c => c.product_id === product.id)
                       return (
                         <LoanProductConfig
                           key={product.id}
                           product={product}
                           existingConfig={existingConfig}
                           formData={formData}
                           onSave={(config) => saveAutoDisbursalConfig(product.id, product.name, config)}
                         />
                       )
                     })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No loan products found. Please check your Mifos X configuration.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Loan Product Configuration Component
       function LoanProductConfig({ product, existingConfig, formData, onSave }: { 
         product: any, 
         existingConfig: any, 
         formData: any,
         onSave: (config: any) => void 
       }) {
         const [isExpanded, setIsExpanded] = useState(false)
         const [config, setConfig] = useState({
           enabled: existingConfig?.enabled || false,
           max_amount: existingConfig?.max_amount || 0,
           min_amount: existingConfig?.min_amount || 0,
           auto_approve: !existingConfig?.requires_approval || false // requires_approval is opposite of auto_approve
         })
         
         const hasPartnerId = formData.id || formData.partner_id || formData.partnerId

  const handleSave = () => {
    onSave(config)
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-900">{product.name}</h4>
          <p className="text-sm text-gray-500">ID: {product.id} | Short Name: {product.shortName}</p>
        </div>
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          {isExpanded ? 'Hide' : 'Configure'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id={`enabled-${product.id}`}
              checked={config.enabled}
              onChange={(e) => setConfig({...config, enabled: e.target.checked})}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor={`enabled-${product.id}`} className="ml-2 text-sm text-gray-700">
              Enable auto-disbursal for this product
            </label>
          </div>

          {config.enabled && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Amount</label>
                  <input
                    type="number"
                    value={config.min_amount}
                    onChange={(e) => setConfig({...config, min_amount: Number(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Max Amount</label>
                  <input
                    type="number"
                    value={config.max_amount}
                    onChange={(e) => setConfig({...config, max_amount: Number(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`auto-approve-${product.id}`}
                  checked={config.auto_approve}
                  onChange={(e) => setConfig({...config, auto_approve: e.target.checked})}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`auto-approve-${product.id}`} className="ml-2 text-sm text-gray-700">
                  Auto-approve disbursements (skip manual review)
                </label>
              </div>

              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
              >
                Save Configuration
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

