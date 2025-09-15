'use client'

import { useAuth } from './AuthProvider'
import { LogOut, User } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Navigation from './Navigation'

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  // Public routes that don't need the protected layout
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup']
  const isPublicRoute = publicRoutes.includes(pathname)

  // For public routes, just render children without the protected layout
  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Navigation and User Info */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                M-Pesa B2C Vault
              </h1>
            </div>
            
            {/* Navigation Menu */}
            <Navigation />
            
            {/* User Info and Logout */}
            {user && (
              <div className="flex items-center space-x-4">
                <div className="flex items-center text-sm text-gray-700">
                  <User className="h-4 w-4 mr-2" />
                  <span>{user.email}</span>
                  <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {user.role}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
