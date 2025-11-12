'use client'

import { useState, useEffect, useRef } from 'react'
import { formatDate, formatDateOnly } from '../../lib/utils'
import { 
  Wallet, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  History, 
  RefreshCw,
  CreditCard,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  Calendar,
  Filter,
  Download,
  Eye,
  EyeOff,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  X,
  Info,
  BarChart3,
  Receipt,
  Activity
} from 'lucide-react'
import { useToast } from '../../components/ToastSimple'

interface WalletData {
  id: string
  partner_id: string
  current_balance: number
  currency: string
  last_topup_date?: string
  last_topup_amount?: number
  low_balance_threshold: number
  is_active: boolean
  created_at: string
  updated_at: string
}

interface ChargeStatistics {
  today: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
  week: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
  month: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
  quarter: {
    totalTransactions: number
    totalAmount: number
    chargeTypes: Record<string, { count: number, amount: number }>
  }
}

interface WalletTransaction {
  id: string
  wallet_id: string
  partner_id: string
  transaction_type: string
  amount: number
  currency: string
  reference?: string
  description?: string
  status: string
  created_at: string
  metadata?: any
  partner_name?: string
  partner_short_code?: string
  wallet_balance_after?: number
}

interface TopUpRequest {
  amount: number
  phone_number: string
  partner_id?: string
}

interface Partner {
  id: string
  name: string
  short_code: string
  mpesa_shortcode?: string
  is_active: boolean
}

