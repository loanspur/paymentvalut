'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from './AuthProvider'
import { User, LogOut, ChevronDown } from 'lucide-react'

interface ProfileDropdownProps {
  className?: string
}

export default function ProfileDropdown({ className = '' }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, logout } = useAuth()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleLogout = async () => {
    try {
      console.log('🔄 ProfileDropdown logout initiated...')
      await logout()
      setIsOpen(false)
      console.log('✅ ProfileDropdown logout completed')
    } catch (error) {
      console.error('❌ ProfileDropdown logout error:', error)
      setIsOpen(false)
      // Even if logout fails, try to redirect
      if (typeof window !== 'undefined') {
        window.location.href = '/secure-login'
      }
    }
  }

  const handleProfileClick = () => {
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
      >
        {/* User Avatar */}
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-full">
          <User className="w-4 h-4 text-white" />
        </div>
        
        {/* User Info */}
        <div className="flex-1 text-left">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.first_name && user?.last_name 
              ? `${user.first_name} ${user.last_name}` 
              : user?.email || 'User'
            }
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.role?.replace('_', ' ') || 'User'}
          </p>
        </div>
        
        {/* Dropdown Arrow */}
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900">
              {user?.first_name && user?.last_name 
                ? `${user.first_name} ${user.last_name}` 
                : user?.email || 'User'
              }
            </p>
            <p className="text-xs text-gray-500">
              {user?.email || 'user@example.com'}
            </p>
            {user?.role && (
              <p className="text-xs text-blue-600 capitalize mt-1">
                {user.role.replace('_', ' ')}
              </p>
            )}
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/profile"
              onClick={handleProfileClick}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <User className="w-4 h-4 mr-3 text-gray-400" />
              My Profile
            </Link>
            
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-3 text-gray-400" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
