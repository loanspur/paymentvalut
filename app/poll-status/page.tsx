'use client'

import { useState } from 'react'

export default function PollStatusPage() {
  const [polling, setPolling] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const pollTransactionStatus = async () => {
    setPolling(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/poll-transaction-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Polling failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setPolling(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔄 Poll Transaction Status (Temporary Solution)
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Since M-Pesa callbacks are not working, this will poll and update transaction statuses.
              <strong> This is a temporary solution until Safaricom enables callbacks.</strong>
            </p>
            
            <button
              onClick={pollTransactionStatus}
              disabled={polling}
              className={`px-6 py-3 rounded-lg font-medium ${
                polling
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
              }`}
            >
              {polling ? 'Polling...' : 'Poll Transaction Status'}
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {result && (
            <div className="space-y-6">
              <div className={`p-4 rounded-lg border ${
                result.processed_transactions > 0
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-2 ${
                  result.processed_transactions > 0 ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {result.processed_transactions > 0 
                    ? `✅ Updated ${result.processed_transactions} Transactions!` 
                    : '⚠️ No Transactions Updated'
                  }
                </h3>
                <p className={result.processed_transactions > 0 ? 'text-green-600' : 'text-yellow-600'}>
                  {result.message}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Polling Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Environment:</strong> {result.environment}</p>
                    <p><strong>Partner:</strong> {result.partner}</p>
                    <p><strong>Processed:</strong> {result.processed_transactions}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Results</h4>
                  <div className="text-sm space-y-1">
                    {result.results && result.results.length > 0 ? (
                      result.results.map((tx: any, index: number) => (
                        <div key={index} className="border-b pb-2">
                          <p><strong>Amount:</strong> {tx.amount} KES</p>
                          <p><strong>Status:</strong> {tx.status}</p>
                          <p><strong>Method:</strong> {tx.method}</p>
                        </div>
                      ))
                    ) : (
                      <p>No transactions updated</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-red-800 mb-2">🚨 Important</h3>
                <ul className="text-sm text-red-700 space-y-1">
                  <li>• This is a temporary solution for testing</li>
                  <li>• Contact Safaricom to enable proper B2C callbacks</li>
                  <li>• Your shortcode needs callback URL whitelisting</li>
                  <li>• Real-time callbacks are required for production USSD</li>
                </ul>
              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">📞 Next Steps</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Contact Safaricom support: support@safaricom.co.ke</li>
              <li>• Request B2C callback enablement for shortcode 3037935</li>
              <li>• Provide callback URLs for whitelisting</li>
              <li>• Test with small amounts after callback enablement</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
