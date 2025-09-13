'use client'

import { useState } from 'react'

export default function RegisterCallbacksPage() {
  const [registering, setRegistering] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const registerCallbacks = async () => {
    setRegistering(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/register-callbacks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setRegistering(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔧 Register B2C Callbacks with Safaricom
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This will register your callback URLs with Safaricom so M-Pesa can send transaction updates.
            </p>
            
            <button
              onClick={registerCallbacks}
              disabled={registering}
              className={`px-6 py-3 rounded-lg font-medium ${
                registering
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {registering ? 'Registering...' : 'Register Callbacks with Safaricom'}
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
                result.success 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-2 ${
                  result.success ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {result.success ? '✅ Callbacks Registered Successfully!' : '⚠️ Registration Completed (Check Response)'}
                </h3>
                <p className={result.success ? 'text-green-600' : 'text-yellow-600'}>
                  {result.message}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Registration Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Environment:</strong> {result.environment}</p>
                    <p><strong>Shortcode:</strong> {result.shortcode}</p>
                    <p><strong>Success:</strong> {result.success ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Callback URLs</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Validation:</strong> {result.validation_url}</p>
                    <p><strong>Confirmation:</strong> {result.confirmation_url}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Safaricom Response</h4>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto">
                  {JSON.stringify(result.registration_response, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 Next Steps</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• After successful registration, M-Pesa will send callbacks for new transactions</li>
              <li>• Your 12 KES transaction status should update automatically</li>
              <li>• Future transactions will have proper status updates and receipts</li>
              <li>• Test with another transaction to verify callbacks are working</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
