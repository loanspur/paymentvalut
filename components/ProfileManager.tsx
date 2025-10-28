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
  Shield,
  Key,
  Smartphone,
  Clock,
  Calendar,
  Settings,
  QrCode,
  Copy,
  RefreshCw,
  Bell,
  Activity,
  LogOut
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
  phone_verified?: boolean
  last_activity_at?: string
  last_password_change?: string
  password_change_required: boolean
  two_factor_enabled: boolean
  two_factor_secret?: string
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
  const [isSettingUp2FA, setIsSettingUp2FA] = useState(false)
  const [message, setMessage] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

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

  // 2FA states
  const [twoFactorData, setTwoFactorData] = useState({
    verificationCode: '',
  })

  useEffect(() => {
    if (!authLoading && authUser) {
      fetchProfile()
    } else if (!authLoading && !authUser) {
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
        if (authUser) {
          const fallbackProfile: UserProfile = {
            id: authUser.id,
            email: authUser.email,
            first_name: authUser.name?.split(' ')[0] || '',
            last_name: authUser.name?.split(' ').slice(1).join(' ') || '',
            role: authUser.role,
            is_active: true,
            email_verified: true,
            phone_verified: false,
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
      if (authUser) {
        const fallbackProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email,
          first_name: authUser.name?.split(' ')[0] || '',
          last_name: authUser.name?.split(' ').slice(1).join(' ') || '',
          role: authUser.role,
          is_active: true,
          email_verified: true,
          phone_verified: false,
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

  const handleSetup2FA = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      // Check if user has phone number for OTP
      if (!profile.phone_number) {
        setIsSuccess(false)
        setMessage('Phone number is required for 2FA. Please add a phone number first.')
        return
      }

      // Use existing OTP system to send verification code
      const response = await fetch('/api/auth/otp/generate', {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (response.ok) {
        setIsSettingUp2FA(true)
        setIsSuccess(true)
        setMessage('OTP sent to your registered phone number and email. Please enter the code to enable 2FA.')
      } else {
        setIsSuccess(false)
        setMessage(data.error || 'Failed to send OTP')
      }
    } catch (error) {
      setIsSuccess(false)
      setMessage('An error occurred while setting up 2FA')
    } finally {
      setIsSaving(false)
    }
  }

  const handleVerify2FA = async () => {
    if (!twoFactorData.verificationCode) {
      setMessage('Please enter the verification code')
      setIsSuccess(false)
      return
    }

    setIsSaving(true)
    setMessage('')

    try {
      // Use existing OTP validation system
      const response = await fetch('/api/auth/otp/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          otp_code: twoFactorData.verificationCode
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update user's 2FA status in the database
        const updateResponse = await fetch('/api/user-management/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            two_factor_enabled: true
          }),
        })

        if (updateResponse.ok) {
          setIsSettingUp2FA(false)
          setProfile({ ...profile!, two_factor_enabled: true })
          setIsSuccess(true)
          setMessage('Two-factor authentication enabled successfully')
        } else {
          setIsSuccess(false)
          setMessage('OTP verified but failed to update 2FA status')
        }
      } else {
        setIsSuccess(false)
        setMessage(data.error || 'Failed to verify OTP code')
      }
    } catch (error) {
      setIsSuccess(false)
      setMessage('An error occurred while verifying OTP')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDisable2FA = async () => {
    setIsSaving(true)
    setMessage('')

    try {
      // Update user's 2FA status in the database
      const response = await fetch('/api/user-management/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          two_factor_enabled: false
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setProfile({ ...profile!, two_factor_enabled: false })
        setIsSuccess(true)
        setMessage('Two-factor authentication disabled successfully')
      } else {
        setIsSuccess(false)
        setMessage(data.message || 'Failed to disable 2FA')
      }
    } catch (error) {
      setIsSuccess(false)
      setMessage('An error occurred while disabling 2FA')
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
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="relative">
              {profile.profile_picture_url ? (
                <img
                  src={profile.profile_picture_url}
                  alt="Profile"
                  className="h-20 w-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="h-20 w-20 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center border-4 border-white shadow-lg">
                  <User className="h-10 w-10 text-white" />
                </div>
              )}
              <button className="absolute -bottom-1 -right-1 h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow-lg">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {profile.first_name} {profile.last_name}
              </h1>
              <p className="text-lg text-gray-600">{profile.email}</p>
              <div className="flex items-center space-x-3 mt-2">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(profile.role)}`}>
                  <Shield className="h-4 w-4 mr-1" />
                  {getRoleDisplayName(profile.role)}
                </span>
                {profile.email_verified && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Email Verified
                  </span>
                )}
                {profile.phone_verified && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Phone Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
                  className="px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={isSaving}
                  className="flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
        <div className={`rounded-lg p-4 ${
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

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'profile', name: 'Profile Information', icon: User },
              { id: 'security', name: 'Security Settings', icon: Shield },
              { id: 'activity', name: 'Activity & Access', icon: Activity }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">First Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={formData.first_name}
                            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                            className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="Enter phone number"
                          />
                        </div>
                      ) : (
                        <div className="mt-1 flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <p className="text-sm text-gray-900">{profile.phone_number || 'Not set'}</p>
                          {profile.phone_verified && (
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          )}
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
                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Notes</label>
                      {isEditing ? (
                        <div className="mt-1 flex">
                          <FileText className="h-4 w-4 text-gray-400 mr-2 mt-2" />
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={4}
                            className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700">Profile Picture URL</label>
                      {isEditing ? (
                        <input
                          type="url"
                          value={formData.profile_picture_url}
                          onChange={(e) => setFormData({ ...formData, profile_picture_url: e.target.value })}
                          className="mt-1 block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                          placeholder="Enter profile picture URL"
                        />
                      ) : (
                        <p className="mt-1 text-sm text-gray-900">{profile.profile_picture_url || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Account Information</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Account Created</span>
                      </div>
                      <span className="text-sm text-gray-900">
                        {new Date(profile.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-700">Last Updated</span>
                      </div>
                      <span className="text-sm text-gray-900">
                        {new Date(profile.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                    {profile.last_activity_at && (
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-700">Last Activity</span>
                        </div>
                        <span className="text-sm text-gray-900">
                          {new Date(profile.last_activity_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings Tab */}
          {activeTab === 'security' && (
            <div className="space-y-8">
              {/* Password Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Password Security</h3>
                    <p className="text-sm text-gray-500">
                      Last changed: {profile.last_password_change ? 
                        new Date(profile.last_password_change).toLocaleDateString() : 
                        'Never'
                      }
                    </p>
                  </div>
                  <button
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                    className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </button>
                </div>

                {isChangingPassword && (
                  <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Password</label>
                      <div className="mt-1 relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                          className="block w-full pr-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                          className="block w-full pr-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                          className="block w-full pr-10 border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
                    <div className="flex space-x-3">
                      <button
                        onClick={handleChangePassword}
                        disabled={isSaving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                        className="flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isSaving ? 'Changing...' : 'Change Password'}
                      </button>
                      <button
                        onClick={() => {
                          setIsChangingPassword(false)
                          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Two-Factor Authentication Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">
                      {profile.two_factor_enabled ? 'Enabled - Your account is protected with 2FA' : 'Disabled - Add an extra layer of security'}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {profile.two_factor_enabled ? (
                      <button
                        onClick={handleDisable2FA}
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 border border-red-300 rounded-lg text-sm font-medium text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Disable 2FA
                      </button>
                    ) : (
                      <button
                        onClick={handleSetup2FA}
                        disabled={isSaving}
                        className="flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Enable 2FA
                      </button>
                    )}
                  </div>
                </div>

                {isSettingUp2FA && (
                  <div className="space-y-4 p-4 bg-white rounded-lg border border-gray-200">
                    <div className="text-center">
                      <h4 className="text-md font-medium text-gray-900 mb-2">Setup Two-Factor Authentication</h4>
                      <p className="text-sm text-gray-600 mb-4">
                        An OTP code has been sent to your registered phone number and email address.
                      </p>
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Smartphone className="h-4 w-4" />
                          <span>SMS: {profile.phone_number || 'Not set'}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Mail className="h-4 w-4" />
                          <span>Email: {profile.email}</span>
                        </div>
                      </div>
                      <div className="max-w-xs mx-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Enter the 6-digit OTP code
                        </label>
                        <input
                          type="text"
                          value={twoFactorData.verificationCode}
                          onChange={(e) => setTwoFactorData({ ...twoFactorData, verificationCode: e.target.value })}
                          className="block w-full border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-center"
                          placeholder="123456"
                          maxLength={6}
                        />
                      </div>
                      <div className="flex space-x-3 justify-center mt-4">
                        <button
                          onClick={handleVerify2FA}
                          disabled={isSaving || !twoFactorData.verificationCode}
                          className="flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          {isSaving ? 'Verifying...' : 'Verify & Enable'}
                        </button>
                        <button
                          onClick={() => {
                            setIsSettingUp2FA(false)
                            setTwoFactorData({ verificationCode: '' })
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {profile.two_factor_enabled && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
                    <h4 className="text-md font-medium text-gray-900 mb-2">Two-Factor Authentication Status</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Your account is protected with two-factor authentication using OTP codes sent to your registered phone number and email.
                    </p>
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <Shield className="h-4 w-4" />
                      <span>2FA is enabled and protecting your account</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Activity & Access Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-8">
              {/* Partner Information */}
              {profile.partners && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Partner Information</h3>
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                      <Building className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-lg font-medium text-gray-900">{profile.partners.name}</p>
                      <p className="text-sm text-gray-500">Short Code: {profile.partners.short_code}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Accessible Shortcodes */}
              {profile.accessible_shortcodes && profile.accessible_shortcodes.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Accessible Shortcodes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profile.accessible_shortcodes.map((shortcode) => (
                      <div key={shortcode.shortcode_id} className="bg-white rounded-lg p-4 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{shortcode.partner_name}</p>
                            <p className="text-sm text-gray-500">{shortcode.shortcode}</p>
                          </div>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {shortcode.access_type}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          Granted: {new Date(shortcode.granted_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Account Status */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Account Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${profile.is_active ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <div>
                        <p className="font-medium text-gray-900">Account Status</p>
                        <p className="text-sm text-gray-500">{profile.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${profile.password_change_required ? 'bg-yellow-400' : 'bg-green-400'}`}></div>
                      <div>
                        <p className="font-medium text-gray-900">Password Status</p>
                        <p className="text-sm text-gray-500">
                          {profile.password_change_required ? 'Change Required' : 'Up to Date'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}