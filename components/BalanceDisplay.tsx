'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, TrendingUp, TrendingDown, Wallet, CreditCard } from 'lucide-react'
import { formatDate } from '../lib/utils'

interface BalanceData {
  id: string
  partner_id: string
  mpesa_shortcode: string
  status: string
  result_code: string
  result_desc: string
  balance_before: number | null
  balance_after: number | null
  utility_account_balance: number | null
  created_at: string
  updated_at: string
  partners: {
    id: string
    name: string
    mpesa_shortcode: string
  }
}

interface BalanceResponse {
  success: boolean
  balance: BalanceData | null
  history: any[]
  lastUpdated: string | null
}

export default function BalanceDisplay({ partnerId }: { partnerId: string }) {
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)

  const fetchBalance = async () => {
    try {
      const response = await fetch(`/api/balance/latest?partner_id=${partnerId}`)
      const data: BalanceResponse = await response.json()
      
      if (data.success) {
        setBalanceData(data.balance)
        setLastUpdated(data.lastUpdated)
      }
    } catch (error) {
      console.error('Error fetching balance:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshBalance = async () => {
    setRefreshing(true)
    await fetchBalance()
  }

  useEffect(() => {
    fetchBalance()
  }, [partnerId])

  const formatCurrency = (amount: number | null) => {
    if (amount === null) return 'N/A'
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount)
  }


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case 'queued':
        return <Badge className="bg-yellow-100 text-yellow-800">Queued</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading balance...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!balanceData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Balance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">No balance data available</p>
            <Button onClick={refreshBalance} disabled={refreshing}>
              {refreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Balance
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Account Balance
          </CardTitle>
          <Button 
            onClick={refreshBalance} 
            disabled={refreshing}
            size="sm"
            variant="outline"
          >
            {refreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(balanceData.status)}
          <span className="text-sm text-gray-500">
            {balanceData.partners.name} ({balanceData.mpesa_shortcode})
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Account Balance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-600">Working Account</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(balanceData.balance_after)}
            </div>
            {balanceData.balance_before && (
              <div className="flex items-center gap-1 text-sm text-gray-500">
                {balanceData.balance_after && balanceData.balance_before && (
                  <>
                    {balanceData.balance_after > balanceData.balance_before ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span>
                      {balanceData.balance_after > balanceData.balance_before ? '+' : ''}
                      {formatCurrency(balanceData.balance_after - balanceData.balance_before)}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Utility Account Balance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-600">Utility Account</span>
            </div>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(balanceData.utility_account_balance)}
            </div>
          </div>
        </div>

        {/* Total Balance */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Total Available</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatCurrency(
                (balanceData.balance_after || 0) + (balanceData.utility_account_balance || 0)
              )}
            </span>
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-4 text-sm text-gray-500">
            Last updated: {formatDate(lastUpdated)}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
