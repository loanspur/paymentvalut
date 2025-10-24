'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from './AuthProvider'
import { 
  DollarSign, 
  Send, 
  History, 
  Building2, 
  Settings,
  Menu,
  X,
  Home,
  FileText,
  LogOut,
  User,
  Shield,
  Activity,
  Users,
  CreditCard,
  Wallet,
  ChevronDown,
  ChevronRight,
  Bell,
  HelpCircle,
  RefreshCw
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: any
  description?: string
  badge?: string
  children?: NavigationItem[]
}

interface NavigationGroup {
  title: string
  items: NavigationItem[]
}

export default function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['core', 'management'])
  const { user, isAuthenticated, logout } = useAuth()
  const pathname = usePathname()

  const handleLogout = async () => {
    await logout()
  }

  // Filter navigation based on user role
  const getFilteredNavigationGroups = (): NavigationGroup[] => {
    const isSuperAdmin = user?.role === 'super_admin'
    const isAdmin = user?.role === 'admin'
    const isPartnerAdmin = user?.role === 'partner_admin'
    
    const allGroups: NavigationGroup[] = [
      {
        title: 'Core',
        items: [
          {
            name: 'Dashboard',
            href: '/',
            icon: Home,
            description: 'Overview & analytics'
          },
          // Only show Send Money for super_admin
          ...(isSuperAdmin ? [{
            name: 'Send Money',
            href: '/disburse',
            icon: Send,
            description: 'Initiate disbursement',
            badge: 'Primary'
          }] : [])
        ]
      },
      {
        title: 'Management',
        items: [
          // Only show Partners for super_admin and admin
          ...(isSuperAdmin || isAdmin ? [{
            name: 'Partners',
            href: '/partners',
            icon: Building2,
            description: 'Manage organizations'
          }] : []),
          {
            name: 'Transaction Monitoring',
            href: '/transactions',
            icon: Activity,
            description: 'Real-time transaction monitoring',
            badge: 'Live'
          },
          {
            name: 'Transaction History',
            href: '/history',
            icon: History,
            description: 'View all transactions'
          },
          {
            name: 'Loan Tracking',
            href: '/loan-tracking',
            icon: FileText,
            description: 'Monitor approved loans & disbursements'
          },
          {
            name: 'Wallet Management',
            href: '/wallet',
            icon: CreditCard,
            description: 'Manage wallet balance & transactions'
          },
          // Only show NCBA Transactions for super_admin and admin
          ...(isSuperAdmin || isAdmin ? [{
            name: 'NCBA Transactions',
            href: '/management/ncba-transactions',
            icon: CreditCard,
            description: 'Manage NCBA Paybill transactions'
          }] : [])
        ]
      },
      {
        title: 'Administration',
        items: [
          // Only show User Management for super_admin and admin
          ...(isSuperAdmin || isAdmin ? [{
            name: 'User Management',
            href: '/admin-dashboard',
            icon: Users,
            description: 'Manage users & roles'
          }] : []),
          // Only show Admin Wallets for super_admin and admin
          ...(isSuperAdmin || isAdmin ? [{
            name: 'Admin Wallets',
            href: '/admin/wallets',
            icon: Wallet,
            description: 'Manage all partners wallets'
          }] : []),
          // Only show Partner Charges for super_admin and admin
          ...(isSuperAdmin || isAdmin ? [{
            name: 'Partner Charges',
            href: '/admin/partner-charges',
            icon: DollarSign,
            description: 'Manage partner charges & fees'
          }] : []),
          // Only show Disbursement Retries for super_admin and admin
          ...(isSuperAdmin || isAdmin ? [{
            name: 'Disbursement Retries',
            href: '/admin/disbursement-retries',
            icon: RefreshCw,
            description: 'Monitor & retry failed disbursements'
          }] : []),
          {
            name: 'My Profile',
            href: '/profile',
            icon: User,
            description: 'Manage your profile & password'
          },
          // Only show System Settings for super_admin
          ...(isSuperAdmin ? [{
            name: 'System Settings',
            href: '/settings',
            icon: Settings,
            description: 'Configure system'
          }] : [])
        ]
      },
      {
        title: 'Resources',
        items: [
          {
            name: 'API Documentation',
            href: '/api-docs',
            icon: FileText,
            description: 'Integration guides'
          }
        ]
      }
    ]

    // Filter out empty groups
    return allGroups.filter(group => group.items.length > 0)
  }

  const navigationGroups = getFilteredNavigationGroups()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups(prev => 
      prev.includes(groupTitle) 
        ? prev.filter(g => g !== groupTitle)
        : [...prev, groupTitle]
    )
  }

  const NavItem = ({ item, level = 0 }: { item: NavigationItem, level?: number }) => {
    const Icon = item.icon
    const active = isActive(item.href)
    
    return (
      <Link
        href={item.href}
        className={`
          group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
          ${level > 0 ? 'ml-4' : ''}
          ${active 
            ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-600' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }
        `}
        onClick={() => setIsMobileOpen(false)}
      >
        <Icon className={`h-5 w-5 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
        {!isCollapsed && (
          <>
            <span className="ml-3 flex-1">{item.name}</span>
            {item.badge && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                {item.badge}
              </span>
            )}
          </>
        )}
      </Link>
    )
  }

  const NavGroup = ({ group }: { group: NavigationGroup }) => {
    const isExpanded = expandedGroups.includes(group.title.toLowerCase())
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

    return (
      <div className="mb-6">
        {!isCollapsed && (
          <button
            onClick={() => toggleGroup(group.title.toLowerCase())}
            className="flex items-center w-full px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
          >
            <ChevronIcon className="h-4 w-4 mr-2" />
            {group.title}
          </button>
        )}
        
        {isExpanded && (
          <div className="space-y-1">
            {group.items.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        ${className}
      `}>
        <div className={`
          flex flex-col h-full bg-white border-r border-gray-200 shadow-lg sidebar-transition
          ${isCollapsed ? 'w-16' : 'w-64'}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            {!isCollapsed && (
              <div className="flex items-center">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                  <DollarSign className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-bold text-gray-900">M-Pesa Vault</h1>
                  <p className="text-xs text-gray-500">B2C Disbursement</p>
                </div>
              </div>
            )}
            
            {/* Collapse button (desktop only) */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>

            {/* Close button (mobile only) */}
            <button
              onClick={() => setIsMobileOpen(false)}
              className="lg:hidden flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto sidebar-scroll">
            {navigationGroups.map((group) => (
              <NavGroup key={group.title} group={group} />
            ))}
          </nav>

          {/* User section */}
          {isAuthenticated && (
            <div className="border-t border-gray-200 p-4">
              {!isCollapsed ? (
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {user?.first_name && user?.last_name 
                        ? `${user.first_name} ${user.last_name}` 
                        : user?.email || 'User'
                      }
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {user?.email || 'user@example.com'}
                    </p>
                    {user?.role && (
                      <p className="text-xs text-blue-600 truncate capitalize">
                        {user.role.replace('_', ' ')}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-1">
                    <Link
                      href="/profile"
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="My Profile"
                    >
                      <User className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                  <div className="flex space-x-1">
                    <Link
                      href="/profile"
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="My Profile"
                    >
                      <User className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 flex items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-lg shadow-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  )
}
