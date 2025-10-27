import { BALANCE_THRESHOLDS, DATA_FRESHNESS } from './constants'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Utility function for combining class names
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Currency formatting
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 2
  }).format(amount)
}

// Variance formatting
export const formatVariance = (variance: number): string => {
  const sign = variance >= 0 ? '+' : ''
  return `${sign}${variance.toFixed(2)}%`
}

// Date formatting with East Africa Time (UTC+3)
export const formatDate = (date: string | Date): string => {
  const dateObj = new Date(date)
  
  // Convert to East Africa Time (UTC+3)
  const eastAfricaTime = new Date(dateObj.getTime() + (3 * 60 * 60 * 1000))
  
  return eastAfricaTime.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Nairobi'
  })
}

// Date and time formatting with East Africa Time (UTC+3)
export const formatDateTime = (date: string | Date): string => {
  const dateObj = new Date(date)
  
  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Africa/Nairobi'
  })
}

// Date only formatting with East Africa Time (UTC+3)
export const formatDateOnly = (date: string | Date): string => {
  const dateObj = new Date(date)
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Africa/Nairobi'
  })
}

// Time only formatting with East Africa Time (UTC+3)
export const formatTimeOnly = (date: string | Date): string => {
  const dateObj = new Date(date)
  
  return dateObj.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Africa/Nairobi'
  })
}

// Relative time formatting
export const formatRelativeTime = (date: string | Date): string => {
  const now = new Date()
  const targetDate = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - targetDate.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return 'Just now'
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60)
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600)
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else {
    const days = Math.floor(diffInSeconds / 86400)
    return `${days} day${days > 1 ? 's' : ''} ago`
  }
}

// Balance status determination
export const getBalanceStatus = (balance: number): 'healthy' | 'warning' | 'critical' => {
  if (balance < BALANCE_THRESHOLDS.CRITICAL) {
    return 'critical'
  } else if (balance < BALANCE_THRESHOLDS.WARNING) {
    return 'warning'
  }
  return 'healthy'
}

// Data freshness determination
export const getDataFreshness = (lastUpdated: string | Date): 'fresh' | 'recent' | 'stale' => {
  const now = new Date()
  const lastUpdate = new Date(lastUpdated)
  const diffInHours = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

  if (diffInHours < 1) {
    return DATA_FRESHNESS.FRESH
  } else if (diffInHours < 24) {
    return DATA_FRESHNESS.RECENT
  }
  return DATA_FRESHNESS.STALE
}

// Status color classes
export const getStatusColorClass = (status: string): string => {
  switch (status) {
    case 'healthy':
    case 'completed':
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'warning':
      return 'bg-yellow-100 text-yellow-800'
    case 'critical':
    case 'failed':
    case 'error':
      return 'bg-red-100 text-red-800'
    case 'pending':
    case 'in_progress':
      return 'bg-blue-100 text-blue-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Freshness color classes
export const getFreshnessColorClass = (freshness: string): string => {
  switch (freshness) {
    case DATA_FRESHNESS.FRESH:
      return 'bg-green-100 text-green-800'
    case DATA_FRESHNESS.RECENT:
      return 'bg-yellow-100 text-yellow-800'
    case DATA_FRESHNESS.STALE:
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

// Pagination utilities
export const getPaginationInfo = (currentPage: number, itemsPerPage: number, totalItems: number) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems)

  return {
    totalPages,
    startIndex,
    endIndex,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1
  }
}

// Generate page numbers with ellipsis
export const getPageNumbers = (currentPage: number, totalPages: number): (number | string)[] => {
  const pages: (number | string)[] = []
  const maxVisiblePages = 5

  if (totalPages <= maxVisiblePages) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1)
      pages.push('...')
      for (let i = totalPages - 3; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      pages.push(1)
      pages.push('...')
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    }
  }

  return pages
}

// Debounce function
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// Throttle function
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// Safe JSON parse
export const safeJsonParse = <T>(json: string, fallback: T): T => {
  try {
    return JSON.parse(json)
  } catch {
    return fallback
  }
}

// Generate unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9)
}

// Validate email
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate phone number (Kenyan format)
export const isValidPhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^(\+254|0)[17]\d{8}$/
  return phoneRegex.test(phone.replace(/\s/g, ''))
}

// Format phone number
export const formatPhoneNumber = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('254')) {
    return `+${cleaned}`
  } else if (cleaned.startsWith('0')) {
    return `+254${cleaned.substring(1)}`
  }
  return phone
}

// File size formatting
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// Download file utility
export const downloadFile = (data: string, filename: string, mimeType: string): void => {
  const blob = new Blob([data], { type: mimeType })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}