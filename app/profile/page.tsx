'use client'

import ProfileManager from '@/components/ProfileManager'

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your profile information, security settings, and access permissions.
            </p>
          </div>
          <ProfileManager />
        </div>
      </div>
    </div>
  )
}

