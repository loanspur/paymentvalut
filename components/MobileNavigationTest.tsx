'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'

export default function MobileNavigationTest() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden">
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 flex items-center justify-center w-12 h-12 bg-white border border-gray-200 rounded-lg shadow-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
        aria-label="Open navigation menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-lg w-64">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
                <span className="text-white font-bold">M</span>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-bold text-gray-900">M-Pesa Vault</h1>
                <p className="text-xs text-gray-500">B2C Disbursement</p>
              </div>
            </div>
            
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 overflow-y-auto">
            <div className="space-y-1">
              <a
                href="/"
                className="group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span className="ml-3">Dashboard</span>
              </a>
              <a
                href="/disburse"
                className="group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span className="ml-3">Send Money</span>
              </a>
              <a
                href="/partners"
                className="group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span className="ml-3">Partners</span>
              </a>
              <a
                href="/history"
                className="group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span className="ml-3">History</span>
              </a>
              <a
                href="/wallet"
                className="group flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <span className="ml-3">Wallet</span>
              </a>
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                <span className="text-gray-600 text-sm">U</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">User</p>
                <p className="text-xs text-gray-500 truncate">user@example.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
