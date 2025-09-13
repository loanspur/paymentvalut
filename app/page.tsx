'use client'

import { useState, useEffect } from 'react'
import { 
  DollarSign, 
  Send, 
  History, 
  TrendingUp, 
  Building2,
  Phone,
  CreditCard,
  RefreshCw,
  Settings,
  AlertTriangle
} from 'lucide-react'
import NotificationSystem, { useNotifications } from '../components/NotificationSystem'

interface Partner {
  id: string
  name: string
  short_code: string
  mpesa_shortcode: string
  is_mpesa_configured: boolean
  is_active: boolean
}

interface DisbursementRequest {
  id: string
  amount: number
  msisdn: string
  tenant_id: string
  customer_id: string
  client_request_id: string
  status: string
  conversation_id?: string
  created_at: string
  partner_name?: string
}

export default function HomePage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [disbursements, setDisbursements] = useState<DisbursementRequest[]>([])
  const [loading, setLoading] = useState(true)

  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      await Promise.all([
        fetchPartners(),
        fetchDisbursements()
      ])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPartners = async () => {
    try {
      console.log('🔍 Fetching partners...')
      const response = await fetch('/api/partners')
      const data = await response.json()
      console.log('📊 Partners response:', data)
      if (data.success) {
        setPartners(data.partners)
        console.log('✅ Partners loaded:', data.partners.length)
      }
    } catch (error) {
      console.error('❌ Failed to fetch partners:', error)
    }
  }

  const fetchDisbursements = async () => {
    try {
      console.log('🔍 Fetching disbursements...')
      const response = await fetch('/api/disbursements')
      const data = await response.json()
      console.log('📊 Disbursements response:', data)
      if (data.success) {
        setDisbursements(data.disbursements)
        console.log('✅ Disbursements loaded:', data.disbursements.length)
      }
    } catch (error) {
      console.error('❌ Failed to fetch disbursements:', error)
    }
  }


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
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

      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            M-Pesa B2C Disbursement System
          </h2>
          <p className="text-gray-600">
            Secure M-Pesa B2C disbursement management with partner integration
          </p>
          <div className="mt-2 text-sm text-gray-500">
            Partners: {partners.length} | Recent Transactions: {disbursements.length}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <a
            href="/disburse"
            className="card hover:shadow-lg transition-shadow cursor-pointer"
          >
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <Send className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Send Money</h3>
                <p className="text-sm text-gray-600">Initiate disbursement</p>
              </div>
            </div>
          </a>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <History className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">History</h3>
                <p className="text-sm text-gray-600">{disbursements.length} transactions</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Partners</h3>
                <p className="text-sm text-gray-600">{partners.length} active</p>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-gray-900">Balance</h3>
                <p className="text-sm text-gray-600">Monitor accounts</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Disbursements */}
        <div className="card mb-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Recent Disbursements</h3>
            <a
              href="/disburse"
              className="btn btn-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              New Disbursement
            </a>
          </div>

          {disbursements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {disbursements.slice(0, 10).map((disbursement) => (
                    <tr key={disbursement.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {disbursement.msisdn}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        KES {disbursement.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          disbursement.status === 'completed' ? 'bg-green-100 text-green-800' :
                          disbursement.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {disbursement.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {disbursement.partner_name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(disbursement.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Send className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No disbursements yet</h3>
              <p className="text-gray-500 mb-4">Start by creating your first disbursement</p>
              <a
                href="/disburse"
                className="btn btn-primary"
              >
                <Send className="w-4 h-4 mr-2" />
                Create Disbursement
              </a>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}