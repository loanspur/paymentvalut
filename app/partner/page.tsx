'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import NotificationSystem, { useNotifications } from '../../components/NotificationSystem'

interface User {
  id: string
  email: string
  role: 'admin' | 'partner'
  partner_id?: string
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

interface PartnerShortcode {
  id: string
  shortcode: string
  shortcode_name: string
  mpesa_environment: string
  is_mpesa_configured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  mpesa_consumer_key?: string
  mpesa_consumer_secret?: string
  mpesa_passkey?: string
  mpesa_initiator_name?: string
  mpesa_initiator_password?: string
}

interface DisbursementRequest {
  id: string
  amount: number
  msisdn: string
  status: string
  created_at: string
  updated_at: string
  partner_shortcodes: {
    shortcode: string
    shortcode_name: string
  }
}

export default function PartnerDashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [shortcodes, setShortcodes] = useState<PartnerShortcode[]>([])
  const [disbursements, setDisbursements] = useState<DisbursementRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showShortcodeModal, setShowShortcodeModal] = useState(false)
  const [editingShortcode, setEditingShortcode] = useState<PartnerShortcode | null>(null)
  const [shortcodeForm, setShortcodeForm] = useState({
    shortcode: '',
    shortcode_name: '',
    mpesa_consumer_key: '',
    mpesa_consumer_secret: '',
    mpesa_passkey: '',
    mpesa_initiator_name: '',
    mpesa_initiator_password: '',
    mpesa_environment: 'sandbox'
  })

  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      if (!sessionToken) {
        window.location.href = '/login'
        return
      }

      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      const data = await response.json()
      
      if (!data.success || !data.user || data.user.role !== 'partner') {
        window.location.href = '/login'
        return
      }

      setUser(data.user)
      await Promise.all([
        fetchShortcodes(),
        fetchDisbursements()
      ])
    } catch (error) {
      console.error('Auth check failed:', error)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  const fetchShortcodes = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      const response = await fetch('/api/partner/shortcodes', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setShortcodes(data.shortcodes)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch shortcodes'
      })
    }
  }

  const fetchDisbursements = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      const response = await fetch('/api/partner/disbursements', {
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      const data = await response.json()
      if (data.success) {
        setDisbursements(data.disbursements)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch disbursements'
      })
    }
  }

  const handleCreateShortcode = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      const response = await fetch('/api/partner/shortcodes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(shortcodeForm)
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Shortcode created successfully'
        })
        setShowShortcodeModal(false)
        setShortcodeForm({
          shortcode: '',
          shortcode_name: '',
          mpesa_consumer_key: '',
          mpesa_consumer_secret: '',
          mpesa_passkey: '',
          mpesa_initiator_name: '',
          mpesa_initiator_password: '',
          mpesa_environment: 'sandbox'
        })
        fetchShortcodes()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create shortcode'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create shortcode'
      })
    }
  }

  const handleEditShortcode = (shortcode: PartnerShortcode) => {
    setEditingShortcode(shortcode)
    setShortcodeForm({
      shortcode: shortcode.shortcode,
      shortcode_name: shortcode.shortcode_name,
      mpesa_consumer_key: shortcode.mpesa_consumer_key || '',
      mpesa_consumer_secret: shortcode.mpesa_consumer_secret || '',
      mpesa_passkey: shortcode.mpesa_passkey || '',
      mpesa_initiator_name: shortcode.mpesa_initiator_name || '',
      mpesa_initiator_password: shortcode.mpesa_initiator_password || '',
      mpesa_environment: shortcode.mpesa_environment
    })
    setShowShortcodeModal(true)
  }

  const handleUpdateShortcode = async () => {
    if (!editingShortcode) return

    try {
      const sessionToken = localStorage.getItem('session_token')
      const response = await fetch(`/api/partner/shortcodes/${editingShortcode.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify(shortcodeForm)
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Shortcode updated successfully'
        })
        setShowShortcodeModal(false)
        setEditingShortcode(null)
        setShortcodeForm({
          shortcode: '',
          shortcode_name: '',
          mpesa_consumer_key: '',
          mpesa_consumer_secret: '',
          mpesa_passkey: '',
          mpesa_initiator_name: '',
          mpesa_initiator_password: '',
          mpesa_environment: 'sandbox'
        })
        fetchShortcodes()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update shortcode'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update shortcode'
      })
    }
  }

  const handleDeleteShortcode = async (shortcodeId: string) => {
    if (!confirm('Are you sure you want to delete this shortcode?')) return

    try {
      const sessionToken = localStorage.getItem('session_token')
      const response = await fetch(`/api/partner/shortcodes/${shortcodeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Shortcode deleted successfully'
        })
        fetchShortcodes()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete shortcode'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete shortcode'
      })
    }
  }

  const logout = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token')
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`
        }
      })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      localStorage.removeItem('session_token')
      window.location.href = '/login'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NotificationSystem notifications={notifications} onRemove={removeNotification} />
      
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Partner Dashboard</h1>
              <p className="text-gray-600">Welcome, {user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Shortcodes</h3>
            <p className="text-3xl font-bold text-blue-600">{shortcodes.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Active Shortcodes</h3>
            <p className="text-3xl font-bold text-green-600">
              {shortcodes.filter(s => s.is_active).length}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Disbursements</h3>
            <p className="text-3xl font-bold text-purple-600">{disbursements.length}</p>
          </div>
        </div>

        {/* Shortcodes Section */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">My Shortcodes</h2>
              <button
                onClick={() => setShowShortcodeModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                Add Shortcode
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shortcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Environment
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
                {shortcodes.map((shortcode) => (
                  <tr key={shortcode.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {shortcode.shortcode}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {shortcode.shortcode_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        shortcode.mpesa_environment === 'production' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {shortcode.mpesa_environment}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        shortcode.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {shortcode.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleEditShortcode(shortcode)}
                        className="text-blue-600 hover:text-blue-900 mr-3"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteShortcode(shortcode.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Disbursements Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Recent Disbursements</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Shortcode
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {disbursements.map((disbursement) => (
                  <tr key={disbursement.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      KES {disbursement.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {disbursement.msisdn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        disbursement.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : disbursement.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {disbursement.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {disbursement.partner_shortcodes?.shortcode_name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(disbursement.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Shortcode Modal */}
      {showShortcodeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingShortcode ? 'Edit Shortcode' : 'Add New Shortcode'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shortcode</label>
                  <input
                    type="text"
                    value={shortcodeForm.shortcode}
                    onChange={(e) => setShortcodeForm({...shortcodeForm, shortcode: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., 3037935"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shortcode Name</label>
                  <input
                    type="text"
                    value={shortcodeForm.shortcode_name}
                    onChange={(e) => setShortcodeForm({...shortcodeForm, shortcode_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="e.g., Main Shortcode"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">M-Pesa Consumer Key</label>
                  <input
                    type="text"
                    value={shortcodeForm.mpesa_consumer_key}
                    onChange={(e) => setShortcodeForm({...shortcodeForm, mpesa_consumer_key: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Consumer Key"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">M-Pesa Consumer Secret</label>
                  <input
                    type="password"
                    value={shortcodeForm.mpesa_consumer_secret}
                    onChange={(e) => setShortcodeForm({...shortcodeForm, mpesa_consumer_secret: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    placeholder="Consumer Secret"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Environment</label>
                  <select
                    value={shortcodeForm.mpesa_environment}
                    onChange={(e) => setShortcodeForm({...shortcodeForm, mpesa_environment: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="sandbox">Sandbox</option>
                    <option value="production">Production</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowShortcodeModal(false)
                    setEditingShortcode(null)
                    setShortcodeForm({
                      shortcode: '',
                      shortcode_name: '',
                      mpesa_consumer_key: '',
                      mpesa_consumer_secret: '',
                      mpesa_passkey: '',
                      mpesa_initiator_name: '',
                      mpesa_initiator_password: '',
                      mpesa_environment: 'sandbox'
                    })
                  }}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={editingShortcode ? handleUpdateShortcode : handleCreateShortcode}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  {editingShortcode ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
