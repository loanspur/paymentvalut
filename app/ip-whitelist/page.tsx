'use client'

import { useState, useEffect } from 'react'

interface Partner {
  id: string
  name: string
  allowed_ips: string[]
  ip_whitelist_enabled: boolean
  is_active: boolean
}

export default function IPWhitelistPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null)
  const [newIP, setNewIP] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPartners()
  }, [])

  const fetchPartners = async () => {
    try {
      const response = await fetch('/api/partners')
      const data = await response.json()
      setPartners(data.partners || [])
    } catch (error) {
      console.error('Error fetching partners:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateIPWhitelist = async (partnerId: string, allowedIPs: string[], enabled: boolean) => {
    setSaving(true)
    try {
      const response = await fetch('/api/partners/ip-whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          partner_id: partnerId,
          allowed_ips: allowedIPs,
          ip_whitelist_enabled: enabled
        })
      })

      if (response.ok) {
        await fetchPartners()
        setEditingPartner(null)
        setNewIP('')
      } else {
        const error = await response.json()
        alert(`Error: ${error.message}`)
      }
    } catch (error) {
      console.error('Error updating IP whitelist:', error)
      alert('Error updating IP whitelist')
    } finally {
      setSaving(false)
    }
  }

  const addIP = () => {
    if (newIP.trim() && editingPartner) {
      const currentIPs = editingPartner.allowed_ips || []
      const updatedIPs = [...currentIPs, newIP.trim()]
      setEditingPartner({ ...editingPartner, allowed_ips: updatedIPs })
      setNewIP('')
    }
  }

  const removeIP = (ipToRemove: string) => {
    if (editingPartner) {
      const currentIPs = editingPartner.allowed_ips || []
      const updatedIPs = currentIPs.filter(ip => ip !== ipToRemove)
      setEditingPartner({ ...editingPartner, allowed_ips: updatedIPs })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center">Loading partners...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            🔒 IP Whitelist Management
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 mb-4">
              Configure IP whitelisting for each partner to ensure only authorized USSD systems can make requests.
            </p>
          </div>

          <div className="space-y-6">
            {partners.map((partner) => (
              <div key={partner.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{partner.name}</h3>
                    <p className="text-sm text-gray-600">
                      Status: {partner.is_active ? 'Active' : 'Inactive'} | 
                      IP Whitelist: {partner.ip_whitelist_enabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <button
                    onClick={() => setEditingPartner(partner)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {editingPartner?.id === partner.id ? 'Cancel' : 'Edit IPs'}
                  </button>
                </div>

                {editingPartner?.id === partner.id ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Allowed IP Addresses
                      </label>
                      <div className="space-y-2">
                        {(editingPartner.allowed_ips || []).map((ip, index) => (
                          <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                            <span className="font-mono text-sm">{ip}</span>
                            <button
                              onClick={() => removeIP(ip)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={newIP}
                            onChange={(e) => setNewIP(e.target.value)}
                            placeholder="Enter IP address (e.g., 192.168.1.100)"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            onKeyPress={(e) => e.key === 'Enter' && addIP()}
                          />
                          <button
                            onClick={addIP}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                          >
                            Add IP
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingPartner.ip_whitelist_enabled}
                          onChange={(e) => setEditingPartner({
                            ...editingPartner,
                            ip_whitelist_enabled: e.target.checked
                          })}
                          className="mr-2"
                        />
                        Enable IP Whitelisting
                      </label>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => updateIPWhitelist(
                          editingPartner.id,
                          editingPartner.allowed_ips || [],
                          editingPartner.ip_whitelist_enabled
                        )}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={() => setEditingPartner(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Allowed IPs:</div>
                    {partner.allowed_ips && partner.allowed_ips.length > 0 ? (
                      <div className="space-y-1">
                        {partner.allowed_ips.map((ip, index) => (
                          <div key={index} className="font-mono text-sm bg-gray-100 p-2 rounded">
                            {ip}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-gray-500 italic">No IPs configured</div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 IP Whitelisting Guide</h3>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <strong>Enable IP whitelisting</strong> for each partner that needs it</li>
              <li>• <strong>Add USSD server IPs</strong> to the allowed list</li>
              <li>• <strong>Test from whitelisted IPs</strong> to ensure requests work</li>
              <li>• <strong>Monitor logs</strong> for IP whitelist violations</li>
              <li>• <strong>Support both IPv4 and IPv6</strong> addresses</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
