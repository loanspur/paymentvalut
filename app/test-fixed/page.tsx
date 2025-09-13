'use client'

import { useState } from 'react'

export default function TestFixedPage() {
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const testFixedImplementation = async () => {
    setTesting(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/test-fixed-mpesa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Test failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🧪 Test Fixed M-Pesa B2C Implementation
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              This test uses the exact same method that was successful in your previous transactions:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
              <li>✅ Fixed SecurityCredential generation (shortcode + initiatorPassword + timestamp)</li>
              <li>✅ Proper Vercel callback URLs</li>
              <li>✅ Correct access token handling</li>
              <li>✅ Same request structure as working tests</li>
            </ul>
          </div>

          <div className="mb-6">
            <button
              onClick={testFixedImplementation}
              disabled={testing}
              className={`px-6 py-3 rounded-lg font-medium ${
                testing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {testing ? 'Testing...' : 'Test Fixed Implementation'}
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
                  {result.success ? '✅ Test Successful!' : '⚠️ Test Completed (Check Response)'}
                </h3>
                <p className={result.success ? 'text-green-600' : 'text-yellow-600'}>
                  {result.message}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Partner Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Shortcode:</strong> {result.partner?.shortcode}</p>
                    <p><strong>Initiator Name:</strong> {result.partner?.initiator_name}</p>
                    <p><strong>Has Password:</strong> {result.partner?.has_initiator_password ? 'Yes' : 'No'}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Request Details</h4>
                  <div className="text-sm space-y-1">
                    <p><strong>Amount:</strong> {result.request_details?.amount} KES</p>
                    <p><strong>Phone:</strong> {result.request_details?.phone}</p>
                    <p><strong>Occasion:</strong> {result.request_details?.occasion}</p>
                    <p><strong>Environment:</strong> {result.environment}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">M-Pesa Response</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Status:</strong> {result.mpesa_response?.status}</p>
                  <p><strong>Response Code:</strong> {result.mpesa_response?.response_code}</p>
                  <p><strong>Description:</strong> {result.mpesa_response?.response_description}</p>
                  <p><strong>Conversation ID:</strong> {result.mpesa_response?.conversation_id}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Callback URLs</h4>
                <div className="text-sm space-y-1">
                  <p><strong>Timeout URL:</strong> {result.callback_urls?.timeout}</p>
                  <p><strong>Result URL:</strong> {result.callback_urls?.result}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-2">Full Response</h4>
                <pre className="text-xs bg-white p-3 rounded border overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
