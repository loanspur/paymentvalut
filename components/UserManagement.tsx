'use client'

import { useState, useEffect } from 'react'
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  RefreshCw,
  Building2,
  Shield,
  UserCheck,
  UserX,
  Key,
  Settings,
  User
} from 'lucide-react'
import NotificationSystem, { useNotifications } from './NotificationSystem'
import UserPermissionsManager from './UserPermissionsManager'

interface User {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  department?: string
  role: 'super_admin' | 'admin' | 'partner_admin' | 'operator' | 'viewer' | 'partner'
  partner_id?: string
  is_active: boolean
  email_verified?: boolean
  last_activity_at?: string
  notes?: string
  created_at: string
  updated_at: string
  partners?: {
    id: string
    name: string
    short_code: string
  }
  shortcode_access?: Array<{
    shortcode_id: string
    shortcode: string
    partner_name: string
    access_type: string
    granted_at: string
  }>
}

interface Partner {
  id: string
  name: string
  short_code: string
  is_active: boolean
  created_at: string
  updated_at: string
}

interface UserManagementProps {
  isAdmin?: boolean
  className?: string
}

export default function UserManagement({ isAdmin = false, className = '' }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([])
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showPermissionsModal, setShowPermissionsModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    phone_number: '',
    department: '',
    role: 'partner' as 'super_admin' | 'admin' | 'partner_admin' | 'operator' | 'viewer' | 'partner',
    partner_id: '',
    shortcode_access: [] as any[],
    notes: '',
    two_factor_enabled: false,
    password_change_required: true,
    profile_picture_url: ''
  })
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isValidating, setIsValidating] = useState(false)

  const { notifications, addNotification, removeNotification } = useNotifications()

  useEffect(() => {
    if (isAdmin) {
      loadData()
    }
  }, [isAdmin])

  // Form validation function
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}
    
    // Mandatory fields validation
    if (!userForm.email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
      errors.email = 'Please enter a valid email address'
    }
    
    if (!userForm.password.trim() && !editingUser) {
      errors.password = 'Password is required for new users'
    } else if (userForm.password.trim() && userForm.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long'
    }
    
    if (!userForm.first_name.trim()) {
      errors.first_name = 'First name is required'
    }
    
    if (!userForm.last_name.trim()) {
      errors.last_name = 'Last name is required'
    }
    
    if (!userForm.phone_number.trim()) {
      errors.phone_number = 'Phone number is required for OTP verification'
    } else if (!/^\+?[1-9]\d{1,14}$/.test(userForm.phone_number.replace(/\s/g, ''))) {
      errors.phone_number = 'Please enter a valid phone number (e.g., +254700000000)'
    }
    
    if (!userForm.department.trim()) {
      errors.department = 'Department is required for organizational structure'
    }
    
    // Partner-specific validation
    if (['partner', 'partner_admin', 'operator', 'viewer'].includes(userForm.role) && !userForm.partner_id) {
      errors.partner_id = 'Partner assignment is required for this role'
    }
    
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // Real-time validation
  const handleFieldChange = (field: string, value: string | boolean) => {
    setUserForm(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const loadData = async () => {
    try {
      await Promise.all([
        fetchUsers(),
        fetchPartners()
      ])
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/user-management', {
        credentials: 'include'
      })
      const data = await response.json()
      if (data.success) {
        setUsers(data.users)
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.message || 'Failed to fetch users'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to fetch users'
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

  const handleCreateUser = async () => {
    setIsValidating(true)
    
    // Validate form before submission
    if (!validateForm()) {
      setIsValidating(false)
      addNotification({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fix the errors below before creating the user'
      })
      return
    }
    
    try {
      const response = await fetch('/api/user-management', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userForm)
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'User created successfully with email and phone verification sent'
        })
        setShowUserModal(false)
        resetForm()
        fetchUsers()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to create user'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to create user'
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserForm({
      email: user.email,
      password: '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone_number: user.phone_number || '',
      department: user.department || '',
      role: user.role,
      partner_id: user.partner_id || '',
      shortcode_access: user.shortcode_access || [],
      notes: user.notes || ''
    })
    setShowUserModal(true)
  }

  const handleManagePermissions = (user: User) => {
    setSelectedUser(user)
    setShowPermissionsModal(true)
  }

  const handleClosePermissions = () => {
    setShowPermissionsModal(false)
    setSelectedUser(null)
    fetchUsers() // Refresh users to get updated permissions
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    try {
      console.log('🔍 Frontend: Updating user with data:', userForm)
      console.log('🔍 Frontend: User ID:', editingUser.id)
      
      const response = await fetch(`/api/user-management/${editingUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(userForm)
      })
      
      console.log('🔍 Frontend: Response status:', response.status)

      if (!response.ok) {
        console.log('🔍 Frontend: Response not OK:', response.status, response.statusText)
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.log('🔍 Frontend: Error data:', errorData)
        addNotification({
          type: 'error',
          title: 'Error',
          message: errorData.error || errorData.message || `Server error: ${response.status}`
        })
        return
      }

      const data = await response.json()
      console.log('🔍 Frontend: Success data:', data)
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'User updated successfully'
        })
        setShowUserModal(false)
        setEditingUser(null)
        resetForm()
        fetchUsers()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to update user'
        })
      }
    } catch (error) {
      console.log('🔍 Frontend: Catch error:', error)
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update user: ' + (error instanceof Error ? error.message : 'Unknown error')
      })
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    try {
      const response = await fetch(`/api/user-management/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      const data = await response.json()
      if (data.success) {
        addNotification({
          type: 'success',
          title: 'Success',
          message: 'User deleted successfully'
        })
        fetchUsers()
      } else {
        addNotification({
          type: 'error',
          title: 'Error',
          message: data.error || 'Failed to delete user'
        })
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete user'
      })
    }
  }

  const resetForm = () => {
    setUserForm({
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      phone_number: '',
      department: '',
      role: 'partner',
      partner_id: '',
      shortcode_access: [],
      notes: '',
      two_factor_enabled: false,
      password_change_required: true,
      profile_picture_url: ''
    })
    setEditingUser(null)
    setFormErrors({})
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      case 'partner_admin': return <Building2 className="w-4 h-4" />
      case 'operator': return <Users className="w-4 h-4" />
      case 'viewer': return <Eye className="w-4 h-4" />
      default: return <Building2 className="w-4 h-4" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800'
      case 'admin': return 'bg-red-100 text-red-800'
      case 'partner_admin': return 'bg-blue-100 text-blue-800'
      case 'operator': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-blue-100 text-blue-800'
    }
  }

  const getStatusIcon = (isActive: boolean) => {
    return isActive ? <UserCheck className="w-4 h-4 text-green-600" /> : <UserX className="w-4 h-4 text-red-600" />
  }

  if (!isAdmin) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Management
          </h2>
        </div>
        <div className="p-6 text-center">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Admin Access Required</h3>
          <p className="text-gray-500">You need admin privileges to manage users</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            User Management
          </h2>
        </div>
        <div className="p-6 text-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading users...</p>
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

      <div className={`bg-white shadow rounded-lg ${className}`}>
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              User Management
            </h2>
            <button
              onClick={() => {
                resetForm()
                setShowUserModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </button>
          </div>
        </div>

        <div className="p-6">
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Partner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-600" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : user.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.first_name && user.last_name ? user.email : `ID: ${user.id.slice(0, 8)}...`}
                            </div>
                            {user.department && (
                              <div className="text-xs text-gray-400">{user.department}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1">{user.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.partner_id ? 
                          partners.find(p => p.id === user.partner_id)?.name || 'Unknown Partner' : 
                          'N/A'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(user.is_active)}
                          <span className={`ml-2 text-sm ${user.is_active ? 'text-green-600' : 'text-red-600'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.last_activity_at ? 
                          new Date(user.last_activity_at).toLocaleString() : 
                          'Never'
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit User"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleManagePermissions(user)}
                            className="text-purple-600 hover:text-purple-900"
                            title="Manage Permissions"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
              <p className="text-gray-500 mb-4">Get started by creating your first user</p>
              <button
                onClick={() => {
                  resetForm()
                  setShowUserModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </button>
            </div>
          )}
        </div>
      </div>

      {/* User Form Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {editingUser ? 'Edit User' : 'Create User'}
                </h3>
                <button
                  onClick={() => {
                    setShowUserModal(false)
                    resetForm()
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={(e) => {
                e.preventDefault()
                editingUser ? handleUpdateUser() : handleCreateUser()
              }} className="space-y-6">
                {/* Personal Information Section */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Personal Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.first_name}
                        onChange={(e) => handleFieldChange('first_name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.first_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="John"
                        required
                      />
                      {formErrors.first_name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.first_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.last_name}
                        onChange={(e) => handleFieldChange('last_name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.last_name ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Doe"
                        required
                      />
                      {formErrors.last_name && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.last_name}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.email ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="user@example.com"
                      required
                    />
                    {formErrors.email && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Used for login and system notifications</p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={userForm.phone_number}
                      onChange={(e) => handleFieldChange('phone_number', e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        formErrors.phone_number ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="+254700000000"
                      required
                    />
                    {formErrors.phone_number && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.phone_number}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Required for OTP verification and SMS notifications</p>
                  </div>
                </div>

                {/* Professional Information Section */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Building2 className="w-5 h-5 mr-2" />
                    Professional Information
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={userForm.department}
                        onChange={(e) => handleFieldChange('department', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.department ? 'border-red-300' : 'border-gray-300'
                        }`}
                        required
                      >
                        <option value="">Select Department</option>
                        <option value="Finance">Finance</option>
                        <option value="Operations">Operations</option>
                        <option value="IT">IT</option>
                        <option value="Customer Service">Customer Service</option>
                        <option value="Management">Management</option>
                        <option value="Compliance">Compliance</option>
                        <option value="Other">Other</option>
                      </select>
                      {formErrors.department && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.department}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={userForm.role}
                        onChange={(e) => handleFieldChange('role', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="viewer">Viewer (Read-only Access)</option>
                        <option value="operator">Operator (Limited Write Access)</option>
                        <option value="partner">Partner (Basic Partner Access)</option>
                        <option value="partner_admin">Partner Admin (Partner Management)</option>
                        <option value="admin">Admin (System Management)</option>
                        <option value="super_admin">Super Admin (Full System Access)</option>
                      </select>
                      <p className="mt-1 text-xs text-gray-500">Determines system access level</p>
                    </div>
                  </div>

                  {(userForm.role === 'partner' || userForm.role === 'partner_admin' || userForm.role === 'operator' || userForm.role === 'viewer') && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Partner Assignment <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={userForm.partner_id}
                        onChange={(e) => handleFieldChange('partner_id', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.partner_id ? 'border-red-300' : 'border-gray-300'
                        }`}
                        required={['partner', 'partner_admin', 'operator', 'viewer'].includes(userForm.role)}
                      >
                        <option value="">Select a partner</option>
                        {partners.map(partner => (
                          <option key={partner.id} value={partner.id}>
                            {partner.name} ({partner.short_code})
                          </option>
                        ))}
                      </select>
                      {formErrors.partner_id && (
                        <p className="mt-1 text-sm text-red-600">{formErrors.partner_id}</p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">Required for partner-related roles</p>
                    </div>
                  )}
                </div>

                {/* Security Section */}
                <div className="border-b border-gray-200 pb-4">
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Security Settings
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={userForm.password}
                        onChange={(e) => handleFieldChange('password', e.target.value)}
                        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          formErrors.password ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder={editingUser ? 'Leave empty to keep current password' : 'Enter secure password'}
                        required={!editingUser}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">Minimum 8 characters, include numbers and special characters</p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="password_change_required"
                        checked={userForm.password_change_required}
                        onChange={(e) => handleFieldChange('password_change_required', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="password_change_required" className="ml-2 block text-sm text-gray-700">
                        Require password change on first login
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="two_factor_enabled"
                        checked={userForm.two_factor_enabled}
                        onChange={(e) => handleFieldChange('two_factor_enabled', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="two_factor_enabled" className="ml-2 block text-sm text-gray-700">
                        Enable two-factor authentication
                      </label>
                    </div>
                  </div>
                </div>

                {/* Additional Information Section */}
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Additional Information
                  </h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Profile Picture URL
                    </label>
                    <input
                      type="url"
                      value={userForm.profile_picture_url}
                      onChange={(e) => handleFieldChange('profile_picture_url', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="https://example.com/profile.jpg"
                    />
                    <p className="mt-1 text-xs text-gray-500">Optional profile picture URL</p>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Notes
                    </label>
                    <textarea
                      value={userForm.notes}
                      onChange={(e) => handleFieldChange('notes', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                      placeholder="Additional notes about this user (internal use only)..."
                    />
                    <p className="mt-1 text-xs text-gray-500">Internal notes visible only to admins</p>
                  </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUserModal(false)
                      resetForm()
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isValidating}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isValidating ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        {editingUser ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        {editingUser ? 'Update User' : 'Create User'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* User Permissions Manager Modal */}
      {showPermissionsModal && selectedUser && (
        <UserPermissionsManager
          user={selectedUser}
          onClose={handleClosePermissions}
          onUpdate={fetchUsers}
        />
      )}
    </>
  )
}
