'use client'

import { useState } from 'react'

export default function CheckPartnersPage() {
  const [checking, setChecking] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [partners, setPartners] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkPartners = async () => {
    setChecking(true)
    setError(null)

    try {
      const response = await fetch('/api/check-partners')
      const data = await response.json()

      if (response.ok) {
        setPartners(data)
      } else {
        setError(data.error || 'Failed to check partners')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setChecking(false)
    }
  }

  const fixPartners = async () => {
    setFixing(true)
    setError(null)

    try {
      const response = await fetch('/api/check-partners', {
        method: 'POST'
      })
      const data = await response.json()

      if (response.ok) {
        setError(null)
        // Refresh the partners list
        await checkPartners()
      } else {
        setError(data.error || 'Failed to fix partners')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setFixing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔍 Check Partners Configuration
          </h1>
          
          <div className="mb-6 space-y-4">
            <button
              onClick={checkPartners}
              disabled={checking}
              className={`px-6 py-3 rounded-lg font-medium ${
                checking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {checking ? 'Checking...' : 'Check Partners'}
            </button>

            {partners && partners.mpesa_configured === 0 && (
              <button
                onClick={fixPartners}
                disabled={fixing}
                className={`px-6 py-3 rounded-lg font-medium ${
                  fixing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {fixing ? 'Fixing...' : 'Fix Partner Configuration'}
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {partners && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">📊 Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Total Partners:</strong> {partners.total_partners}
                  </div>
                  <div>
                    <strong>M-Pesa Configured:</strong> {partners.mpesa_configured}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">👥 Partners List</h3>
                <div className="space-y-2">
                  {partners.partners.map((partner: any) => (
                    <div key={partner.id} className="flex items-center justify-between p-3 bg-white rounded border">
                      <div>
                        <div className="font-medium">{partner.name}</div>
                        <div className="text-sm text-gray-600">
                          Short Code: {partner.short_code} | 
                          M-Pesa: {partner.mpesa_shortcode} | 
                          Environment: {partner.mpesa_environment}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${
                          partner.is_mpesa_configured 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {partner.is_mpesa_configured ? 'Configured' : 'Not Configured'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          partner.is_active 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {partner.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {partners.mpesa_configured === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ No M-Pesa Configured Partners</h3>
                  <p className="text-yellow-700 mb-3">
                    No partners are marked as M-Pesa configured. This is why the test failed.
                  </p>
                  <p className="text-yellow-700">
                    Click "Fix Partner Configuration" to automatically mark partners with M-Pesa credentials as configured.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
