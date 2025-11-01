import { NextRequest, NextResponse } from 'next/server'
import { loadNcbaOpenBankingSettings } from '../../../../../lib/ncba-settings'

export async function POST(request: NextRequest) {
  try {
    const settingsResult = await loadNcbaOpenBankingSettings()
    if (!settingsResult.ok || !settingsResult.data) {
      return NextResponse.json({ success: false, error: settingsResult.error || 'NCBA OB settings missing' }, { status: 400 })
    }
    const s = settingsResult.data

    const url = new URL(s.tokenPath, s.baseUrl).toString()

    // NCBA Open Banking uses 'userID' not 'username'
    const body = JSON.stringify({ userID: s.username, password: s.password })

    // Make request to NCBA
    // Note: NCBA will see your server's public IP, not localhost
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': s.subscriptionKey
      },
      body
    })
    
    // Try to get the actual IP that NCBA sees by making a test request
    // This helps with debugging
    let actualPublicIP: string | null = null
    try {
      const ipCheck = await fetch('https://api.ipify.org?format=json', {
        signal: AbortSignal.timeout(2000)
      })
      if (ipCheck.ok) {
        const ipData = await ipCheck.json()
        actualPublicIP = ipData.ip
      }
    } catch {
      // Ignore IP check errors
    }

    const text = await res.text()
    if (!res.ok) {
      // Provide helpful error messages
      let errorMessage = text
      if (res.status === 403) {
        const detectedIP = actualPublicIP || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
        errorMessage = `NCBA Security Notice: Your request has been blocked. This usually means:\n1. Your server IP address (${detectedIP}) has not been whitelisted by NCBA\n2. Please contact NCBA to whitelist your current IP address\n3. Your current public IP appears to be: ${actualPublicIP || 'Unable to detect'}\n4. Previously whitelisted IP: 154.159.237.174 (may have changed)\n\nOriginal error: ${text}`
      } else if (res.status === 401) {
        errorMessage = `NCBA Authentication Failed: Please verify your username and password are correct.\n\nOriginal error: ${text}`
      }
      return NextResponse.json({ 
        success: false, 
        status: res.status, 
        error: errorMessage,
        troubleshooting: res.status === 403 ? {
          issue: 'IP not whitelisted',
          action: 'Contact NCBA to whitelist your current server IP address',
          current_public_ip: actualPublicIP || 'Unable to detect',
          previously_whitelisted_ip: '154.159.237.174',
          note: actualPublicIP !== '154.159.237.174' ? 'Your IP has changed! You need to whitelist the new IP.' : 'IP may not have changed, but check with NCBA which IP they see.'
        } : undefined
      }, { status: res.status >= 500 ? 500 : res.status })
    }

    let data: any
    try { data = JSON.parse(text) } catch { data = { token: text } }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}


