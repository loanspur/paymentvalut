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
  AlertTriangle,
  Settings,
  Menu,
  X,
  Home,
  FileText,
  LogOut,
  User,
  Shield
} from 'lucide-react'

interface NavigationProps {
  className?: string
}

export default function Navigation({ className = '' }: NavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { user, isAuthenticated, logout } = useAuth()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Filter navigation items based on user role
  const getFilteredNavigationItems = () => {
    const isSuperAdmin = user?.role === 'super_admin'
    const isAdmin = user?.role === 'admin'
    
    const allItems = [
      {
        name: 'Dashboard',
        href: '/',
        icon: Home,
        description: 'Main dashboard'
      },
      // Only show Send Money for super_admin
      ...(isSuperAdmin ? [{
        name: 'Send Money',
        href: '/disburse',
        icon: Send,
        description: 'Initiate disbursement'
      }] : []),
      // Only show Partners for super_admin and admin
      ...(isSuperAdmin || isAdmin ? [{
        name: 'Partners',
        href: '/partners',
        icon: Building2,
        description: 'Manage partners'
      }] : []),
      {
        name: 'History',
        href: '/history',
        icon: History,
        description: 'Transaction history'
      },
      // Only show Settings for super_admin
      ...(isSuperAdmin ? [{
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'System settings'
      }] : []),
      {
        name: 'API Docs',
        href: '/api-docs',
        icon: FileText,
        description: 'USSD API documentation'
      },
      // Only show Admin for super_admin and admin
      ...(isSuperAdmin || isAdmin ? [{
        name: 'Admin',
        href: '/admin-dashboard',
        icon: Shield,
        description: 'User management & activity tracking'
      }] : [])
    ]
    
    return allItems
  }

  const navigationItems = getFilteredNavigationItems()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
          <span className="sr-only">Open main menu</span>
          {isMobileMenuOpen ? (
            <X className="block h-6 w-6" />
          ) : (
            <Menu className="block h-6 w-6" />
          )}
        </button>
      </div>

      {/* Desktop Navigation */}
      <nav className={`hidden lg:flex lg:space-x-1 ${className}`}>
        {navigationItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={`group flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
        
        {/* Logout Button */}
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="group flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        )}
      </nav>

      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-b border-gray-200">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  prefetch={true}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`group flex items-center px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
            
            {/* Mobile Logout Button */}
            {isAuthenticated && (
              <button
                onClick={() => {
                  handleLogout()
                  setIsMobileMenuOpen(false)
                }}
                className="group flex items-center px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors w-full"
              >
                <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                <span>Logout</span>
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// Sidebar Navigation Component
export function SidebarNavigation({ className = '' }: NavigationProps) {
  const pathname = usePathname()
  const { user, isAuthenticated, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  // Filter navigation items based on user role
  const getFilteredNavigationItems = () => {
    const isSuperAdmin = user?.role === 'super_admin'
    const isAdmin = user?.role === 'admin'
    
    const allItems = [
      {
        name: 'Dashboard',
        href: '/',
        icon: Home,
        description: 'Main dashboard'
      },
      // Only show Send Money for super_admin
      ...(isSuperAdmin ? [{
        name: 'Send Money',
        href: '/disburse',
        icon: Send,
        description: 'Initiate disbursement'
      }] : []),
      // Only show Partners for super_admin and admin
      ...(isSuperAdmin || isAdmin ? [{
        name: 'Partners',
        href: '/partners',
        icon: Building2,
        description: 'Manage partners'
      }] : []),
      {
        name: 'History',
        href: '/history',
        icon: History,
        description: 'Transaction history'
      },
      // Only show Settings for super_admin
      ...(isSuperAdmin ? [{
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        description: 'System settings'
      }] : []),
      {
        name: 'API Docs',
        href: '/api-docs',
        icon: FileText,
        description: 'USSD API documentation'
      },
      // Only show Admin for super_admin and admin
      ...(isSuperAdmin || isAdmin ? [{
        name: 'Admin',
        href: '/admin-dashboard',
        icon: Shield,
        description: 'User management & activity tracking'
      }] : [])
    ]
    
    return allItems
  }

  const navigationItems = getFilteredNavigationItems()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className={`flex flex-col w-64 bg-white border-r border-gray-200 ${className}`}>
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-gray-200">
        <DollarSign className="w-8 h-8 text-blue-600 mr-3" />
        <div>
          <h1 className="text-lg font-bold text-gray-900">eazzypay</h1>
          <p className="text-xs text-gray-500">B2C Disbursement</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              prefetch={true}
              className={`group flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Logout Button */}
      {isAuthenticated && (
        <div className="px-4 py-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="group flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  )
}
