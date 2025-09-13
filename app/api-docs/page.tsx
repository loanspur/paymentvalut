'use client'

import { useState } from 'react'

export default function APIDocsPage() {
  const [activeSection, setActiveSection] = useState('overview')

  const sections = [
    { id: 'overview', name: 'Overview', icon: '📋' },
    { id: 'authentication', name: 'Authentication', icon: '🔐' },
    { id: 'disbursement', name: 'Send Money', icon: '💰' },
    { id: 'status', name: 'Check Status', icon: '📊' },
    { id: 'partners', name: 'Partner Management', icon: '🏢' },
    { id: 'security', name: 'Security & IPs', icon: '🔒' },
    { id: 'examples', name: 'Code Examples', icon: '💻' }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h1 className="text-3xl font-bold text-gray-900">📚 USSD API Documentation</h1>
            <p className="text-gray-600 mt-2">
              Complete guide for integrating with the M-Pesa B2C Vault system
            </p>
          </div>

          <div className="flex">
            {/* Sidebar */}
            <div className="w-64 bg-gray-50 border-r border-gray-200">
              <nav className="p-4 space-y-2">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === section.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {section.icon} {section.name}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              {activeSection === 'overview' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">System Overview</h2>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">🎯 What This System Provides</h3>
                    <ul className="text-blue-700 space-y-1">
                      <li>• <strong>M-Pesa B2C Disbursement</strong> - Send money to customers</li>
                      <li>• <strong>Real-time Status Updates</strong> - Track transaction progress</li>
                      <li>• <strong>Partner Management</strong> - Multi-tenant support</li>
                      <li>• <strong>IP Whitelisting</strong> - Secure API access</li>
                      <li>• <strong>Transaction History</strong> - Complete audit trail</li>
                    </ul>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">Base URL</h3>
                      <code className="text-sm bg-white p-2 rounded border block">
                        https://paymentvalut-ju.vercel.app
                      </code>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <h3 className="font-semibold text-gray-800 mb-2">Authentication</h3>
                      <code className="text-sm bg-white p-2 rounded border block">
                        x-api-key: partner_api_key
                      </code>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-yellow-800 mb-2">⚠️ Important Notes</h3>
                    <ul className="text-yellow-700 space-y-1">
                      <li>• <strong>Minimum Amount:</strong> 10 KES (Safaricom requirement)</li>
                      <li>• <strong>IP Whitelisting:</strong> Required for production security</li>
                      <li>• <strong>Callbacks:</strong> Currently using polling system (temporary)</li>
                      <li>• <strong>Environment:</strong> Production-ready with live M-Pesa integration</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeSection === 'authentication' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">🔐 Authentication</h2>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">API Key Authentication</h3>
                    <p className="text-gray-600 mb-3">All API requests require a valid API key in the header.</p>
                    <code className="text-sm bg-white p-3 rounded border block">
                      x-api-key: your_partner_api_key
                    </code>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Available Partners & API Keys</h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">API Key</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Kulman Group Limited</td>
                            <td className="px-4 py-3 text-sm text-gray-600">kulman</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">kulmna_sk_live_1234567890abcdef</td>
                            <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span></td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Finsef Limited</td>
                            <td className="px-4 py-3 text-sm text-gray-600">finsafe</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">finsef_sk_live_1234567890abcdef</td>
                            <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span></td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">ABC Limited</td>
                            <td className="px-4 py-3 text-sm text-gray-600">abc</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">abc_sk_live_1234567890abcdef</td>
                            <td className="px-4 py-3"><span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">Active</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">🚨 Security Requirements</h3>
                    <ul className="text-red-700 space-y-1">
                      <li>• <strong>IP Whitelisting:</strong> Your USSD server IPs must be whitelisted</li>
                      <li>• <strong>HTTPS Only:</strong> All API calls must use HTTPS</li>
                      <li>• <strong>API Key Protection:</strong> Never expose API keys in client-side code</li>
                      <li>• <strong>Rate Limiting:</strong> Respect API rate limits</li>
                    </ul>
                  </div>
                </div>
              )}

              {activeSection === 'disbursement' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">💰 Send Money (Disbursement)</h2>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Endpoint</h3>
                    <code className="text-sm bg-white p-2 rounded border block">
                      POST https://paymentvalut-ju.vercel.app/api/disburse
                    </code>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Request Headers</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">{`{
  "x-api-key": "kulmna_sk_live_1234567890abcdef",
  "Content-Type": "application/json"
}`}</pre>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Request Body</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">{`{
  "amount": 100,
  "msisdn": "254727638940",
  "tenant_id": "kulman",
  "customer_id": "customer_456",
  "client_request_id": "req_789",
  "occasion": "Payment for services"
}`}</pre>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Response (Success)</h3>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <pre className="text-sm">{`{
  "status": "accepted",
  "conversation_id": "AG_20250913_1234567890",
  "originator_conversation_id": "abc-123-def-456",
  "response_code": "0",
  "response_description": "Accept the service request successfully."
}`}</pre>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Response (Error)</h3>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <pre className="text-sm">{`{
  "status": "rejected",
  "error_code": "AUTH_1002",
  "error_message": "Invalid API key"
}`}</pre>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Field Descriptions</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Field</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">amount</td>
                            <td className="px-4 py-3 text-sm text-gray-600">number</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Yes</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Amount in KES (minimum 10)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">msisdn</td>
                            <td className="px-4 py-3 text-sm text-gray-600">string</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Yes</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Phone number (254XXXXXXXXX)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">tenant_id</td>
                            <td className="px-4 py-3 text-sm text-gray-600">string</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Yes</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Partner identifier (kulman, finsafe, abc)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">customer_id</td>
                            <td className="px-4 py-3 text-sm text-gray-600">string</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Yes</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Your internal customer ID</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">client_request_id</td>
                            <td className="px-4 py-3 text-sm text-gray-600">string</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Yes</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Unique request identifier</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">occasion</td>
                            <td className="px-4 py-3 text-sm text-gray-600">string</td>
                            <td className="px-4 py-3 text-sm text-gray-600">No</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Transaction description</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'status' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">📊 Check Transaction Status</h2>
                  
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">Endpoint</h3>
                    <code className="text-sm bg-white p-2 rounded border block">
                      GET https://paymentvalut-ju.vercel.app/api/ussd/transaction-status
                    </code>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Query Parameters</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ul className="space-y-2 text-sm">
                        <li><code className="bg-white px-2 py-1 rounded">conversation_id</code> - M-Pesa conversation ID</li>
                        <li><code className="bg-white px-2 py-1 rounded">client_request_id</code> - Your internal request ID</li>
                        <li><code className="bg-white px-2 py-1 rounded">phone</code> - Customer phone number</li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Example Request</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="text-sm">{`curl -H "x-api-key: kulmna_sk_live_1234567890abcdef" \\
  "https://paymentvalut-ju.vercel.app/api/ussd/transaction-status?conversation_id=AG_20250913_1234567890"`}</pre>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Response</h3>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <pre className="text-sm">{`{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "count": 1,
  "transactions": [
    {
      "transaction_id": "bb8ab64c-e1aa-4f4f-aae3-54d9c84b0c26",
      "conversation_id": "AG_20250913_1234567890",
      "client_request_id": "req_789",
      "amount": 100,
      "phone": "254727638940",
      "status": "success",
      "result_code": "0",
      "result_description": "Transaction completed successfully",
      "transaction_receipt": "MPESA123456789",
      "receipt_number": "MPESA123456789",
      "created_at": "2025-09-13T09:02:29.048217+00:00",
      "updated_at": "2025-09-13T09:02:31.325128+00:00",
      "partner_id": "partner_123"
    }
  ],
  "timestamp": "2025-09-13T09:15:06.238Z"
}`}</pre>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Status Values</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-50 p-3 rounded-lg">
                        <span className="font-semibold text-yellow-800">accepted</span>
                        <p className="text-sm text-yellow-700">Transaction accepted by M-Pesa, processing</p>
                      </div>
                      <div className="bg-green-50 p-3 rounded-lg">
                        <span className="font-semibold text-green-800">success</span>
                        <p className="text-sm text-green-700">Transaction completed successfully</p>
                      </div>
                      <div className="bg-red-50 p-3 rounded-lg">
                        <span className="font-semibold text-red-800">failed</span>
                        <p className="text-sm text-red-700">Transaction failed</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <span className="font-semibold text-blue-800">pending</span>
                        <p className="text-sm text-blue-700">Transaction pending</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'partners' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">🏢 Partner Management</h2>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-800 mb-2">Partner Configuration</h3>
                    <p className="text-blue-700 mb-3">
                      Each partner has their own configuration including M-Pesa credentials, IP whitelisting, and tenant ID.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Partner Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">Basic Information</h4>
                        <ul className="text-sm space-y-1">
                          <li>• <strong>Name:</strong> Partner organization name</li>
                          <li>• <strong>Short Code:</strong> Internal short code</li>
                          <li>• <strong>M-Pesa Shortcode:</strong> Safaricom shortcode</li>
                          <li>• <strong>Environment:</strong> sandbox/production</li>
                        </ul>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-gray-800 mb-2">M-Pesa Credentials</h4>
                        <ul className="text-sm space-y-1">
                          <li>• <strong>Consumer Key:</strong> M-Pesa API consumer key</li>
                          <li>• <strong>Consumer Secret:</strong> M-Pesa API consumer secret</li>
                          <li>• <strong>Initiator Name:</strong> B2C initiator name</li>
                          <li>• <strong>Initiator Password:</strong> B2C initiator password</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Tenant ID Mapping</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Partner</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant ID</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usage</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Kulman Group Limited</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">kulman</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Use in disbursement requests</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">Finsef Limited</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">finsafe</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Use in disbursement requests</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">ABC Limited</td>
                            <td className="px-4 py-3 text-sm font-mono text-gray-600">abc</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Use in disbursement requests</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'security' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">🔒 Security & IP Whitelisting</h2>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-red-800 mb-2">🚨 Critical Security Requirements</h3>
                    <ul className="text-red-700 space-y-1">
                      <li>• <strong>IP Whitelisting:</strong> Your USSD server IPs must be whitelisted</li>
                      <li>• <strong>API Key Protection:</strong> Never expose API keys in client-side code</li>
                      <li>• <strong>HTTPS Only:</strong> All API calls must use HTTPS</li>
                      <li>• <strong>Rate Limiting:</strong> Respect API rate limits</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">IP Whitelisting Setup</h3>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <ol className="list-decimal list-inside space-y-2 text-sm">
                        <li>Contact system administrator to get your USSD server IP addresses</li>
                        <li>Visit the Partners management page: <code className="bg-white px-2 py-1 rounded">/partners</code></li>
                        <li>Edit your partner configuration</li>
                        <li>Enable "IP Whitelisting" checkbox</li>
                        <li>Add your USSD server IP addresses</li>
                        <li>Save the configuration</li>
                      </ol>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800">Error Codes</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Error Code</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Solution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">AUTH_1001</td>
                            <td className="px-4 py-3 text-sm text-gray-600">API key required</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Include x-api-key header</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">AUTH_1002</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Invalid API key</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Check API key is correct</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">AUTH_1003</td>
                            <td className="px-4 py-3 text-sm text-gray-600">IP address not whitelisted</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Contact admin to whitelist your IP</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">B2C_1001</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Missing required fields</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Check request body</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 text-sm font-mono text-gray-900">B2C_1002</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Invalid amount (minimum 10 KES)</td>
                            <td className="px-4 py-3 text-sm text-gray-600">Use amount &gt;= 10</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeSection === 'examples' && (
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold text-gray-900">💻 Code Examples</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">JavaScript/Node.js</h3>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">{`// Partner configurations
const PARTNERS = {
  kulman: {
    apiKey: "kulmna_sk_live_1234567890abcdef",
    tenantId: "kulman",
    baseUrl: "https://paymentvalut-ju.vercel.app"
  },
  finsafe: {
    apiKey: "finsef_sk_live_1234567890abcdef",
    tenantId: "finsafe",
    baseUrl: "https://paymentvalut-ju.vercel.app"
  }
};

// Send money function
async function sendMoney(partner, amount, phone, clientRequestId) {
  const config = PARTNERS[partner];
  
  const response = await fetch(\`\${config.baseUrl}/api/disburse\`, {
    method: 'POST',
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      amount: amount,
      msisdn: phone,
      tenant_id: config.tenantId,
      customer_id: "customer_456",
      client_request_id: clientRequestId,
      occasion: \`\${partner} USSD Payment\`
    })
  });
  
  return await response.json();
}

// Check transaction status
async function checkTransactionStatus(conversationId, partner) {
  const config = PARTNERS[partner];
  
  const response = await fetch(
    \`\${config.baseUrl}/api/ussd/transaction-status?conversation_id=\${conversationId}\`,
    {
      headers: {
        'x-api-key': config.apiKey
      }
    }
  );
  
  return await response.json();
}

// Usage examples
// sendMoney('kulman', 100, '254727638940', 'req_123')
// checkTransactionStatus('AG_20250913_1234567890', 'kulman')`}</pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">cURL Examples</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">Send Money</h4>
                          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                            <pre className="text-sm">{`curl -X POST https://paymentvalut-ju.vercel.app/api/disburse \\
  -H "x-api-key: kulmna_sk_live_1234567890abcdef" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "msisdn": "254727638940",
    "tenant_id": "kulman",
    "customer_id": "customer_456",
    "client_request_id": "req_789",
    "occasion": "Kulman USSD Payment"
  }'`}</pre>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-700 mb-2">Check Status</h4>
                          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                            <pre className="text-sm">{`curl -H "x-api-key: kulmna_sk_live_1234567890abcdef" \\
  "https://paymentvalut-ju.vercel.app/api/ussd/transaction-status?conversation_id=AG_20250913_1234567890"`}</pre>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-3">PHP Example</h3>
                      <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-sm">{`<?php
// Send money function
function sendMoney($partner, $amount, $phone, $clientRequestId) {
    $config = [
        'kulman' => [
            'apiKey' => 'kulmna_sk_live_1234567890abcdef',
            'tenantId' => 'kulman'
        ],
        'finsafe' => [
            'apiKey' => 'finsef_sk_live_1234567890abcdef',
            'tenantId' => 'finsafe'
        ]
    ];
    
    $partnerConfig = $config[$partner];
    
    $data = [
        'amount' => $amount,
        'msisdn' => $phone,
        'tenant_id' => $partnerConfig['tenantId'],
        'customer_id' => 'customer_456',
        'client_request_id' => $clientRequestId,
        'occasion' => $partner . ' USSD Payment'
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, 'https://paymentvalut-ju.vercel.app/api/disburse');
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'x-api-key: ' . $partnerConfig['apiKey'],
        'Content-Type: application/json'
    ]);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    return json_decode($response, true);
}

// Usage
$result = sendMoney('kulman', 100, '254727638940', 'req_123');
echo json_encode($result);
?>`}</pre>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
