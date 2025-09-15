'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Clock, 
  XCircle,
  DollarSign,
  Activity
} from 'lucide-react'

interface Transaction {
  id: string
  origin: string
  tenant_id: string
  customer_id: string
  client_request_id: string
  msisdn: string
  amount: number
  status: string
  conversation_id: string
  transaction_receipt: string | null
  result_code: string
  result_desc: string
  partner_id: string
  created_at: string
  updated_at: string
  partners: {
    id: string
    name: string
    mpesa_shortcode: string
  }
}

interface TransactionStats {
  total: number
  successful: number
  pending: number
  failed: number
  totalAmount: number
  successfulAmount: number
  successRate: string
}

interface TransactionResponse {
  success: boolean
  transactions: Transaction[]
  statistics: TransactionStats
}

export default function TransactionStatus({ partnerId }: { partnerId: string }) {
  const [transactionData, setTransactionData] = useState<Transaction[]>([])
  const [stats, setStats] = useState<TransactionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`/api/transactions/status?partner_id=${partnerId}&limit=20`)
      const data: TransactionResponse = await response.json()
      
      if (data.success) {
        setTransactionData(data.transactions)
        setStats(data.statistics)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshTransactions = async () => {
    setRefreshing(true)
    await fetchTransactions()
  }

  useEffect(() => {
    fetchTransactions()
  }, [partnerId])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-KE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">Success</Badge>
      case 'queued':
        return <Badge className="bg-yellow-100 text-yellow-800">Queued</Badge>
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800">Pending</Badge>
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'queued':
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Transaction Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading transactions...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Transactions</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Activity className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Success Rate</p>
                  <p className="text-2xl font-bold text-green-600">{stats.successRate}%</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Successful Amount</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.successfulAmount)}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Transactions
            </CardTitle>
            <Button 
              onClick={refreshTransactions} 
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
        </CardHeader>
        <CardContent>
          {transactionData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No transactions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactionData.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(transaction.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{formatCurrency(transaction.amount)}</span>
                        {getStatusBadge(transaction.status)}
                      </div>
                      <div className="text-sm text-gray-500">
                        To: {transaction.msisdn} • {formatDate(transaction.created_at)}
                      </div>
                      {transaction.transaction_receipt && (
                        <div className="text-sm text-gray-500">
                          Receipt: {transaction.transaction_receipt}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {transaction.conversation_id}
                    </div>
                    {transaction.result_desc && (
                      <div className="text-sm text-gray-500">
                        {transaction.result_desc}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
