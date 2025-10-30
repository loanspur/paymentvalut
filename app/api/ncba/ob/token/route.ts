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

    const body = JSON.stringify({ username: s.username, password: s.password })

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': s.subscriptionKey
      },
      body
    })

    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json({ success: false, status: res.status, error: text }, { status: 500 })
    }

    let data: any
    try { data = JSON.parse(text) } catch { data = { token: text } }

    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}


