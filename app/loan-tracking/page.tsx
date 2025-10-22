'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

interface LoanTrackingRecord {
  id: string
  partner_id: string
  partner_name: string
  loan_id: number
  client_id: number
  client_name?: string
  loan_amount: number
  phone_number?: string
  status: string
  disbursement_id?: string
  disbursement_status?: string
  mpesa_receipt_number?: string
  created_at: string
  updated_at: string
}

export default function LoanTrackingPage() {
  const [loans, setLoans] = useState<LoanTrackingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'disbursed' | 'failed'>('all')

  useEffect(() => {
    fetchLoanTrackingData()
  }, [])

  const fetchLoanTrackingData = async () => {
    try {
      setLoading(true)
      
      // Query to get loan tracking data with partner information
      const { data, error } = await supabase
        .from('loan_tracking')
        .select(`
          *,
          partners!inner(name)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching loan tracking data:', error)
        return
      }

      // Transform the data to include partner name
      const transformedData = data?.map(record => ({
        ...record,
        partner_name: record.partners?.name || 'Unknown Partner'
      })) || []

      setLoans(transformedData)
    } catch (error) {
      console.error('Error fetching loan tracking data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredLoans = loans.filter(loan => {
    switch (filter) {
      case 'pending':
        return loan.status === 'pending' || loan.status === 'approved'
      case 'disbursed':
        return loan.status === 'disbursed' && loan.disbursement_status === 'completed'
      case 'failed':
        return loan.status === 'failed' || loan.disbursement_status === 'failed'
      default:
        return true
    }
  })

  const getStatusBadge = (status: string, disbursementStatus?: string) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium"
    
    if (status === 'disbursed' && disbursementStatus === 'completed') {
      return `${baseClasses} bg-green-100 text-green-800`
    } else if (status === 'failed' || disbursementStatus === 'failed') {
      return `${baseClasses} bg-red-100 text-red-800`
    } else if (status === 'pending' || status === 'approved') {
      return `${baseClasses} bg-yellow-100 text-yellow-800`
    } else {
      return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusText = (status: string, disbursementStatus?: string) => {
    if (status === 'disbursed' && disbursementStatus === 'completed') {
      return 'Disbursed'
    } else if (status === 'failed' || disbursementStatus === 'failed') {
      return 'Failed'
    } else if (status === 'pending' || status === 'approved') {
      return 'Pending Disbursement'
    } else {
      return status
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Loan Tracking Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Monitor approved loans and their disbursement progress
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { key: 'all', label: 'All Loans', count: loans.length },
                { key: 'pending', label: 'Pending', count: loans.filter(l => l.status === 'pending' || l.status === 'approved').length },
                { key: 'disbursed', label: 'Disbursed', count: loans.filter(l => l.status === 'disbursed' && l.disbursement_status === 'completed').length },
                { key: 'failed', label: 'Failed', count: loans.filter(l => l.status === 'failed' || l.disbursement_status === 'failed').length }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    filter === tab.key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Loans Table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {filteredLoans.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No loans found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {filter === 'all' 
                    ? 'No loan approvals have been received yet.'
                    : `No loans with status "${filter}" found.`
                  }
                </p>
              </div>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {filteredLoans.map((loan) => (
                <li key={loan.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Loan #{loan.loan_id} - {loan.partner_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            Client ID: {loan.client_id} • Amount: KSh {loan.loan_amount?.toLocaleString()}
                          </p>
                          {loan.phone_number && (
                            <p className="text-sm text-gray-500">
                              Phone: {loan.phone_number}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <span className={getStatusBadge(loan.status, loan.disbursement_status)}>
                          {getStatusText(loan.status, loan.disbursement_status)}
                        </span>
                        {loan.mpesa_receipt_number && (
                          <p className="text-xs text-gray-500 mt-1">
                            Receipt: {loan.mpesa_receipt_number}
                          </p>
                        )}
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <p>{new Date(loan.created_at).toLocaleDateString()}</p>
                        <p>{new Date(loan.created_at).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={fetchLoanTrackingData}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Refresh Data
          </button>
        </div>
      </div>
    </div>
  )
}
