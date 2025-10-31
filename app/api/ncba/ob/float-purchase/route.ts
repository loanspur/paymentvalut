import { NextRequest, NextResponse } from 'next/server'
import { loadNcbaOpenBankingSettings } from '../../../../../lib/ncba-settings'

export async function POST(request: NextRequest) {
  try {
    const { 
      amount, 
      customerRef, 
      mobileNumber,
      agentName,
      payBillTillNo,
      paymentDescription,
      paymentType,
      toAccountName,
      dealReference,
      transactionDate,
      extra 
    } = await request.json()
    if (!amount) {
      return NextResponse.json({ success: false, error: 'amount is required' }, { status: 400 })
    }

    const settingsResult = await loadNcbaOpenBankingSettings()
    if (!settingsResult.ok || !settingsResult.data) {
      return NextResponse.json({ success: false, error: settingsResult.error || 'NCBA OB settings missing' }, { status: 400 })
    }
    const s = settingsResult.data

    // Obtain token first - NCBA uses userID not username
    const tokenUrl = new URL(s.tokenPath, s.baseUrl).toString()
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': s.subscriptionKey
      },
      body: JSON.stringify({ userID: s.username, password: s.password })
    })
    const tokenText = await tokenRes.text()
    if (!tokenRes.ok) {
      return NextResponse.json({ success: false, stage: 'token', status: tokenRes.status, error: tokenText }, { status: 500 })
    }
    let tokenData: any
    try { tokenData = JSON.parse(tokenText) } catch { tokenData = { token: tokenText } }
    const accessToken = tokenData.access_token || tokenData.token || tokenData.Token || tokenData.AccessToken
    if (!accessToken) {
      return NextResponse.json({ success: false, stage: 'token', error: 'No access token in response' }, { status: 500 })
    }

    // Build float purchase payload matching NCBA Postman collection requirements
    const now = new Date()
    const txnDate = transactionDate || now.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD format
    const txnRef = `FLOAT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const payload: Record<string, string> = {
      reqAgentName: agentName || 'Payment Vault Agent',
      reqCreditAmount: String(amount),
      reqCustomerReference: customerRef || 'FLOAT_PURCHASE',
      reqDealReference: dealReference || txnRef,
      reqDebitAccountNumber: s.debitAccountNumber,
      reqDebitAcCurrency: s.debitAccountCurrency,
      reqDebitAmount: String(amount),
      reqMobileNumber: mobileNumber || '',
      reqPayBillTillNo: payBillTillNo || '',
      reqPaymentDescription: paymentDescription || 'B2C Float Purchase',
      reqPaymentType: paymentType || 'FloatPurchase',
      reqToAccountName: toAccountName || 'B2C Float Account',
      reqTransactionReferenceNo: txnRef,
      reqTxnDate: txnDate,
      senderCountry: s.country,
      ...(extra || {})
    }

    const url = new URL(s.floatPurchasePath, s.baseUrl).toString()
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': s.subscriptionKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    const text = await res.text()
    if (!res.ok) {
      return NextResponse.json({ success: false, status: res.status, error: text }, { status: 500 })
    }
    let data: any
    try { data = JSON.parse(text) } catch { data = { response: text } }
    return NextResponse.json({ success: true, data })
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 })
  }
}


