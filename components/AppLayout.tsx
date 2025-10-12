'use client'

import { useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Breadcrumb from './Breadcrumb'
import { Bell, User, LogOut } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth()
  const pathname = usePathname()

  // Prevent auto-scroll conflicts with fixed elements

  // Public routes that don't need the protected layout
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup', '/request-password-reset', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  // For public routes, just render children without the protected layout
  if (isPublicRoute) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Header - using sticky instead of fixed */}
        <header className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 lg:px-6 shadow-sm z-20">
          <div className="flex items-center justify-between">
            {/* Page title */}
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                {getPageTitle(pathname)}
              </h1>
              <p className="text-sm text-gray-500">
                {getPageDescription(pathname)}
              </p>
            </div>

            {/* Header actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* User info */}
              {user && (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2 text-sm text-gray-700">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:block">{user.email}</span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {user.role}
                    </span>
                  </div>
                  
                  {/* Logout button */}
                  <button
                    onClick={async () => {
                      try {
                        await fetch('/api/auth/logout', { method: 'POST' })
                        if (typeof window !== 'undefined') {
                          localStorage.removeItem('auth_token')
                          localStorage.removeItem('user')
                        }
                        window.location.href = '/login'
                      } catch (error) {
                        console.error('Logout error:', error)
                      }
                    }}
                    className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    <span className="hidden sm:block">Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 p-4 lg:p-6 overflow-y-auto">
          <div className="w-full">
            {pathname !== '/' && pathname !== '/transactions' && pathname !== '/partners' && pathname !== '/history' && pathname !== '/admin-dashboard' && pathname !== '/profile' && pathname !== '/disburse' && <Breadcrumb />}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/disburse': 'Send Money',
    '/partners': 'Partners',
    '/transactions': 'Transaction Monitoring',
    '/history': 'Transaction History',
    '/settings': 'Settings',
    '/api-docs': 'API Documentation',
    '/admin-dashboard': 'User Management'
  }
  
  return titles[pathname] || 'M-Pesa Vault'
}

function getPageDescription(pathname: string): string {
  const descriptions: Record<string, string> = {
    '/': 'Overview of disbursement activities and system status',
    '/disburse': 'Initiate M-Pesa B2C disbursement transactions',
    '/partners': 'Manage partner organizations and their configurations',
    '/transactions': 'Real-time monitoring of M-Pesa B2C transactions and balances',
    '/history': 'View and track all disbursement transactions',
    '/settings': 'Configure system settings and preferences',
    '/api-docs': 'Integration guides and API documentation',
    '/admin-dashboard': 'Manage users, roles, and system activity'
  }
  
  return descriptions[pathname] || 'M-Pesa B2C Disbursement System'
}
