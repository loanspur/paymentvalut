'use client'

import { useEffect, useState } from 'react'
import { useAuth } from './AuthProvider'
import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import ProfileDropdown from './ProfileDropdown'
import { ToastProvider } from './ToastSimple'
import { Bell, Wallet, MessageSquare } from 'lucide-react'

interface AppLayoutProps {
  children: React.ReactNode
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user, logout, isLoading } = useAuth()
  const pathname = usePathname()
  

  // Prevent auto-scroll conflicts with fixed elements

  // Public routes that don't need the protected layout
  const publicRoutes = ['/secure-login', '/login', '/login-enhanced', '/setup', '/request-password-reset', '/reset-password']
  const isPublicRoute = publicRoutes.includes(pathname)

  // Show loading state for protected routes while auth is loading
  if (!isPublicRoute && isLoading) {
    return (
      <ToastProvider>
        <div className="min-h-screen bg-gray-50 flex">
          {/* Sidebar skeleton */}
          <div className="w-64 bg-white border-r border-gray-200 shadow-lg">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                <div className="ml-3">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse mt-1"></div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
              ))}
            </div>
          </div>
          
          {/* Main content area skeleton */}
          <div className="flex-1 flex flex-col">
            {/* Header skeleton */}
            <header className="sticky top-0 bg-white border-b border-gray-200 px-3 py-3 sm:px-4 sm:py-4 lg:px-6 shadow-sm z-20">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mt-1"></div>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4 ml-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </div>
            </header>

            {/* Content skeleton */}
            <main className="flex-1 p-3 sm:p-4 lg:p-6">
              <div className="w-full">
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-32 bg-gray-200 rounded-lg animate-pulse"></div>
                  ))}
                </div>
              </div>
            </main>
          </div>
        </div>
      </ToastProvider>
    )
  }

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
              {/* Wallet balance display */}
              <HeaderBalance />
              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile Dropdown - Always render, but show skeleton while loading */}
              {isLoading ? (
                <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse transition-opacity duration-200"></div>
              ) : user ? (
                <div className="transition-opacity duration-200">
                  <ProfileDropdown />
                </div>
              ) : null}
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
  
  return titles[pathname] || 'EazzyPay'
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
  
  return descriptions[pathname] || 'EazzyPay B2C Disbursement System'
}


function HeaderBalance() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const [label, setLabel] = useState<string>('')
  const [smsBalance, setSmsBalance] = useState<number | null>(null)
  const [smsLoading, setSmsLoading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const fetchBalance = async () => {
      if (!user) return
      try {
        setLoading(true)
        if (user.role === 'super_admin' || user.role === 'admin') {
          const res = await fetch('/api/admin/wallets/partners', { credentials: 'include' })
          const data = await res.json()
          if (isMounted && data?.success) {
            const total = Number(data?.summary?.total_balance || 0)
            setAmount(total)
            setLabel('Total Balance')
          }
        } else {
          const res = await fetch('/api/wallet/balance', { credentials: 'include' })
          const data = await res.json()
          if (isMounted && data?.success) {
            const bal = Number(data?.wallet?.currentBalance || 0)
            setAmount(bal)
            setLabel('Wallet')
          }
        }
      } catch (e) {
        // swallow
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchBalance()
    const id = setInterval(fetchBalance, 60_000)
    return () => { isMounted = false; clearInterval(id) }
  }, [user])

  useEffect(() => {
    let isMounted = true
    
    // Fetch immediately on mount
    const fetchSmsBalance = async () => {
      if (!user) return
      try {
        setSmsLoading(true)
        // Use abort controller for faster timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 6000) // 6 second timeout
        
        try {
          const res = await fetch('/api/sms/balance', { 
            credentials: 'include',
            signal: controller.signal
          })
          const data = await res.json()
          
          if (isMounted) {
            if (data?.success) {
              setSmsBalance(Number(data.balance || 0))
            } else {
              // Only log errors in development or if critical
              if (process.env.NODE_ENV === 'development') {
                console.error('SMS Balance API Error:', data.error, data.debug)
              }
              setSmsBalance(null)
            }
          }
        } finally {
          clearTimeout(timeoutId)
        }
      } catch (e: any) {
        if (isMounted) {
          // Don't log abort errors (expected for timeout)
          if (e.name !== 'AbortError' && process.env.NODE_ENV === 'development') {
            console.error('SMS Balance fetch error:', e)
          }
          setSmsBalance(null)
        }
      } finally {
        if (isMounted) setSmsLoading(false)
      }
    }
    
    fetchSmsBalance()
    // Refresh every 45 seconds (slightly faster than cache expiry for freshness)
    const id = setInterval(fetchSmsBalance, 45_000)
    return () => { isMounted = false; clearInterval(id) }
  }, [user])

  const formatCurrency = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', minimumFractionDigits: 2 }).format(n)

  return (
    <div className="hidden sm:flex items-center space-x-2">
      {/* Wallet Balance */}
      <div className="flex items-center px-2 py-1 rounded-lg border border-gray-200 bg-white">
        <Wallet className="w-4 h-4 text-blue-600 mr-2" />
        <span className="text-xs text-gray-500 mr-1">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{loading || amount === null ? '—' : formatCurrency(amount)}</span>
      </div>
      {/* SMS Balance */}
      <div className="flex items-center px-2 py-1 rounded-lg border border-gray-200 bg-white">
        <MessageSquare className="w-4 h-4 text-green-600 mr-2" />
        <span className="text-xs text-gray-500 mr-1">SMS</span>
        <span className="text-sm font-semibold text-gray-900">{smsLoading || smsBalance === null ? '—' : formatCurrency(smsBalance)}</span>
      </div>
    </div>
  )
}
