'use client'

import { useState } from 'react'

export default function DebugTransactionPage() {
  const [checking, setChecking] = useState(false)
  const [testing, setTesting] = useState(false)
  const [callbacks, setCallbacks] = useState<any>(null)
  const [callbackTest, setCallbackTest] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkCallbacks = async () => {
    setChecking(true)
    setError(null)

    try {
      const response = await fetch('/api/check-callbacks')
      const data = await response.json()

      if (response.ok) {
        setCallbacks(data)
      } else {
        setError(data.error || 'Failed to check callbacks')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setChecking(false)
    }
  }

  const testCallbacks = async () => {
    setTesting(true)
    setError(null)

    try {
      const response = await fetch('/api/test-callbacks')
      const data = await response.json()

      if (response.ok) {
        setCallbackTest(data)
      } else {
        setError(data.error || 'Failed to test callbacks')
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
            🔍 Debug Transaction Status
          </h1>
          
          <div className="mb-6 space-y-4">
            <div className="flex space-x-4">
              <button
                onClick={checkCallbacks}
                disabled={checking}
                className={`px-6 py-3 rounded-lg font-medium ${
                  checking
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {checking ? 'Checking...' : 'Check Recent Callbacks'}
              </button>

              <button
                onClick={testCallbacks}
                disabled={testing}
                className={`px-6 py-3 rounded-lg font-medium ${
                  testing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {testing ? 'Testing...' : 'Test Callback URLs'}
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Error</h3>
              <p className="text-red-600">{error}</p>
            </div>
          )}

          {callbacks && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">📞 Recent M-Pesa Callbacks</h3>
              <p className="text-sm text-gray-600 mb-3">
                Found {callbacks.callbacks?.length || 0} callbacks
              </p>
              
              {callbacks.callbacks && callbacks.callbacks.length > 0 ? (
                <div className="space-y-2">
                  {callbacks.callbacks.map((callback: any, index: number) => (
                    <div key={index} className="bg-white p-3 rounded border text-sm">
                      <div className="font-medium">Callback #{index + 1}</div>
                      <div>Type: {callback.callback_type || 'Unknown'}</div>
                      <div>Conversation ID: {callback.conversation_id || 'N/A'}</div>
                      <div>Result Code: {callback.result_code || 'N/A'}</div>
                      <div>Result Desc: {callback.result_desc || 'N/A'}</div>
                      <div>Created: {callback.created_at || 'N/A'}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-yellow-600 bg-yellow-50 p-3 rounded">
                  ⚠️ No callbacks received yet. This might be why the transaction status hasn't updated.
                </div>
              )}
            </div>
          )}

          {callbackTest && (
            <div className="mb-6 bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">🔗 Callback URL Test Results</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {callbackTest.tests?.map((test: any, index: number) => (
                  <div key={index} className={`p-3 rounded border ${
                    test.accessible ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                    <div className="font-medium">{test.type} Callback</div>
                    <div className="text-sm">
                      <div>URL: {test.url}</div>
                      <div>Status: {test.status || 'N/A'}</div>
                      <div>Accessible: {test.accessible ? '✅ Yes' : '❌ No'}</div>
                      {test.error && <div className="text-red-600">Error: {test.error}</div>}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 text-sm">
                <strong>Summary:</strong> {callbackTest.summary?.accessible || 0} of {callbackTest.summary?.total || 0} callbacks accessible
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 Troubleshooting Tips</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• If no callbacks are received, M-Pesa might not be able to reach your callback URLs</li>
              <li>• Check that your Vercel deployment is accessible from external services</li>
              <li>• Verify that the callback URLs are correctly configured in your M-Pesa request</li>
              <li>• Production M-Pesa might have different callback requirements than sandbox</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
