'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../../components/AuthProvider'
import { 
  Package, 
  Settings, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  AlertCircle,
  DollarSign,
  Calendar,
  Percent,
  Users
} from 'lucide-react'

interface LoanProduct {
  id: number
  name: string
  shortName: string
  description: string
  currency: {
    code: string
    name: string
  }
  principal: number
  numberOfRepayments: number
  repaymentEvery: number
  repaymentFrequencyType: {
    id: number
    code: string
    value: string
  }
  interestRatePerPeriod: number
  interestRateFrequencyType: {
    id: number
    code: string
    value: string
  }
  status: {
    id: number
    code: string
    value: string
  }
  charges: Array<{
    id: number
    name: string
    amount: number
    currency: {
      code: string
      name: string
    }
  }>
}

interface AutoDisbursalConfig {
  productId: number
  productName: string
  enabled: boolean
  maxAmount: number
  minAmount: number
  requiresApproval: boolean
}

export default function LoanProductsPage() {
  const { user, isAuthenticated } = useAuth()
  const [loanProducts, setLoanProducts] = useState<LoanProduct[]>([])
  const [autoDisbursalConfigs, setAutoDisbursalConfigs] = useState<AutoDisbursalConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<LoanProduct | null>(null)

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchLoanProducts()
      fetchAutoDisbursalConfigs()
    }
  }, [isAuthenticated, user])

  const fetchLoanProducts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/mifos/loan-products', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setLoanProducts(data.products || [])
      } else {
        setError('Failed to fetch loan products')
      }
    } catch (error) {
      setError('Network error while fetching loan products')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAutoDisbursalConfigs = async () => {
    try {
      const response = await fetch('/api/mifos/auto-disbursal-configs', {
        method: 'GET',
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setAutoDisbursalConfigs(data.configs || [])
      }
    } catch (error) {
      console.error('Failed to fetch auto-disbursal configs:', error)
    }
  }

  const handleConfigureAutoDisbursal = (product: LoanProduct) => {
    setSelectedProduct(product)
    setShowConfigModal(true)
  }

  const handleSaveAutoDisbursalConfig = async (config: AutoDisbursalConfig) => {
    try {
      const response = await fetch('/api/mifos/auto-disbursal-configs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(config)
      })

      if (response.ok) {
        await fetchAutoDisbursalConfigs()
        setShowConfigModal(false)
        setSelectedProduct(null)
      } else {
        setError('Failed to save auto-disbursal configuration')
      }
    } catch (error) {
      setError('Network error while saving configuration')
    }
  }

  const getAutoDisbursalConfig = (productId: number) => {
    return autoDisbursalConfigs.find(config => config.productId === productId)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
        <p className="ml-2 text-gray-600">Loading loan products...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="ml-2 text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <Package className="h-8 w-8 mr-3 text-blue-600" /> Loan Products
          </h1>
          <p className="text-gray-600 mt-2">Manage loan products and auto-disbursal configurations</p>
        </div>
        <button
          onClick={fetchLoanProducts}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300"
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </button>
      </div>

      {loanProducts.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Loan Products Found</h3>
          <p className="text-gray-500">No loan products are available from your Mifos X system.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loanProducts.map((product) => {
            const config = getAutoDisbursalConfig(product.id)
            return (
              <div key={product.id} className="bg-white rounded-lg shadow-md p-6 border-t-4 border-blue-500">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.shortName}</p>
                  </div>
                  <div className="flex items-center">
                    {config?.enabled ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center text-sm text-gray-600">
                    <DollarSign className="h-4 w-4 mr-2" />
                    <span>Principal: {product.currency.code} {product.principal.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Percent className="h-4 w-4 mr-2" />
                    <span>Interest Rate: {product.interestRatePerPeriod}%</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>Repayments: {product.numberOfRepayments} × {product.repaymentEvery} {product.repaymentFrequencyType.value}</span>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="h-4 w-4 mr-2" />
                    <span>Status: {product.status.value}</span>
                  </div>
                </div>

                {config && (
                  <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
                    <h4 className="text-sm font-medium text-green-800 mb-2">Auto-Disbursal Configuration</h4>
                    <div className="text-xs text-green-700 space-y-1">
                      <p>Min Amount: {product.currency.code} {config.minAmount.toLocaleString()}</p>
                      <p>Max Amount: {product.currency.code} {config.maxAmount.toLocaleString()}</p>
                      <p>Requires Approval: {config.requiresApproval ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => handleConfigureAutoDisbursal(product)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {config ? 'Update Auto-Disbursal' : 'Configure Auto-Disbursal'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Auto-Disbursal Configuration Modal */}
      {showConfigModal && selectedProduct && (
        <AutoDisbursalConfigModal
          product={selectedProduct}
          existingConfig={getAutoDisbursalConfig(selectedProduct.id)}
          onSave={handleSaveAutoDisbursalConfig}
          onClose={() => {
            setShowConfigModal(false)
            setSelectedProduct(null)
          }}
        />
      )}
    </div>
  )
}

// Auto-Disbursal Configuration Modal Component
interface AutoDisbursalConfigModalProps {
  product: LoanProduct
  existingConfig?: AutoDisbursalConfig
  onSave: (config: AutoDisbursalConfig) => void
  onClose: () => void
}

function AutoDisbursalConfigModal({ product, existingConfig, onSave, onClose }: AutoDisbursalConfigModalProps) {
  const [config, setConfig] = useState<AutoDisbursalConfig>({
    productId: product.id,
    productName: product.name,
    enabled: existingConfig?.enabled || false,
    maxAmount: existingConfig?.maxAmount || product.principal,
    minAmount: existingConfig?.minAmount || 100,
    requiresApproval: existingConfig?.requiresApproval || false
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(config)
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configure Auto-Disbursal for {product.name}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="enabled"
                checked={config.enabled}
                onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="enabled" className="ml-2 block text-sm text-gray-900">
                Enable auto-disbursal for this product
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Amount ({product.currency.code})
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.minAmount}
                  onChange={(e) => setConfig({ ...config, minAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Amount ({product.currency.code})
                </label>
                <input
                  type="number"
                  min="1"
                  value={config.maxAmount}
                  onChange={(e) => setConfig({ ...config, maxAmount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="requiresApproval"
                checked={config.requiresApproval}
                onChange={(e) => setConfig({ ...config, requiresApproval: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="requiresApproval" className="ml-2 block text-sm text-gray-900">
                Require manual approval before disbursement
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Configuration
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

