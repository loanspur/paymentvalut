'use client'

import { useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import ProfileDropdown from './ProfileDropdown'
import { ToastProvider } from './ToastSimple'
import { Bell } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout } = useAuth()
  const pathname = usePathname()

  // Prevent auto-scroll conflicts with fixed elements

  // Public routes that don't need the protected layout
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup', '/request-password-reset', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  return (
    <ToastProvider>
      {isPublicRoute ? (
        children
      ) : (
        <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar */}
          <Sidebar />
          
          {/* Main content area */}
          <div className="flex-1 flex flex-col lg:ml-0 min-w-0">
        {/* Header - mobile-first responsive */}
        <header className="sticky top-0 bg-white border-b border-gray-200 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 shadow-sm z-20">
          <div className="flex items-center justify-between">
            {/* Page title - mobile responsive */}
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 truncate">
                {getPageTitle(pathname)}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                {getPageDescription(pathname)}
              </p>
            </div>

            {/* Header actions - mobile responsive */}
            <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile Dropdown */}
              {user && (
                <ProfileDropdown />
              )}
            </div>
          </div>
        </header>

        {/* Main content - mobile-first padding */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-y-auto lg:overflow-y-visible">
          <div className="w-full">
            {children}
          </div>
          </main>
        </div>
        </div>
      )}
    </ToastProvider>
  )
}

function getPageTitle(pathname: string): string {
  const titles: Record<string, string> = {
    '/': 'Dashboard',
    '/disburse': 'Send Money',
    '/partners': 'Partners',
    '/transactions': 'Transaction Monitoring',
    '/history': 'Transaction History',
    '/loan-tracking': 'Loan Tracking',
    '/wallet': 'Wallet Management',
    '/admin/wallets': 'Admin Wallet Management',
    '/admin/partner-charges': 'Partner Charges Management',
    '/admin/disbursement-retries': 'Disbursement Retry Management',
    '/management/ncba-transactions': 'NCBA Transactions',
    '/settings': 'Settings',
    '/api-docs': 'API Documentation',
    '/admin-dashboard': 'User Management',
    '/admin-dashboard/audit-trail': 'Audit Trail'
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
    '/loan-tracking': 'Monitor approved loans and their disbursement progress',
    '/wallet': 'Manage wallet balance, transactions, and top-ups',
    '/admin/wallets': 'Super admin dashboard for managing all partners wallets and transactions',
    '/admin/partner-charges': 'Manage partner-specific charges and fees for disbursements and float purchases',
    '/admin/disbursement-retries': 'Monitor and manage failed disbursement retries with automatic retry mechanisms',
    '/management/ncba-transactions': 'Manage NCBA Paybill transactions and partner allocations',
    '/settings': 'Configure system settings and preferences',
    '/api-docs': 'Integration guides and API documentation',
    '/admin-dashboard': 'Manage users, roles, and system activity',
    '/admin-dashboard/audit-trail': 'Monitor system logs, user activities, and audit trail'
  }
  
  return descriptions[pathname] || 'M-Pesa B2C Disbursement System'
}
