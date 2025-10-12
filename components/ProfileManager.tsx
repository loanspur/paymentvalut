'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { 
  User, 
  Mail, 
  Phone, 
  Building, 
  FileText, 
  Save, 
  Edit3, 
  Lock, 
  Eye, 
  EyeOff,
  CheckCircle,
  AlertCircle,
  Camera,
  Shield
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  phone_number?: string
  department?: string
  notes?: string
  role: string
  partner_id?: string
  profile_picture_url?: string
  is_active: boolean
  email_verified: boolean
  last_activity_at?: string
  last_password_change?: string
  password_change_required: boolean
  two_factor_enabled: boolean
  created_at: string
  updated_at: string
  partners?: {
    id: string
    name: string
    short_code: string
  }
  accessible_shortcodes?: Array<{
    shortcode_id: string
    shortcode: string
    partner_name: string
    access_type: string
    granted_at: string
  }>
}

export default function ProfileManager() {
  const { user: authUser, isLoading: authLoading } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone_number: '',
    department: '',
    notes: '',
    profile_picture_url: ''
  })

  // Password change states
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })

  useEffect(() => {
    // Wait for auth to be ready before fetching profile
    if (!authLoading && authUser) {
      fetchProfile()
    } else if (!authLoading && !authUser) {
      // User is not authenticated
      setIsLoading(false)
      setMessage('Please log in to view your profile')
      setIsSuccess(false)
    }
  }, [authLoading, authUser])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/user-management/profile', {
        method: 'GET',
        credentials: 'include'
      })
      const data = await response.json()

      if (response.ok) {
        setProfile(data.user)
        setFormData({
          first_name: data.user.first_name || '',
          last_name: data.user.last_name || '',
          phone_number: data.user.phone_number || '',
          department: data.user.department || '',
          notes: data.user.notes || '',
          profile_picture_url: data.user.profile_picture_url || ''
        })
      } else {
        // If profile API fails, use auth user data as fallback
        console.warn('Profile API failed, using auth user data:', data.message)
        if (authUser) {
          const fallbackProfile: UserProfile = {
            id: authUser.id,
            email: authUser.email,
            first_name: authUser.name?.split(' ')[0] || '',
            last_name: authUser.name?.split(' ').slice(1).join(' ') || '',
            role: authUser.role,
            is_active: true,
            email_verified: true,
            password_change_required: false,
            two_factor_enabled: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          setProfile(fallbackProfile)
          setFormData({
            first_name: fallbackProfile.first_name || '',
            last_name: fallbackProfile.last_name || '',
            phone_number: '',
            department: '',
            notes: '',
            profile_picture_url: ''
          })
          setMessage('Profile loaded with limited information. The user account may need to be recreated in the database.')
          setIsSuccess(true)
        } else {
          setMessage(data.message || 'Failed to fetch profile')
          setIsSuccess(false)
        }
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
      // If there's a network error, try to use auth user data
      if (authUser) {
        const fallbackProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email,
          first_name: authUser.name?.split(' ')[0] || '',
          last_name: authUser.name?.split(' ').slice(1).join(' ') || '',
          role: authUser.role,
          is_active: true,
          email_verified: true,
          password_change_required: false,
          two_factor_enabled: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setProfile(fallbackProfile)
        setFormData({
          first_name: fallbackProfile.first_name || '',
          last_name: fallbackProfile.last_name || '',
          phone_number: '',
          department: '',
          notes: '',
          profile_picture_url: ''
        })
        setMessage('Profile loaded with limited information due to connection issues.')
        setIsSuccess(true)
      } else {
        setMessage('An error occurred while fetching profile')
        setIsSuccess(false)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/user-management/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        setProfile(data.user)
        setIsEditing(false)
        setIsSuccess(true)
        setMessage('Profile updated successfully')
      } else {
        setIsSuccess(false)
        setMessage(data.message || 'Failed to update profile')
      }
    } catch (error) {
      setIsSuccess(false)
      setMessage('An error occurred while updating profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage('New passwords do not match')
      setIsSuccess(false)
      return
    }

    if (passwordData.newPassword.length < 8) {
      setMessage('New password must be at least 8 characters long')
      setIsSuccess(false)
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      const response = await fetch('/api/user-management/profile/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsChangingPassword(false)
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setIsSuccess(true)
        setMessage('Password changed successfully')
      } else {
        setIsSuccess(false)
        setMessage(data.message || 'Failed to change password')
      }
    } catch (error) {
      setIsSuccess(false)
      setMessage('An error occurred while changing password')
    } finally {
      setIsSaving(false)
    }
  }

  const getRoleDisplayName = (role: string) => {
    const roleNames: { [key: string]: string } = {
      'super_admin': 'Super Administrator',
      'admin': 'Administrator',
      'partner_admin': 'Partner Administrator',
      'operator': 'Operator',
      'viewer': 'Viewer',
      'partner': 'Partner'
    }
    return roleNames[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-red-100 text-red-800',
      'partner_admin': 'bg-blue-100 text-blue-800',
      'operator': 'bg-green-100 text-green-800',
      'viewer': 'bg-gray-100 text-gray-800',
      'partner': 'bg-yellow-100 text-yellow-800'
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">
          {authLoading ? 'Loading authentication...' : 'Loading profile...'}
        </span>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <p className="text-gray-600">Failed to load profile</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
                  <User className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <button className="absolute -bottom-1 -right-1 h-6 w-6 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700">
                <Camera className="h-3 w-3" />
              </button>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-gray-600">{profile.email}</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(profile.role)}`}>
                <Shield className="h-3 w-3 mr-1" />
                {getRoleDisplayName(profile.role)}
              </span>
            </div>
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <Edit3 className="h-4 w-4 mr-2" />
                Edit Profile
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({
                      first_name: profile.first_name || '',
                      last_name: profile.last_name || '',
                      phone_number: profile.phone_number || '',
                      department: profile.department || '',
                      notes: profile.notes || '',
                      profile_picture_url: profile.profile_picture_url || ''
                    })
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`rounded-md p-4 ${
          isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              {isSuccess ? (
                <CheckCircle className="h-5 w-5 text-green-400" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-400" />
              )}
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                isSuccess ? 'text-green-800' : 'text-red-800'
              }`}>
                {message}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Information</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">First Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{profile.first_name || 'Not set'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                ) : (
                  <p className="mt-1 text-sm text-gray-900">{profile.last_name || 'Not set'}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 flex items-center">
                <Mail className="h-4 w-4 text-gray-400 mr-2" />
                <p className="text-sm text-gray-900">{profile.email}</p>
                {profile.email_verified && (
                  <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              {isEditing ? (
                <div className="mt-1 flex">
                  <Phone className="h-4 w-4 text-gray-400 mr-2 mt-2" />
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter phone number"
                  />
                </div>
              ) : (
                <div className="mt-1 flex items-center">
                  <Phone className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900">{profile.phone_number || 'Not set'}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              {isEditing ? (
                <div className="mt-1 flex">
                  <Building className="h-4 w-4 text-gray-400 mr-2 mt-2" />
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter department"
                  />
                </div>
              ) : (
                <div className="mt-1 flex items-center">
                  <Building className="h-4 w-4 text-gray-400 mr-2" />
                  <p className="text-sm text-gray-900">{profile.department || 'Not set'}</p>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              {isEditing ? (
                <div className="mt-1 flex">
                  <FileText className="h-4 w-4 text-gray-400 mr-2 mt-2" />
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter notes"
                  />
                </div>
              ) : (
                <div className="mt-1 flex items-start">
                  <FileText className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                  <p className="text-sm text-gray-900">{profile.notes || 'No notes'}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security & Access */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Security & Access</h2>
          
          <div className="space-y-4">
            {/* Password Change */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Password</h3>
                  <p className="text-sm text-gray-500">
                    Last changed: {profile.last_password_change ? 
                      new Date(profile.last_password_change).toLocaleDateString() : 
                      'Never'
                    }
                  </p>
                </div>
                <button
                  onClick={() => setIsChangingPassword(!isChangingPassword)}
                  className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Lock className="h-4 w-4 mr-1" />
                  Change Password
                </button>
              </div>

              {isChangingPassword && (
                <div className="mt-4 space-y-3 p-4 bg-gray-50 rounded-md">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current Password</label>
                    <div className="mt-1 relative">
                      <input
                        type={showPasswords.current ? 'text' : 'password'}
                        value={passwordData.currentPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                        className="block w-full pr-10 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">New Password</label>
                    <div className="mt-1 relative">
                      <input
                        type={showPasswords.new ? 'text' : 'password'}
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        className="block w-full pr-10 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                    <div className="mt-1 relative">
                      <input
                        type={showPasswords.confirm ? 'text' : 'password'}
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        className="block w-full pr-10 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleChangePassword}
                      disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                      className="flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      onClick={() => {
                        setIsChangingPassword(false)
                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Two-Factor Authentication */}
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h3>
                  <p className="text-sm text-gray-500">
                    {profile.two_factor_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <button
                  className="flex items-center px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Shield className="h-4 w-4 mr-1" />
                  {profile.two_factor_enabled ? 'Disable' : 'Enable'}
                </button>
              </div>
            </div>

            {/* Accessible Shortcodes */}
            {profile.accessible_shortcodes && profile.accessible_shortcodes.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-900 mb-2">Accessible Shortcodes</h3>
                <div className="space-y-2">
                  {profile.accessible_shortcodes.map((shortcode) => (
                    <div key={shortcode.shortcode_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{shortcode.partner_name}</p>
                        <p className="text-xs text-gray-500">{shortcode.shortcode}</p>
                      </div>
                      <span className="text-xs text-gray-500 capitalize">{shortcode.access_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