interface User {
  id: string
  email: string
  role: string
  partner_id?: string
  first_name?: string
  last_name?: string
  phone_number?: string
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletData | null>(null)
  const [transactions, setTransactions] = useState<WalletTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [showTopUpModal, setShowTopUpModal] = useState(false)
  const [showFloatModal, setShowFloatModal] = useState(false)
  const [topUpData, setTopUpData] = useState<TopUpRequest>({ amount: 0, phone_number: '' })
  const [floatAmount, setFloatAmount] = useState(0)
  const [floatPurchaseStep, setFloatPurchaseStep] = useState<'amount' | 'otp' | 'processing' | 'success'>('amount')
  const [selectedB2CShortCode, setSelectedB2CShortCode] = useState<string>('')
  const [isNewB2CShortCode, setIsNewB2CShortCode] = useState(false)
  const [newB2CShortCode, setNewB2CShortCode] = useState<string>('')
  const [newB2CShortCodeName, setNewB2CShortCodeName] = useState<string>('')
  const [floatCharges, setFloatCharges] = useState<{ amount: number; percentage?: number; name?: string } | null>(null)
  const [floatTotalCost, setFloatTotalCost] = useState(0)
  const [otpCode, setOtpCode] = useState('')
  const [otpReference, setOtpReference] = useState('')
  const [walletTransactionId, setWalletTransactionId] = useState('')
  const [partnerShortCodes, setPartnerShortCodes] = useState<Array<{ id: string; shortcode: string; shortcode_name: string; is_active: boolean; partner_id?: string; partner_name?: string }>>([])
  const [floatPurchaseStatus, setFloatPurchaseStatus] = useState<'pending' | 'processing' | 'completed' | 'failed'>('pending')
  const [floatPurchasePartnerId, setFloatPurchasePartnerId] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)
  const [partners, setPartners] = useState<Partner[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<{ phone_number?: string, email?: string } | null>(null)
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null)
  const [viewingPartnerId, setViewingPartnerId] = useState<string | null>(null)
  const [floatPurchaseLoading, setFloatPurchaseLoading] = useState(false)
  const [isTopUpLoading, setIsTopUpLoading] = useState(false)
  const [topUpMethod, setTopUpMethod] = useState<'stk_push' | 'manual'>('stk_push')
  const [stkAwaiting, setStkAwaiting] = useState(false)
  const [stkCompleted, setStkCompleted] = useState(false)
  const [stkWalletTransactionId, setStkWalletTransactionId] = useState<string | null>(null)
  const [stkPushTransactionId, setStkPushTransactionId] = useState<string | null>(null)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  const completionToastShownRef = useRef(false)
  
  const { addToast } = useToast()
  
  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      addToast({
        type: 'success',
        title: 'Copied!',
        message: `${label} copied to clipboard`,
        duration: 3000
      })
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Copy Failed',
        message: 'Failed to copy to clipboard',
        duration: 3000
      })
    }
  }
  const [filters, setFilters] = useState({
    transaction_type: '',
    status: '',
    start_date: '',
    end_date: '',
    search: ''
  })
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  })
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null)
  const [chargeStats, setChargeStats] = useState<ChargeStatistics | null>(null)

  // Reset pagination to page 1 when filters change (except page changes)
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }))
  }, [filters.transaction_type, filters.status, filters.start_date, filters.end_date, filters.search])

  // Load user and partners first
  useEffect(() => {
    loadCurrentUser()
    loadPartners()
  }, [])

  // Load user profile after currentUser is loaded
  useEffect(() => {
    if (currentUser) {
    loadUserProfile()
    }
  }, [currentUser])

  // Auto-select first partner for super_admin if none selected (after partners are loaded)
  useEffect(() => {
    if (currentUser?.role === 'super_admin' && !viewingPartnerId && partners.length > 0) {
      const firstActivePartner = partners.find(p => p.is_active)
      if (firstActivePartner) {
        setViewingPartnerId(firstActivePartner.id)
      }
    }
  }, [currentUser, partners, viewingPartnerId])

  // Load wallet data only when partner is selected (or user has partner_id)
  useEffect(() => {
    // For super_admin, wait until viewingPartnerId is set
    if (currentUser?.role === 'super_admin' && !viewingPartnerId) {
      return
    }
    // For regular users, wait until currentUser is loaded
    if (currentUser?.role !== 'super_admin' && !currentUser?.partner_id) {
      // If user is loaded but has no partner_id, stop loading and show error
      if (currentUser) {
        setLoading(false)
        addToast({
          type: 'error',
          title: 'No Partner Assigned',
          message: 'You must be assigned to a partner to view wallet data. Please contact your administrator.',
          duration: 8000
        })
      }
      return
    }
    
    loadWalletData()
    loadTransactions()
    loadChargeStatistics()
  }, [pagination.page, filters, viewingPartnerId, currentUser])

  // Poll for STK completion and auto-verify with NCBA (optimized to prevent flickering)
  useEffect(() => {
    if (stkAwaiting && stkWalletTransactionId) {
      // Clear any existing polling interval
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
      }
      let attempts = 0
      let verificationAttempted = false
      let lastStatus: string | null = null
      const maxAttempts = 60 // ~120s at 2s interval
      const verificationDelay = 5 // Verify with NCBA after 5 attempts (10 seconds)
      
      pollingRef.current = setInterval(async () => {
        attempts += 1
        try {
          // Only fetch the specific transaction to avoid full state updates that cause flickering
          const params = new URLSearchParams({
            page: '1',
            limit: '50'
          })
          if (currentUser?.role === 'super_admin' && viewingPartnerId) {
            params.append('partner_id', viewingPartnerId)
          }
          
          const txResponse = await fetch(`/api/wallet/transactions?${params}`)
          if (txResponse.ok) {
            const txData = await txResponse.json()
            const freshTx = txData.data?.find((t: WalletTransaction) => t.id === stkWalletTransactionId)
            
            if (freshTx) {
              // Only update state if status changed to prevent unnecessary re-renders
              if (freshTx.status !== lastStatus) {
                lastStatus = freshTx.status
                
                if (freshTx.status === 'completed') {
            if (pollingRef.current) clearInterval(pollingRef.current)
            pollingRef.current = null
            setStkCompleted(true)
                  // Keep stkAwaiting true so the success modal persists
                  // It will be set to false when user clicks "Done"
            if (!completionToastShownRef.current) {
              completionToastShownRef.current = true
              addToast({
                type: 'success',
                title: 'Top-up Completed',
                message: 'Your wallet has been credited successfully',
                duration: 6000
              })
            }
                  // Reload data to show updated balance (only once when completed)
                  loadWalletData()
                  loadTransactions()
                  return
          }
              }
              
              // If still pending after verification delay, verify with NCBA
              if (!verificationAttempted && attempts >= verificationDelay && freshTx.status === 'pending') {
                verificationAttempted = true
                console.log('Auto-verifying STK push with NCBA...')
                
                try {
                  const verifyResponse = await fetch('/api/wallet/topup/verify-stk', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                      wallet_transaction_id: stkWalletTransactionId
                    })
                  })
                  
                      if (verifyResponse.ok) {
                        const verifyData = await verifyResponse.json()
                        if (verifyData.success) {
                          console.log('Auto-verification successful:', verifyData.message)
                          // Check status again after verification
                          setTimeout(async () => {
                            const recheckResponse = await fetch(`/api/wallet/transactions?${params}`)
                            if (recheckResponse.ok) {
                              const recheckData = await recheckResponse.json()
                              const recheckTx = recheckData.data?.find((t: WalletTransaction) => t.id === stkWalletTransactionId)
                              if (recheckTx?.status === 'completed') {
                                if (pollingRef.current) clearInterval(pollingRef.current)
                                pollingRef.current = null
                                setStkCompleted(true)
                                // Keep stkAwaiting true so the success modal persists
                                // It will be set to false when user clicks "Done"
                                if (!completionToastShownRef.current) {
                                  completionToastShownRef.current = true
                                  addToast({
                                    type: 'success',
                                    title: 'Top-up Completed',
                                    message: 'Your wallet has been credited successfully',
                                    duration: 6000
                                  })
                                }
                                loadWalletData()
                                loadTransactions()
                              }
                            }
                          }, 1000)
                        }
                      }
                } catch (verifyError) {
                  console.error('Auto-verification error:', verifyError)
                }
              }
            }
          }
        } catch (error) {
          console.error('Polling error:', error)
        }
        
        if (attempts >= maxAttempts) {
          if (pollingRef.current) clearInterval(pollingRef.current)
          pollingRef.current = null
          // If still pending after max attempts, offer manual verification
          addToast({
            type: 'info',
            title: 'Verification Timeout',
            message: 'Transaction is still pending. You can verify manually from the transaction details.',
            duration: 8000
          })
        }
      }, 2000)
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [stkAwaiting, stkWalletTransactionId, currentUser, viewingPartnerId])

  const loadWalletData = async () => {
    try {
      setLoading(true)
      let url = '/api/wallet'
      if (currentUser?.role === 'super_admin' && viewingPartnerId) {
        url += `?partner_id=${viewingPartnerId}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setWallet(data.data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error === 'No partner assigned' && currentUser?.role === 'super_admin') {
          // For super_admin, show a message to select a partner
          addToast({
            type: 'info',
            title: 'Select Partner',
            message: 'Please select a partner to view wallet data',
            duration: 5000
          })
        }
      }
    } catch (error) {
      console.error('Failed to load wallet data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include'
      })
      if (response.ok) {
        const data = await response.json()
        setCurrentUser(data.user)
      }
    } catch (error) {
      console.error('Failed to load current user:', error)
    }
  }

  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/profile', { credentials: 'include' })
      if (response.ok) {
        const data = await response.json()
        const profileData = data?.data || data?.profile || {}
        setUserProfile({
          phone_number: profileData.phone_number || currentUser?.phone_number,
          email: profileData.email || currentUser?.email
        })
      } else {
        // Fallback to currentUser data if profile API fails
        if (currentUser) {
          setUserProfile({
            phone_number: currentUser.phone_number,
            email: currentUser.email
          })
        }
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
      // Fallback to currentUser data if profile API fails
      if (currentUser) {
        setUserProfile({
          phone_number: currentUser.phone_number,
          email: currentUser.email
        })
      }
    }
  }

  const loadPartners = async () => {
    try {
      const response = await fetch('/api/partners')
      if (response.ok) {
        const data = await response.json()
        setPartners(data.partners || [])
      }
    } catch (error) {
      console.error('Failed to load partners:', error)
    }
  }

  const loadChargeStatistics = async () => {
    try {
      let url = '/api/wallet/charge-statistics'
      if (currentUser?.role === 'super_admin' && viewingPartnerId) {
        url += `?partner_id=${viewingPartnerId}`
      }
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setChargeStats(data.data)
      }
    } catch (error) {
      console.error('Failed to load charge statistics:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v !== ''))
      })

      if (currentUser?.role === 'super_admin' && viewingPartnerId) {
        params.append('partner_id', viewingPartnerId)
      }

      const response = await fetch(`/api/wallet/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.data || [])
        setPagination(prev => ({
          ...prev,
          total: data.pagination?.total || 0,
          totalPages: Math.ceil((data.pagination?.total || 0) / pagination.limit)
        }))
      } else {
        const errorData = await response.json().catch(() => ({}))
        if (errorData.error === 'No partner assigned' && currentUser?.role === 'super_admin') {
          // For super_admin, show a message to select a partner
          addToast({
            type: 'info',
            title: 'Select Partner',
            message: 'Please select a partner to view transactions',
            duration: 5000
          })
        }
      }
    } catch (error) {
      console.error('Failed to load transactions:', error)
    }
  }

  const handleTopUp = async () => {
    if (!topUpData.amount || !topUpData.phone_number) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please fill in all fields',
        duration: 5000
      })
      return
    }

    // For super admin, require partner selection
    if (currentUser?.role === 'super_admin' && !topUpData.partner_id) {
      addToast({
        type: 'error',
        title: 'Partner Required',
        message: 'Please select a partner for the top-up',
        duration: 5000
      })
      return
    }

    setIsTopUpLoading(true)

    try {
      const response = await fetch('/api/wallet/topup/stk-push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(topUpData)
      })

      if (response.ok) {
        const result = await response.json()
        addToast({
          type: 'success',
          title: 'STK Push Initiated',
          message: 'Enter your M-Pesa PIN to complete the payment',
          duration: 8000
        })
        // Persist modal and show waiting state until completion
        setStkAwaiting(true)
        setStkCompleted(false)
        setStkWalletTransactionId(result?.data?.wallet_transaction?.id || null)
        setStkPushTransactionId(result?.data?.transaction_id || null)
        // Polling is managed by useEffect below
      } else {
        const error = await response.json()
        addToast({
          type: 'error',
          title: 'Top-up Failed',
          message: error.error || 'An error occurred during top-up',
          duration: 8000
        })
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: 'Network Error',
        message: 'Top-up failed. Please check your connection and try again.',
        duration: 8000
      })
    } finally {
      setIsTopUpLoading(false)
    }
  }

  // Load partner shortcodes when modal opens
  const loadPartnerShortCodes = async (partnerId?: string | null) => {
    try {
      // For super_admin, load all shortcodes with partner info
      // For regular users, load only their partner's shortcodes
      const url = currentUser?.role === 'super_admin' 
        ? '/api/admin/partners/shortcodes/all'
        : '/api/partner/shortcodes'
      
      const response = await fetch(url)
      console.log('Shortcode API response status:', response.status, 'URL:', url)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Shortcode API response data:', data)
        
        // Handle both response formats: { success: true, shortcodes: [...] } and { shortcodes: [...] }
        let shortcodes = data.shortcodes || (data.success ? data.data?.shortcodes : [])
        console.log('Extracted shortcodes array:', shortcodes?.length || 0, shortcodes)
        
        if (shortcodes && Array.isArray(shortcodes)) {
          // Filter active shortcodes (handle both boolean and null/undefined)
          // Note: API already filters by is_active=true, but we do a safety check here
          let filteredShortcodes = shortcodes.filter((sc: any) => sc.is_active !== false)
          console.log('After is_active filter:', filteredShortcodes.length, filteredShortcodes)
          
          // If super_admin selected a specific partner, filter by that partner
          // But also show all shortcodes if filtering results in empty (for debugging)
          if (currentUser?.role === 'super_admin' && partnerId) {
            console.log('Filtering by partner_id:', partnerId, 'Type:', typeof partnerId)
            const beforeFilter = filteredShortcodes.length
            const matchedShortcodes = filteredShortcodes.filter((sc: any) => {
              const matches = String(sc.partner_id) === String(partnerId)
              console.log(`  Shortcode ${sc.id}: partner_id=${sc.partner_id} (${typeof sc.partner_id}), matches=${matches}`)
              return matches
            })
            console.log(`Filtered from ${beforeFilter} to ${matchedShortcodes.length} shortcodes for partner ${partnerId}`)
            
            // If no matches found, show all shortcodes with partner info (for debugging)
            if (matchedShortcodes.length === 0 && filteredShortcodes.length > 0) {
              console.warn('No shortcodes matched the selected partner. Showing all shortcodes for debugging.')
              filteredShortcodes = filteredShortcodes // Show all with partner names
            } else {
              filteredShortcodes = matchedShortcodes
            }
          }
          
          console.log('Final shortcodes to display:', filteredShortcodes.length, filteredShortcodes)
          setPartnerShortCodes(filteredShortcodes)
          
          // Auto-select first shortcode if available (always auto-select when loading)
          if (filteredShortcodes.length > 0) {
            const firstActive = filteredShortcodes[0]
            if (firstActive && firstActive.id) {
              setSelectedB2CShortCode(firstActive.id)
              console.log('Auto-selected shortcode:', firstActive.id, firstActive.shortcode_name)
            }
          } else {
            // Clear selection if no shortcodes available
            setSelectedB2CShortCode('')
            console.log('No shortcodes available for partner:', partnerId)
          }
        } else {
          // No shortcodes found or invalid response
          console.log('No shortcodes in response or invalid format:', data)
          setPartnerShortCodes([])
          setSelectedB2CShortCode('')
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error('Error loading shortcodes:', response.status, errorData)
        setPartnerShortCodes([])
        setSelectedB2CShortCode('')
      }
    } catch (error) {
      console.error('Error loading partner shortcodes:', error)
      setPartnerShortCodes([])
      setSelectedB2CShortCode('')
    }
  }

  // Calculate charges when amount changes
  useEffect(() => {
    // For super_admin, use selected partner or viewingPartnerId
    // For regular users, use their partner_id
    const partnerId = currentUser?.role === 'super_admin' 
      ? (floatPurchasePartnerId || viewingPartnerId)
      : currentUser?.partner_id
    
    if (floatAmount > 0 && partnerId) {
      const calculateCharges = async () => {
        try {
          const response = await fetch(`/api/wallet/float/purchase/calculate-charges?amount=${floatAmount}&partner_id=${partnerId}`)
          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setFloatCharges(data.charges)
              setFloatTotalCost(data.total_cost)
            }
          }
        } catch (error) {
          console.error('Error calculating charges:', error)
        }
      }
      calculateCharges()
    }
  }, [floatAmount, currentUser?.partner_id, currentUser?.role, floatPurchasePartnerId, viewingPartnerId])

  // Load shortcodes when modal opens or partner changes
  useEffect(() => {
    if (showFloatModal) {
      // Reset state when modal opens
      setFloatPurchaseStep('amount')
      setOtpCode('')
      setOtpReference('')
      setWalletTransactionId('')
      setFloatPurchaseStatus('pending')
      
      // For super_admin, use selected partner or viewingPartnerId
      // For regular users, use their partner_id
      const partnerId = currentUser?.role === 'super_admin' 
        ? (floatPurchasePartnerId || viewingPartnerId)
        : currentUser?.partner_id
      
      if (partnerId) {
        // Reset selection before loading new shortcodes
        setSelectedB2CShortCode('')
        // Don't clear partnerShortCodes here - let it show loading state
        
        // Load wallet data first, then shortcodes
        loadWalletData().then(() => {
          console.log('Loading shortcodes for partner in useEffect:', partnerId)
          loadPartnerShortCodes(partnerId)
        })
      } else if (currentUser?.role === 'super_admin') {
        // For super_admin without partner selected, load all shortcodes to show what's available
        console.log('Super admin - no partner selected, loading all shortcodes')
        loadPartnerShortCodes(null) // Load all shortcodes
      } else if (currentUser?.partner_id) {
        // For regular users, load their partner's shortcodes
        setSelectedB2CShortCode('')
        loadWalletData().then(() => {
          loadPartnerShortCodes(currentUser.partner_id)
        })
      }
    }
  }, [showFloatModal, currentUser?.partner_id, currentUser?.role, floatPurchasePartnerId, viewingPartnerId])

  const handleFloatPurchaseInitiate = async () => {
    if (!floatAmount || floatAmount < 1) {
      addToast({ type: 'error', title: 'Error', message: 'Please enter a valid float amount', duration: 5000 })
      return
    }


    // For super_admin, include partner_id if different from viewingPartnerId
    const partnerId = currentUser?.role === 'super_admin' 
      ? (floatPurchasePartnerId || viewingPartnerId)
      : currentUser?.partner_id

    if (currentUser?.role === 'super_admin' && !partnerId) {
      addToast({ type: 'error', title: 'Error', message: 'Please select a partner for float purchase', duration: 5000 })
      return
    }

    // For non-super_admin users, ensure they have a partner_id
    if (currentUser?.role !== 'super_admin' && !partnerId) {
      addToast({ type: 'error', title: 'Error', message: 'No partner assigned to your account. Please contact your administrator.', duration: 5000 })
      return
    }

    // Get the selected partner's shortcode
    const selectedPartner = partners.find(p => p.id === partnerId)
    const partnerShortcode = selectedPartner?.mpesa_shortcode || selectedPartner?.short_code

    if (!partnerShortcode) {
      addToast({ type: 'error', title: 'Error', message: 'Partner shortcode is not configured. Please configure it in partner settings.', duration: 5000 })
      return
    }

    setFloatPurchaseLoading(true)
    try {
      const requestBody: any = { 
        amount: floatAmount,
        b2c_shortcode_id: null, // No longer using partner_shortcodes table
        b2c_shortcode: partnerShortcode,
        b2c_shortcode_name: selectedPartner?.name || 'Partner B2C Account'
      }
      
      // Always include partner_id if available (required for super_admin, optional for others)
      if (partnerId) {
        requestBody.partner_id = partnerId
      }
      
      const response = await fetch('/api/wallet/float/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setOtpReference(result.data.otp_reference)
          setWalletTransactionId(result.data.wallet_transaction.id)
          setFloatPurchaseStep('otp')
          
          // Check if OTP was actually sent
          const otpSent = result.data?.smsSent || result.data?.emailSent
          if (otpSent) {
            addToast({ type: 'success', title: 'OTP Sent', message: 'Please check your email and SMS for the OTP code', duration: 8000 })
          } else {
            addToast({ type: 'warning', title: 'OTP Generated', message: 'OTP was generated but may not have been sent. Please contact support if you do not receive it.', duration: 10000 })
          }
        } else {
          addToast({ type: 'error', title: 'Error', message: result.error || result.details || 'Failed to initiate float purchase', duration: 5000 })
        }
      } else {
        const error = await response.json()
        addToast({ type: 'error', title: 'Error', message: error.error || error.details || 'Failed to initiate float purchase', duration: 5000 })
      }
    } catch (error) {
      console.error('Float purchase initiation error:', error)
      addToast({ type: 'error', title: 'Error', message: 'Float purchase initiation failed. Please try again.', duration: 5000 })
    } finally {
      setFloatPurchaseLoading(false)
    }
  }

  const handleFloatPurchaseConfirm = async () => {
    if (!otpCode || otpCode.length !== 6) {
      addToast({ type: 'error', title: 'Error', message: 'Please enter a valid 6-digit OTP code', duration: 5000 })
      return
    }

    setFloatPurchaseStep('processing')
    setFloatPurchaseStatus('processing')

    try {
      const response = await fetch('/api/wallet/float/purchase/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          otp_reference: otpReference,
          otp_code: otpCode,
          wallet_transaction_id: walletTransactionId
        })
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setFloatPurchaseStatus('completed')
          setFloatPurchaseStep('success')
          addToast({ type: 'success', title: 'Success', message: 'Float purchase completed successfully!', duration: 5000 })
          loadWalletData()
          loadTransactions()
          
          // Auto-close after 3 seconds
          setTimeout(() => {
        setShowFloatModal(false)
            setFloatPurchaseStep('amount')
        setFloatAmount(0)
            setOtpCode('')
            setSelectedB2CShortCode('')
            setIsNewB2CShortCode(false)
            setNewB2CShortCode('')
            setNewB2CShortCodeName('')
            setFloatPurchasePartnerId(null)
          }, 3000)
        } else {
          setFloatPurchaseStatus('failed')
          addToast({ type: 'error', title: 'Error', message: result.error || 'Float purchase confirmation failed', duration: 5000 })
          setFloatPurchaseStep('otp') // Go back to OTP step
        }
      } else {
        const error = await response.json()
        setFloatPurchaseStatus('failed')
        addToast({ type: 'error', title: 'Error', message: error.error || 'Float purchase confirmation failed', duration: 5000 })
        setFloatPurchaseStep('otp') // Go back to OTP step
      }
    } catch (error) {
      setFloatPurchaseStatus('failed')
      addToast({ type: 'error', title: 'Error', message: 'Float purchase confirmation failed. Please try again.', duration: 5000 })
      setFloatPurchaseStep('otp') // Go back to OTP step
    }
  }

  const handleFloatPurchase = () => {
    setShowFloatModal(true)
  }

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount)
  }

  const maskEmail = (email?: string) => {
    if (!email) return '—'
    const [name, domain] = email.split('@')
    if (!domain) return '—'
    const maskedName = name.length <= 2 ? name[0] + '*' : name[0] + '*'.repeat(Math.max(1, name.length - 2)) + name[name.length - 1]
    return `${maskedName}@${domain}`
  }

  const maskPhone = (phone?: string) => {
    if (!phone) return '—'
    // Extract digits only and show last 3-4 digits
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 3) return '—'
    const last3 = digits.slice(-3)
    return `****${last3}`
  }

  // formatDate is imported from lib/utils (uses EA Time)

  // Helper function to determine if a transaction is a credit (increases balance)
  const isCreditTransaction = (type: string): boolean => {
    return ['top_up', 'manual_credit'].includes(type)
  }

  // Helper function to determine if a transaction is a debit (decreases balance)
  const isDebitTransaction = (type: string): boolean => {
    return ['disbursement', 'charge', 'manual_debit', 'b2c_float_purchase', 'sms_charge'].includes(type)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'top_up':
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'manual_credit':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'manual_debit':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'disbursement':
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case 'b2c_float_purchase':
        return <CreditCard className="w-4 h-4 text-blue-600" />
      case 'charge':
        return <DollarSign className="w-4 h-4 text-orange-600" />
      case 'sms_charge':
        return <DollarSign className="w-4 h-4 text-purple-600" />
      default:
        return <Wallet className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const downloadCSV = () => {
    const headers = [
      'Date',
      'Type',
      'Amount',
      'Reference',
      'Description',
      'Status',
      'Partner',
      'Wallet Balance After'
    ]

    const csvContent = [
      headers.join(','),
      ...transactions.map(t => [
        formatDateOnly(t.created_at),
        t.transaction_type,
        t.amount,
        `"${t.reference || ''}"`,
        `"${t.description || ''}"`,
        t.status,
        `"${t.partner_name || ''}"`,
        t.wallet_balance_after || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `wallet-transactions-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleViewTransactionDetails = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction)
    setShowTransactionDetails(true)
  }

  const truncateText = (text: string, maxLength: number = 30) => {
    if (!text) return '-'
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text
  }

  const clearFilters = () => {
    setFilters({
      transaction_type: '',
      status: '',
      start_date: '',
      end_date: '',
      search: ''
    })
    // Reset pagination to page 1 when clearing filters
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const goToPage = (page: number) => {
    setPagination(prev => ({ ...prev, page }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading wallet data...</span>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="bg-white shadow mb-8">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Wallet className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Wallet Management</h1>
                <p className="text-sm text-gray-500">Manage your wallet balance and transactions</p>
              </div>
            </div>
            {/* Partner Selector for Super Admin */}
            {currentUser?.role === 'super_admin' && (
              <div className="mr-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  View Partner Wallet
                </label>
                <select
                  value={viewingPartnerId || ''}
                  onChange={(e) => {
                    setViewingPartnerId(e.target.value || null)
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  <option value="">Select a partner</option>
                  {partners.filter(p => p.is_active).map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex items-center space-x-3">
              {/* Wallet Action Buttons */}
              <button
                onClick={() => setShowTopUpModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Top Up Wallet
              </button>
              <button
                onClick={() => setShowFloatModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Purchase B2C Float
              </button>
              <button
                onClick={downloadCSV}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </button>
              
              {/* Balance and Refresh Controls */}
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors flex items-center"
              >
                {showBalance ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showBalance ? 'Hide' : 'Show'} Balance
              </button>
              <button
                onClick={() => {
                  loadWalletData()
                  loadChargeStatistics()
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Wallet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Current Balance */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Current Balance</p>
              <p className="text-3xl font-bold text-gray-900">
                {showBalance ? formatAmount(wallet?.current_balance || 0) : '••••••'}
              </p>
            </div>
            <Wallet className="h-12 w-12 text-blue-600" />
          </div>
          {wallet && wallet.current_balance < wallet.low_balance_threshold && (
            <div className="mt-4 flex items-center text-orange-600">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm">Low balance alert</span>
            </div>
          )}
        </div>

        {/* Last Top-up */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Last Top-up</p>
              <p className="text-2xl font-bold text-gray-900">
                {wallet?.last_topup_amount ? formatAmount(wallet.last_topup_amount) : 'None'}
              </p>
              <p className="text-sm text-gray-500">
                {wallet?.last_topup_date ? formatDate(wallet.last_topup_date) : 'No top-ups yet'}
              </p>
            </div>
            <TrendingUp className="h-12 w-12 text-green-600" />
          </div>
        </div>

        {/* Low Balance Threshold */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Low Balance Alert</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatAmount(wallet?.low_balance_threshold || 1000)}
              </p>
              <p className="text-sm text-gray-500">Alert threshold</p>
            </div>
            <AlertCircle className="h-12 w-12 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charge Statistics Cards */}
      {chargeStats && (
        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-purple-600" />
              Charge Management Statistics
            </h2>
          </div>
          <div className="p-6">
            {/* Summary strip based on single source of truth (last 30 days) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              {/* Total Charges (30 days) */}
              <div className="rounded-lg p-4 border bg-gradient-to-r from-slate-50 to-slate-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600">Total Charges (30d)</p>
                    <p className="text-2xl font-bold text-slate-900">{formatAmount(chargeStats.month.totalAmount)}</p>
                    <p className="text-xs text-slate-500">{chargeStats.month.totalTransactions} transactions</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-slate-700" />
                </div>
              </div>

              {/* SMS Charges (30 days) */}
              <div className="rounded-lg p-4 border bg-gradient-to-r from-indigo-50 to-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-600">SMS Charges (30d)</p>
                    <p className="text-2xl font-bold text-indigo-900">{formatAmount((chargeStats.month.chargeTypes['SMS Charges']?.amount || 0))}</p>
                    <p className="text-xs text-indigo-700">{chargeStats.month.chargeTypes['SMS Charges']?.count || 0} transactions</p>
                  </div>
                  <Receipt className="h-8 w-8 text-indigo-600" />
                </div>
              </div>

              {/* Float Purchase Fees (30 days) */}
              <div className="rounded-lg p-4 border bg-gradient-to-r from-amber-50 to-amber-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-amber-600">Float Fees (30d)</p>
                    <p className="text-2xl font-bold text-amber-900">{formatAmount((chargeStats.month.chargeTypes['Float Purchase Fee']?.amount || 0))}</p>
                    <p className="text-xs text-amber-700">{chargeStats.month.chargeTypes['Float Purchase Fee']?.count || 0} transactions</p>
                  </div>
                  <CreditCard className="h-8 w-8 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Today's Charges */}
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-600">Today's Charges</p>
                    <p className="text-2xl font-bold text-blue-900">{chargeStats.today.totalTransactions}</p>
                    <p className="text-sm text-blue-700">{formatAmount(chargeStats.today.totalAmount)}</p>
                  </div>
                  <Receipt className="h-8 w-8 text-blue-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.today.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-blue-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 7 Days Charges */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-600">7 Days Charges</p>
                    <p className="text-2xl font-bold text-green-900">{chargeStats.week.totalTransactions}</p>
                    <p className="text-sm text-green-700">{formatAmount(chargeStats.week.totalAmount)}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.week.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-green-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 30 Days Charges */}
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-purple-600">30 Days Charges</p>
                    <p className="text-2xl font-bold text-purple-900">{chargeStats.month.totalTransactions}</p>
                    <p className="text-sm text-purple-700">{formatAmount(chargeStats.month.totalAmount)}</p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.month.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-purple-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 90 Days Charges */}
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-orange-600">90 Days Charges</p>
                    <p className="text-2xl font-bold text-orange-900">{chargeStats.quarter.totalTransactions}</p>
                    <p className="text-sm text-orange-700">{formatAmount(chargeStats.quarter.totalAmount)}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                </div>
                <div className="mt-3">
                  {Object.entries(chargeStats.quarter.chargeTypes).map(([type, data]) => (
                    <div key={type} className="flex justify-between text-xs text-orange-700">
                      <span>{type}</span>
                      <span>{data.count} ({formatAmount(data.amount)})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction History */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 flex items-center">
              <History className="w-5 h-5 mr-2" />
              Transaction History ({pagination.total})
            </h2>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Transaction Type Filter */}
            <div>
              <select
                value={filters.transaction_type}
                onChange={(e) => setFilters(prev => ({ ...prev, transaction_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Types</option>
                <option value="top_up">Top Up</option>
                <option value="topup">Top Up (Legacy)</option>
                <option value="disbursement">Disbursement</option>
                <option value="b2c_float_purchase">B2C Float</option>
                <option value="charge">Charge</option>
                <option value="manual_credit">Manual Credit</option>
                <option value="manual_debit">Manual Debit</option>
                <option value="sms_charge">SMS Charge</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <input
                type="date"
                placeholder="Start Date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Start Date"
              />
            </div>

            {/* End Date */}
            <div>
              <input
                type="date"
                placeholder="End Date"
                value={filters.end_date}
                onChange={(e) => setFilters(prev => ({ ...prev, end_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="End Date"
                min={filters.start_date || undefined}
              />
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-colors flex items-center justify-center"
              >
                <X className="w-4 h-4 mr-1" />
                Clear
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Reference
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Balance After
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getTransactionIcon(transaction.transaction_type)}
                      <span className="ml-2 text-sm font-medium text-gray-900 capitalize">
                        {transaction.transaction_type.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      isCreditTransaction(transaction.transaction_type) ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {isCreditTransaction(transaction.transaction_type) ? '+' : '-'}{formatAmount(Math.abs(transaction.amount))}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="max-w-24 truncate" title={transaction.reference || ''}>
                      {truncateText(transaction.reference || '', 15)}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    <div className="max-w-32 truncate" title={transaction.description || ''}>
                      {truncateText(transaction.description || '', 20)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="max-w-24 truncate" title={transaction.partner_name || ''}>
                      {transaction.partner_short_code || '-'}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.wallet_balance_after ? formatAmount(transaction.wallet_balance_after) : '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(transaction.created_at)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleViewTransactionDetails(transaction)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="View Details"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Enhanced Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-gray-700">
                <span>
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                  {pagination.total} transactions
                </span>
              </div>
              
              <div className="flex items-center space-x-2">
                {/* First Page */}
                <button
                  onClick={() => goToPage(1)}
                  disabled={pagination.page === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>
                
                {/* Previous Page */}
                <button
                  onClick={() => goToPage(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {/* Page Numbers */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    let pageNum
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1
                    } else if (pagination.page <= 3) {
                      pageNum = i + 1
                    } else if (pagination.page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i
                    } else {
                      pageNum = pagination.page - 2 + i
                    }
                    
                    return (
                      <button
                        key={pageNum}
                        onClick={() => goToPage(pageNum)}
                        className={`px-3 py-1 text-sm border rounded ${
                          pageNum === pagination.page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                </div>
                
                {/* Next Page */}
                <button
                  onClick={() => goToPage(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                
                {/* Last Page */}
                <button
                  onClick={() => goToPage(pagination.totalPages)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions found</h3>
            <p className="text-gray-500 mb-4">Your transaction history will appear here when you make your first transaction.</p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => setShowTopUpModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Top Up Wallet
              </button>
              <button
                onClick={() => setShowFloatModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Purchase Float
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top-up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Top Up Wallet</h3>

              {/* Waiting for STK confirmation or showing success */}
              {stkAwaiting || stkCompleted ? (
                <div className="space-y-4">
                  {stkCompleted ? (
                    <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-lg shadow-lg">
                      <div className="flex items-center justify-center mb-3">
                        <div className="bg-green-500 rounded-full p-3 shadow-lg">
                          <CheckCircle className="w-10 h-10 text-white" />
                        </div>
                      </div>
                      <h4 className="text-xl font-bold text-green-800 text-center mb-2">
                        ✅ Payment Completed Successfully!
                      </h4>
                      <p className="text-sm text-green-700 text-center mb-3 font-medium">
                        Your wallet has been credited successfully. The balance has been updated.
                      </p>
                      <div className="bg-white rounded-lg p-4 border-2 border-green-300 shadow-sm">
                        <div className="flex items-center justify-center space-x-2 mb-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <p className="text-sm font-semibold text-gray-800">
                            Transaction Processed
                          </p>
                        </div>
                        <p className="text-xs text-gray-600 text-center">
                          Your wallet balance has been updated. You can now use your funds.
                        </p>
                      </div>
                    </div>
                  ) : (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center">
                      <RefreshCw className="w-5 h-5 mr-2 animate-spin text-blue-600" />
                      <p className="text-sm text-blue-800">
                          Waiting for STK push confirmation. Please complete the prompt on your phone.
                      </p>
                    </div>
                      <p className="text-xs text-blue-700 mt-2">
                        Do not close this window until the payment is confirmed. We'll verify automatically.
                      </p>
                  </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setShowTopUpModal(false)
                        setTopUpData({ amount: 0, phone_number: '' })
                        setSelectedPartner(null)
                        setTopUpMethod('stk_push')
                        setStkAwaiting(false)
                        setStkCompleted(false)
                        setStkWalletTransactionId(null)
                        setStkPushTransactionId(null)
                        completionToastShownRef.current = false
                        if (pollingRef.current) {
                          clearInterval(pollingRef.current)
                          pollingRef.current = null
                        }
                        // Reload data when closing
                        loadWalletData()
                        loadTransactions()
                      }}
                      className={`px-6 py-2 rounded-lg transition-colors ${
                        stkCompleted
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {stkCompleted ? 'Done' : 'OK'}
                    </button>
                  </div>
                </div>
              ) : (
              <>
              {/* Payment Method Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Choose Payment Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setTopUpMethod('stk_push')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      topUpMethod === 'stk_push'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className="w-5 h-5 mx-auto mb-2" />
                    <div className="text-sm font-medium">STK Push</div>
                    <div className="text-xs text-gray-500">Instant payment</div>
                  </button>
                  <button
                    onClick={() => setTopUpMethod('manual')}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      topUpMethod === 'manual'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 mx-auto mb-2" />
                    <div className="text-sm font-medium">Manual Payment</div>
                    <div className="text-xs text-gray-500">Paybill instructions</div>
                  </button>
                </div>
              </div>
              
              {/* Partner Selection for Super Admin */}
              {currentUser?.role === 'super_admin' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Partner <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={topUpData.partner_id || ''}
                    onChange={(e) => {
                      const partnerId = e.target.value
                      const partner = partners.find(p => p.id === partnerId)
                      setTopUpData(prev => ({ ...prev, partner_id: partnerId }))
                      setSelectedPartner(partner || null)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a partner</option>
                    {partners.filter(p => p.is_active).map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} ({partner.short_code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Partner Details Display */}
              {(currentUser?.role !== 'super_admin' && currentUser?.partner_id) && (
                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2">Partner Details</h4>
                  {(() => {
                    const userPartner = partners.find(p => p.id === currentUser.partner_id)
                    return userPartner ? (
                      <div className="text-sm text-blue-800">
                        <p><strong>Name:</strong> {userPartner.name}</p>
                        <p><strong>Short Code:</strong> {userPartner.short_code}</p>
                        <p><strong>Status:</strong> {userPartner.is_active ? '✅ Active' : '❌ Inactive'}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-red-600">Partner not found</p>
                    )
                  })()}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (KES) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={topUpData.amount}
                  onChange={(e) => setTopUpData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter amount"
                  min="1"
                  required
                />
              </div>
              {/* STK Push Form Fields */}
              {topUpMethod === 'stk_push' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={topUpData.phone_number}
                      onChange={(e) => setTopUpData(prev => ({ ...prev, phone_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="254XXXXXXXXX"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">Format: 254XXXXXXXXX (e.g., 254700000000)</p>
                  </div>

                  {/* STK Push Information Box */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> You will receive an STK Push notification on your phone to complete the payment.
                    </p>
                  </div>
                </>
              )}

              {/* Manual Payment Instructions */}
              {topUpMethod === 'manual' && (
                <>
                  {/* Manual Payment Instructions */}
                  <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manual Payment Instructions
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="text-xs text-gray-500">Paybill Number</span>
                          <div className="font-mono text-sm font-semibold">880100</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard('880100', 'Paybill Number')}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="text-xs text-gray-500">Account Number</span>
                          <div className="font-mono text-sm font-semibold">
                            774451#{(() => {
                              if (currentUser?.role === 'super_admin' && selectedPartner) {
                                return selectedPartner.short_code
                              } else if (currentUser?.partner_id) {
                                const userPartner = partners.find(p => p.id === currentUser.partner_id)
                                return userPartner?.short_code || 'PARTNER'
                              }
                              return 'PARTNER'
                            })()}
                          </div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(
                            `774451#${(() => {
                              if (currentUser?.role === 'super_admin' && selectedPartner) {
                                return selectedPartner.short_code
                              } else if (currentUser?.partner_id) {
                                const userPartner = partners.find(p => p.id === currentUser.partner_id)
                                return userPartner?.short_code || 'PARTNER'
                              }
                              return 'PARTNER'
                            })()}`,
                            'Account Number'
                          )}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="flex items-center justify-between p-2 bg-white rounded border">
                        <div>
                          <span className="text-xs text-gray-500">Amount</span>
                          <div className="font-mono text-sm font-semibold">KES {topUpData.amount || 0}</div>
                        </div>
                        <button
                          onClick={() => copyToClipboard(topUpData.amount.toString(), 'Amount')}
                          className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                      <p className="text-xs text-yellow-800">
                        <strong>Steps:</strong>
                      </p>
                      <ol className="text-xs text-yellow-700 mt-1 list-decimal list-inside space-y-1">
                        <li>Go to M-Pesa menu on your phone</li>
                        <li>Select "Lipa na M-Pesa"</li>
                        <li>Select "Paybill"</li>
                        <li>Enter Paybill Number: <span className="font-mono font-semibold">880100</span></li>
                        <li>Enter Account Number: <span className="font-mono font-semibold">774451#{(() => {
                          if (currentUser?.role === 'super_admin' && selectedPartner) {
                            return selectedPartner.short_code
                          } else if (currentUser?.partner_id) {
                            const userPartner = partners.find(p => p.id === currentUser.partner_id)
                            return userPartner?.short_code || 'PARTNER'
                          }
                          return 'PARTNER'
                        })()}</span></li>
                        <li>Enter Amount: <span className="font-mono font-semibold">KES {topUpData.amount || 0}</span></li>
                        <li>Enter your M-Pesa PIN</li>
                        <li>Confirm the transaction</li>
                      </ol>
                    </div>
                    
                    <div className="mt-3 p-2 bg-blue-50 rounded border border-blue-200">
                      <p className="text-xs text-blue-800">
                        <strong>Auto-Credit:</strong> Your wallet will be automatically credited once NCBA confirms the payment.
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (pollingRef.current) {
                      clearInterval(pollingRef.current)
                      pollingRef.current = null
                    }
                    setShowTopUpModal(false)
                    setTopUpData({ amount: 0, phone_number: '' })
                    setSelectedPartner(null)
                    setTopUpMethod('stk_push')
                    setStkAwaiting(false)
                    setStkCompleted(false)
                    setStkWalletTransactionId(null)
                    setStkPushTransactionId(null)
                    completionToastShownRef.current = false
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                
                {topUpMethod === 'stk_push' ? (
                  <button
                    onClick={handleTopUp}
                    disabled={isTopUpLoading || !topUpData.phone_number}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    {isTopUpLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Initiating STK Push...
                      </>
                    ) : (
                      <>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Initiate STK Push
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setShowTopUpModal(false)
                      setTopUpData({ amount: 0, phone_number: '' })
                      setSelectedPartner(null)
                      setTopUpMethod('stk_push')
                      addToast({
                        type: 'success',
                        title: 'Payment Instructions Ready',
                        message: 'Follow the instructions above to make your payment. Your wallet will be credited automatically.',
                        duration: 8000
                      })
                    }}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Got It!
                  </button>
                )}
              </div>
              </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Float Purchase Modal */}
      {showFloatModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-gray-900">Purchase B2C Float</h3>
              <button
                onClick={() => {
                  setShowFloatModal(false)
                  setFloatPurchaseStep('amount')
                  setFloatAmount(0)
                  setOtpCode('')
                  setSelectedB2CShortCode('')
                  setIsNewB2CShortCode(false)
                  setNewB2CShortCode('')
                  setNewB2CShortCodeName('')
                  setFloatPurchasePartnerId(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step 1: Amount and B2C Details */}
            {floatPurchaseStep === 'amount' && (
              <div className="space-y-4">
                {/* Partner Selection for Super Admin */}
                {currentUser?.role === 'super_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Partner *
                    </label>
                    <select
                      value={floatPurchasePartnerId || viewingPartnerId || ''}
                      onChange={async (e) => {
                        const selectedId = e.target.value || null
                        setFloatPurchasePartnerId(selectedId)
                        
                        // Reload wallet data for selected partner
                        if (selectedId) {
                          setViewingPartnerId(selectedId)
                          await loadWalletData()
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select a partner</option>
                      {partners.filter(p => p.is_active).map(partner => (
                        <option key={partner.id} value={partner.id}>
                          {partner.name} ({partner.short_code})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">Select the partner whose B2C shortcode you want to use</p>
                  </div>
                )}

                {/* B2C Short Code Display */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    B2C Short Code *
                  </label>
                  {(() => {
                    // Get the selected partner
                    const selectedPartnerId = currentUser?.role === 'super_admin' 
                      ? (floatPurchasePartnerId || viewingPartnerId)
                      : currentUser?.partner_id
                    
                    const selectedPartner = partners.find(p => p.id === selectedPartnerId)
                    const partnerShortcode = selectedPartner?.mpesa_shortcode || selectedPartner?.short_code || 'Not configured'
                    
                    return (
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                        {partnerShortcode}
                        {selectedPartner && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({selectedPartner.name})
                          </span>
                        )}
                      </div>
                    )
                  })()}
                  <p className="mt-1 text-xs text-gray-500">
                    This is the partner's B2C shortcode from partner settings
                  </p>
                </div>

                {/* Float Amount */}
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    Float Amount (KES) *
                </label>
                <input
                  type="number"
                    value={floatAmount || ''}
                  onChange={(e) => setFloatAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter float amount"
                  min="1"
                    step="0.01"
                />
              </div>

                {/* Current Wallet Balance Display */}
                {wallet && (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Current Wallet Balance</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">Available Balance:</span>
                      <span className={`text-lg font-bold ${wallet.current_balance < floatTotalCost ? 'text-red-600' : 'text-green-600'}`}>
                        {formatAmount(wallet.current_balance)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Charges Display */}
                {floatCharges && floatAmount > 0 && (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-900 mb-2">Charges Breakdown</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Float Amount:</span>
                        <span className="font-semibold">{formatAmount(floatAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">
                          {floatCharges.name || 'Float Purchase Fee'}:
                          {floatCharges.percentage && ` (${floatCharges.percentage}%)`}
                        </span>
                        <span className="font-semibold">{formatAmount(floatCharges.amount)}</span>
                      </div>
                      <div className="border-t border-blue-300 pt-1 mt-1 flex justify-between">
                        <span className="text-blue-900 font-semibold">Total Cost:</span>
                        <span className="text-blue-900 font-bold text-lg">{formatAmount(floatTotalCost)}</span>
                      </div>
                      {wallet && wallet.current_balance < floatTotalCost && (
                        <p className="text-xs text-red-600 mt-2 font-semibold">
                          ⚠️ Insufficient balance. Required: {formatAmount(floatTotalCost)}, Available: {formatAmount(wallet.current_balance)}
                        </p>
                      )}
                      {wallet && wallet.current_balance >= floatTotalCost && (
                        <p className="text-xs text-green-600 mt-2 font-semibold">
                          ✅ Sufficient balance. Remaining after purchase: {formatAmount(wallet.current_balance - floatTotalCost)}
                        </p>
                      )}
              </div>
                  </div>
                )}

                {/* OTP Delivery Info */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="text-sm font-semibold text-gray-900 mb-1">OTP Delivery</h5>
                  <p className="text-xs text-gray-700 mb-2">We will send OTP to your registered contacts for confirmation.</p>
                  <div className="text-sm text-gray-800 space-y-1">
                    <p><strong>Email:</strong> {maskEmail(userProfile?.email || currentUser?.email || '')}</p>
                    <p><strong>Phone:</strong> {maskPhone(userProfile?.phone_number || '')}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => {
                    setShowFloatModal(false)
                    setFloatPurchaseStep('amount')
                    setFloatAmount(0)
                    setSelectedB2CShortCode('')
                    setIsNewB2CShortCode(false)
                    setFloatPurchasePartnerId(null)
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                    onClick={handleFloatPurchaseInitiate}
                    disabled={
                      floatPurchaseLoading ||
                      !floatAmount || 
                      !wallet ||
                      wallet.current_balance < floatTotalCost ||
                      (currentUser?.role === 'super_admin' && !floatPurchasePartnerId && !viewingPartnerId) ||
                      !(() => {
                        const selectedPartnerId = currentUser?.role === 'super_admin' 
                          ? (floatPurchasePartnerId || viewingPartnerId)
                          : currentUser?.partner_id
                        const selectedPartner = partners.find(p => p.id === selectedPartnerId)
                        return selectedPartner?.mpesa_shortcode || selectedPartner?.short_code
                      })()
                    }
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {floatPurchaseLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Continue to OTP'
                    )}
                </button>
              </div>
            </div>
            )}

            {/* Step 2: OTP Verification */}
            {floatPurchaseStep === 'otp' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">OTP Verification Required</h4>
                  <p className="text-sm text-blue-800 mb-3">
                    We will send OTP to your registered contacts for confirmation.
                  </p>
                  
                  {/* OTP Delivery Information */}
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <h5 className="text-xs font-semibold text-gray-700 mb-2">OTP Delivery</h5>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Email:</span>
                        <span className="text-gray-900 font-medium">
                          {maskEmail(userProfile?.email || currentUser?.email)}
                        </span>
          </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Phone:</span>
                        <span className="text-gray-900 font-medium">
                          {maskPhone(userProfile?.phone_number || currentUser?.phone_number)}
                        </span>
        </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter OTP Code *
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-2xl font-mono tracking-widest"
                    maxLength={6}
                    autoFocus
                  />
                  <p className="mt-1 text-xs text-gray-500">6-digit code sent to your registered email and phone</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-800 space-y-1">
                    <p><strong>Float Amount:</strong> {formatAmount(floatAmount)}</p>
                    {floatCharges && (
                      <p><strong>Charges:</strong> {formatAmount(floatCharges.amount)}</p>
                    )}
                    <p><strong>Total Cost:</strong> {formatAmount(floatTotalCost)}</p>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => {
                      setFloatPurchaseStep('amount')
                      setOtpCode('')
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFloatPurchaseConfirm}
                    disabled={otpCode.length !== 6}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  >
                    Confirm Purchase
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Processing */}
            {floatPurchaseStep === 'processing' && (
              <div className="space-y-4 text-center py-8">
                <div className="flex justify-center">
                  <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Processing Float Purchase</h4>
                <p className="text-sm text-gray-600">
                  Please wait while we process your float purchase with NCBA...
                </p>
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="text-sm text-gray-800 space-y-1">
                    <p><strong>Amount:</strong> {formatAmount(floatAmount)}</p>
                    <p><strong>Status:</strong> <span className="text-blue-600">Processing...</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {floatPurchaseStep === 'success' && (
              <div className="space-y-4 text-center py-8">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                <h4 className="text-lg font-semibold text-green-900">Float Purchase Successful!</h4>
                <p className="text-sm text-gray-600">
                  Your B2C float purchase has been completed successfully.
                </p>
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-sm text-gray-800 space-y-1">
                    <p><strong>Amount:</strong> {formatAmount(floatAmount)}</p>
                    <p><strong>Total Cost:</strong> {formatAmount(floatTotalCost)}</p>
                    <p><strong>Status:</strong> <span className="text-green-600">Completed</span></p>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-4">This window will close automatically...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {showTransactionDetails && selectedTransaction && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <Info className="w-5 h-5 mr-2 text-blue-600" />
                  Transaction Details
                </h3>
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Basic Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Transaction ID:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedTransaction.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Type:</span>
                      <span className="text-sm text-gray-900 capitalize">{selectedTransaction.transaction_type.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Amount:</span>
                      <span className={`text-sm font-medium ${
                        isCreditTransaction(selectedTransaction.transaction_type) ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isCreditTransaction(selectedTransaction.transaction_type) ? '+' : '-'}{formatAmount(Math.abs(selectedTransaction.amount))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTransaction.status)}`}>
                        {selectedTransaction.status}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date:</span>
                      <span className="text-sm text-gray-900">{formatDate(selectedTransaction.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Partner Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Partner Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Partner Name:</span>
                      <span className="text-sm text-gray-900">{selectedTransaction.partner_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Short Code:</span>
                      <span className="text-sm text-gray-900">{selectedTransaction.partner_short_code || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wallet Balance After:</span>
                      <span className="text-sm text-gray-900">
                        {selectedTransaction.wallet_balance_after ? formatAmount(selectedTransaction.wallet_balance_after) : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transaction Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Transaction Details</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Reference:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedTransaction.reference || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Currency:</span>
                      <span className="text-sm text-gray-900">{selectedTransaction.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Wallet ID:</span>
                      <span className="text-sm font-mono text-gray-900">{selectedTransaction.wallet_id}</span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Description</h4>
                  <p className="text-sm text-gray-900">{selectedTransaction.description || 'No description available'}</p>
                </div>
              </div>

              {/* Metadata */}
              {selectedTransaction.metadata && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Additional Information</h4>
                  <div className="bg-white rounded border p-3">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(selectedTransaction.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between items-center">
                {/* Verify button for pending STK push transactions */}
                {selectedTransaction.status === 'pending' && 
                 selectedTransaction.transaction_type === 'top_up' &&
                 selectedTransaction.metadata?.stk_push_initiated && (
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/wallet/topup/verify-stk', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          body: JSON.stringify({
                            wallet_transaction_id: selectedTransaction.id
                          })
                        })
                        const data = await response.json()
                        if (data.success) {
                          addToast({
                            type: 'success',
                            title: 'Verification Successful',
                            message: data.message || 'Transaction verified and wallet updated',
                            duration: 5000
                          })
                          // Reload transactions and wallet data
                          loadTransactions()
                          loadWalletData()
                          setShowTransactionDetails(false)
                        } else {
                          addToast({
                            type: 'error',
                            title: 'Verification Failed',
                            message: data.error || 'Failed to verify transaction',
                            duration: 5000
                          })
                        }
                      } catch (error) {
                        addToast({
                          type: 'error',
                          title: 'Error',
                          message: 'Failed to verify transaction',
                          duration: 5000
                        })
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Verify with NCBA
                  </button>
                )}
                <button
                  onClick={() => setShowTransactionDetails(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors ml-auto"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}