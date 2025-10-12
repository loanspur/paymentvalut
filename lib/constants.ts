// Application Constants
export const BALANCE_THRESHOLDS = {
  CRITICAL: 1000,
  WARNING: 5000
} as const

export const SYNC_INTERVALS = {
  MIN: 5,
  MAX: 1440,
  DEFAULT: 30
} as const

export const NOTIFICATION_DURATION = {
  SHORT: 3000,
  MEDIUM: 5000,
  LONG: 10000
} as const

export const AUTO_REFRESH_INTERVALS = {
  BALANCE_MONITORING: 60000, // 60 seconds
  DASHBOARD: 30000, // 30 seconds
  TRANSACTION_HISTORY: 60000 // 60 seconds
} as const

export const API_ENDPOINTS = {
  BALANCE: {
    OFFICIAL: '/api/balance/official-balances',
    SYNC: '/api/balance/sync',
    PARTNER_SETTINGS: '/api/balance/partner-settings',
    TENANT_BALANCES: '/api/balance/tenant-balances',
    TRIGGER_CHECK: '/api/balance/trigger-check'
  },
  DASHBOARD: {
    STATS: '/api/dashboard/stats',
    RECENT_TRANSACTIONS: '/api/dashboard/recent-transactions',
    PARTNER_STATS: '/api/dashboard/partner-stats',
    CHART_DATA: '/api/dashboard/chart-data'
  },
  AUTH: {
    ME: '/api/auth/me',
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout'
  }
} as const

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  PARTNER_ADMIN: 'partner_admin'
} as const

export const BALANCE_STATUS = {
  HEALTHY: 'healthy',
  WARNING: 'warning',
  CRITICAL: 'critical'
} as const

export const DATA_FRESHNESS = {
  FRESH: 'fresh',
  RECENT: 'recent',
  STALE: 'stale'
} as const

export const SYNC_TYPES = {
  AUTO: 'auto',
  MANUAL: 'manual',
  FORCE: 'force',
  SETTINGS_UPDATE: 'settings_update'
} as const

export const SYNC_STATUS = {
  COMPLETED: 'completed',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress'
} as const

// Default values
export const DEFAULT_VALUES = {
  BALANCE_THRESHOLD: 1000,
  SYNC_INTERVAL: 30,
  PAGINATION: {
    ITEMS_PER_PAGE: 10,
    MAX_ITEMS_PER_PAGE: 100
  },
  MONITORING: {
    WORKING_ACCOUNT_THRESHOLD: 1000.00,
    UTILITY_ACCOUNT_THRESHOLD: 500.00,
    CHARGES_ACCOUNT_THRESHOLD: 200.00,
    VARIANCE_DROP_THRESHOLD: 5000.00,
    CHECK_INTERVAL_MINUTES: 15,
    SLACK_CHANNEL: '#mpesa-alerts'
  }
} as const

// Error messages
export const ERROR_MESSAGES = {
  AUTHENTICATION_REQUIRED: 'Authentication required',
  INVALID_TOKEN: 'Invalid token',
  USER_NOT_FOUND: 'User not found or inactive',
  ACCESS_DENIED: 'Access denied',
  NETWORK_ERROR: 'Network error occurred',
  UNKNOWN_ERROR: 'An unknown error occurred'
} as const

// Success messages
export const SUCCESS_MESSAGES = {
  SYNC_TRIGGERED: 'Balance synchronization started',
  SETTINGS_UPDATED: 'Settings updated successfully',
  DATA_SAVED: 'Data saved successfully'
} as const
