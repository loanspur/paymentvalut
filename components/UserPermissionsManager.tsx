'use client'

import { useState, useEffect } from 'react'
import { 
  Shield, 
  Users, 
  Key, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Building2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle
} from 'lucide-react'
import NotificationSystem, { useNotifications } from './NotificationSystem'

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  role: string
  partner_id?: string
  is_active: boolean
  partners?: {
    id: string
    name: string
    short_code: string
  }
}

interface Permission {
  id: string
  permission_type: string
  resource_type: string
  resource_id?: string
  granted_by: string
  granted_at: string
  expires_at?: string
  is_active: boolean
}

interface ShortcodeAccess {
  id: string
  shortcode_id: string
  access_type: string
  granted_by: string
  granted_at: string
  expires_at?: string
  is_active: boolean
  partners: {
    id: string
    name: string
    short_code: string
  }
}

interface UserPermissionsManagerProps {
  user: User
  onClose: () => void
  onUpdate: () => void
}

export default function UserPermissionsManager({ user, onClose, onUpdate }: UserPermissionsManagerProps) {
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [shortcodeAccess, setShortcodeAccess] = useState<ShortcodeAccess[]>([])
  const [partners, setPartners] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  const [showShortcodeModal, setShowShortcodeModal] = useState(false)
  const [newPermission, setNewPermission] = useState({
    permission_type: 'read',
    resource_type: 'disbursements',
    resource_id: '',
    expires_at: ''
  })
  const [newShortcodeAccess, setNewShortcodeAccess] = useState({
    shortcode_id: '',
    access_type: 'read',
    expires_at: ''
  })

  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    loadData()
  }, [user.id])

  const loadData = async () => {
    try {
      await Promise.all([
        fetchPermissions(),
        fetchShortcodeAccess(),
        fetchPartners()
      ])
    } catch (error) {
      console.error('Failed to load permissions data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/permissions`)
      const data = await response.json()
      if (data.success) {
        setPermissions(data.permissions)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch user permissions'
      })
    }
  }

  const fetchShortcodeAccess = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/permissions`)
      const data = await response.json()
      if (data.success) {
        setShortcodeAccess(data.shortcode_access)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch shortcode access'
      })
    }
  }

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners')
      const data = await response.json()
      if (data.success) {
        setPartners(data.partners)
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch partners'
      })
    }
  }

  const handleGrantPermission = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'permission',
          ...newPermission
        })
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Permission granted successfully'
        })
        setShowPermissionModal(false)
        setNewPermission({
          permission_type: 'read',
          resource_type: 'disbursements',
          resource_id: '',
          expires_at: ''
        })
        fetchPermissions()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to grant permission'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to grant permission'
      })
    }
  }

  const handleGrantShortcodeAccess = async () => {
    try {
      const response = await fetch(`/api/users/${user.id}/permissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'shortcode_access',
          ...newShortcodeAccess
        })
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Shortcode access granted successfully'
        })
        setShowShortcodeModal(false)
        setNewShortcodeAccess({
          shortcode_id: '',
          access_type: 'read',
          expires_at: ''
        })
        fetchShortcodeAccess()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to grant shortcode access'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to grant shortcode access'
      })
    }
  }

  const handleRevokePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to revoke this permission?')) return

    try {
      const response = await fetch(`/api/users/${user.id}/permissions?type=permission&permission_id=${permissionId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Permission revoked successfully'
        })
        fetchPermissions()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to revoke permission'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to revoke permission'
      })
    }
  }

  const handleRevokeShortcodeAccess = async (accessId: string) => {
    if (!confirm('Are you sure you want to revoke this shortcode access?')) return

    try {
      const response = await fetch(`/api/users/${user.id}/permissions?type=shortcode_access&access_id=${accessId}`, {
        method: 'DELETE'
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'Shortcode access revoked successfully'
        })
        fetchShortcodeAccess()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to revoke shortcode access'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to revoke shortcode access'
      })
    }
  }

  const getPermissionIcon = (type: string) => {
    switch (type) {
      case 'read': return <Eye className="w-4 h-4" />
      case 'write': return <Edit className="w-4 h-4" />
      case 'delete': return <Trash2 className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      default: return <Key className="w-4 h-4" />
    }
  }

  const getAccessLevelColor = (level: string) => {
    switch (level) {
      case 'read': return 'bg-blue-100 text-blue-800'
      case 'write': return 'bg-yellow-100 text-yellow-800'
      case 'admin': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  const isExpiringSoon = (expiresAt?: string) => {
    if (!expiresAt) return false
    const expiryDate = new Date(expiresAt)
    const now = new Date()
    const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilExpiry <= 7 && daysUntilExpiry > 0
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-2/3 shadow-lg rounded-md bg-white">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading permissions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <NotificationSystem 
        notifications={notifications} 
        onRemove={removeNotification} 
      />

      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-10 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  User Permissions & Access
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            {/* User Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900">{user.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Role</label>
                  <p className="text-sm text-gray-900 capitalize">{user.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Partner</label>
                  <p className="text-sm text-gray-900">
                    {user.partners ? `${user.partners.name} (${user.partners.short_code})` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {/* Permissions Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <Key className="w-4 h-4 mr-2" />
                  Specific Permissions
                </h4>
                <button
                  onClick={() => setShowPermissionModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Grant Permission
                </button>
              </div>

              {permissions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Granted</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {permissions.map((permission) => (
                        <tr key={permission.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {getPermissionIcon(permission.permission_type)}
                              <span className="ml-1 capitalize">{permission.permission_type}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                            <div>
                              <div className="font-medium">{permission.resource_type}</div>
                              {permission.resource_id && (
                                <div className="text-xs text-gray-500">ID: {permission.resource_id}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(permission.granted_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {permission.expires_at ? (
                              <div className="flex items-center">
                                {isExpired(permission.expires_at) ? (
                                  <XCircle className="w-4 h-4 text-red-500 mr-1" />
                                ) : isExpiringSoon(permission.expires_at) ? (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500 mr-1" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                )}
                                <span className={isExpired(permission.expires_at) ? 'text-red-600' : isExpiringSoon(permission.expires_at) ? 'text-yellow-600' : 'text-gray-500'}>
                                  {new Date(permission.expires_at).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleRevokePermission(permission.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Key className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No specific permissions granted</p>
                  <p className="text-sm text-gray-400">User relies on role-based permissions</p>
                </div>
              )}
            </div>

            {/* Shortcode Access Section */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-md font-medium text-gray-900 flex items-center">
                  <Building2 className="w-4 h-4 mr-2" />
                  Shortcode Access
                </h4>
                <button
                  onClick={() => setShowShortcodeModal(true)}
                  className="btn btn-primary btn-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Grant Access
                </button>
              </div>

              {shortcodeAccess.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Shortcode</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Access Level</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Granted</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {shortcodeAccess.map((access) => (
                        <tr key={access.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div>
                              <div className="font-medium text-gray-900">{access.partners.name}</div>
                              <div className="text-sm text-gray-500">{access.partners.short_code}</div>
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getAccessLevelColor(access.access_type)}`}>
                              {getPermissionIcon(access.access_type)}
                              <span className="ml-1 capitalize">{access.access_type}</span>
                            </span>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {new Date(access.granted_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm">
                            {access.expires_at ? (
                              <div className="flex items-center">
                                {isExpired(access.expires_at) ? (
                                  <XCircle className="w-4 h-4 text-red-500 mr-1" />
                                ) : isExpiringSoon(access.expires_at) ? (
                                  <AlertTriangle className="w-4 h-4 text-yellow-500 mr-1" />
                                ) : (
                                  <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                )}
                                <span className={isExpired(access.expires_at) ? 'text-red-600' : isExpiringSoon(access.expires_at) ? 'text-yellow-600' : 'text-gray-500'}>
                                  {new Date(access.expires_at).toLocaleDateString()}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400">Never</span>
                            )}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleRevokeShortcodeAccess(access.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500">No shortcode access granted</p>
                  <p className="text-sm text-gray-400">User can only access their assigned partner's shortcode</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grant Permission Modal */}
      {showPermissionModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Grant Permission</h3>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                handleGrantPermission()
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permission Type</label>
                  <select
                    value={newPermission.permission_type}
                    onChange={(e) => setNewPermission({...newPermission, permission_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="read">Read</option>
                    <option value="write">Write</option>
                    <option value="delete">Delete</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource Type</label>
                  <select
                    value={newPermission.resource_type}
                    onChange={(e) => setNewPermission({...newPermission, resource_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="disbursements">Disbursements</option>
                    <option value="partners">Partners</option>
                    <option value="users">Users</option>
                    <option value="transactions">Transactions</option>
                    <option value="balance_monitoring">Balance Monitoring</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource ID (Optional)</label>
                  <input
                    type="text"
                    value={newPermission.resource_id}
                    onChange={(e) => setNewPermission({...newPermission, resource_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty for all resources"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newPermission.expires_at}
                    onChange={(e) => setNewPermission({...newPermission, expires_at: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPermissionModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Grant Permission
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Grant Shortcode Access Modal */}
      {showShortcodeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-60">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Grant Shortcode Access</h3>
                <button
                  onClick={() => setShowShortcodeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                handleGrantShortcodeAccess()
              }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Shortcode</label>
                  <select
                    value={newShortcodeAccess.shortcode_id}
                    onChange={(e) => setNewShortcodeAccess({...newShortcodeAccess, shortcode_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a shortcode</option>
                    {partners.map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.short_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Level</label>
                  <select
                    value={newShortcodeAccess.access_type}
                    onChange={(e) => setNewShortcodeAccess({...newShortcodeAccess, access_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="read">Read Only</option>
                    <option value="write">Read & Write</option>
                    <option value="admin">Full Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newShortcodeAccess.expires_at}
                    onChange={(e) => setNewShortcodeAccess({...newShortcodeAccess, expires_at: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowShortcodeModal(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Grant Access
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
