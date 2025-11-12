import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyJWTToken } from '../../../../../../lib/jwt-utils'
import { UnifiedWalletService } from '../../../../../../lib/unified-wallet-service'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const token = request.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const payload = await verifyJWTToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }

    const { otp_reference, otp_code, wallet_transaction_id } = await request.json()

    if (!otp_reference || !otp_code) {
      return NextResponse.json(
        { success: false, error: 'OTP reference and code are required' },
        { status: 400 }
      )
    }

    // Get OTP validation record
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_validations')
      .select('*')
      .eq('reference', otp_reference)
      .single()

    if (otpError || !otpRecord) {
      return NextResponse.json(
        { success: false, error: 'Invalid OTP reference' },
        { status: 400 }
      )
    }

    // Validate OTP
    if (otpRecord.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'OTP already used or expired' },
        { status: 400 }
      )
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      await supabase
        .from('otp_validations')
        .update({ status: 'expired' })
        .eq('reference', otp_reference)
      
      return NextResponse.json(
        { success: false, error: 'OTP expired' },
        { status: 400 }
      )
    }

    if (otpRecord.otp_code !== otp_code) {
      const currentAttempts = (otpRecord.attempts || 0) + 1
      await supabase
        .from('otp_validations')
        .update({ attempts: currentAttempts })
        .eq('reference', otp_reference)
      
      if (currentAttempts >= 3) {
        await supabase
          .from('otp_validations')
          .update({ status: 'failed' })
          .eq('reference', otp_reference)
      }

      return NextResponse.json(
        { success: false, error: 'Invalid OTP code' },
        { status: 400 }
      )
    }

    // OTP is valid - mark as validated
    await supabase
      .from('otp_validations')
      .update({ status: 'validated', validated_at: new Date().toISOString() })
      .eq('reference', otp_reference)

    // Get wallet transaction from OTP metadata or parameter
    const transactionId = wallet_transaction_id || otpRecord.metadata?.wallet_transaction_id
    
    if (!transactionId) {
      return NextResponse.json(
        { success: false, error: 'Wallet transaction ID not found' },
        { status: 400 }
      )
    }

    const { data: walletTransaction, error: transactionError } = await supabase
      .from('wallet_transactions')
      .select('*, partner_wallets!inner(partner_id)')
      .eq('id', transactionId)
      .eq('transaction_type', 'b2c_float_purchase')
      .single()

    if (transactionError || !walletTransaction) {
      return NextResponse.json(
        { success: false, error: 'Wallet transaction not found' },
        { status: 404 }
      )
    }

    const partnerId = walletTransaction.partner_wallets.partner_id
    const floatAmount = walletTransaction.metadata?.float_amount || walletTransaction.float_amount || 0
    const totalCost = Math.abs(walletTransaction.amount)

    // Get partner info for B2C account
    const { data: partner } = await supabase
      .from('partners')
      .select('id, name, short_code')
      .eq('id', partnerId)
      .single()

    // Get B2C short code from metadata
    const b2cShortCode = walletTransaction.metadata?.b2c_shortcode || '4120187' // Default fallback
    // Use partner name as account name
    const b2cAccountName = partner?.name || 'B2C Float Account'

    // Get current user info for agent name
    const { data: currentUser } = await supabase
      .from('users')
      .select('email, phone_number, full_name')
      .eq('id', payload.userId)
      .single()

    // Call NCBA Open Banking float purchase API
    // Import the NCBA float purchase function directly or use internal fetch
    const { loadNcbaOpenBankingSettings } = await import('../../../../../../lib/ncba-settings')
    
    const settingsResult = await loadNcbaOpenBankingSettings()
    if (!settingsResult.ok || !settingsResult.data) {
      return NextResponse.json(
        { success: false, error: settingsResult.error || 'NCBA OB settings missing' },
        { status: 400 }
      )
    }
    const s = settingsResult.data

    // Obtain token first
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
      return NextResponse.json(
        { success: false, stage: 'token', status: tokenRes.status, error: tokenText },
        { status: 500 }
      )
    }
    
    let tokenData: any
    try {
      tokenData = JSON.parse(tokenText)
    } catch {
      tokenData = { token: tokenText }
    }
    
    const accessToken = tokenData.access_token || tokenData.token || tokenData.Token || tokenData.AccessToken
    if (!accessToken) {
      return NextResponse.json(
        { success: false, stage: 'token', error: 'No access token in response' },
        { status: 500 }
      )
    }

    // Build float purchase payload
    const now = new Date()
    const txnDate = now.toISOString().split('T')[0].replace(/-/g, '') // YYYYMMDD format
    const txnRef = `FLOAT_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    
    const ncbaPayload: Record<string, string> = {
      reqAgentName: currentUser?.full_name || currentUser?.email || 'EazzyPay Agent',
      reqCreditAmount: String(floatAmount),
      reqCustomerReference: `FLOAT_${partnerId}_${Date.now()}`,
      reqDealReference: otp_reference,
      reqDebitAccountNumber: s.debitAccountNumber,
      reqDebitAcCurrency: s.debitAccountCurrency,
      reqDebitAmount: String(floatAmount),
      reqMobileNumber: currentUser?.phone_number?.replace(/^\+/, '') || '',
      reqPayBillTillNo: b2cShortCode, // Use selected B2C short code
      reqPaymentDescription: `B2C Float Purchase for ${b2cAccountName}`,
      reqPaymentType: 'FloatPurchase',
      reqToAccountName: b2cAccountName, // Use validated account name
      reqTransactionReferenceNo: txnRef,
      reqTxnDate: txnDate,
      senderCountry: s.country
    }

    const url = new URL(s.floatPurchasePath, s.baseUrl).toString()
    const ncbaResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Ocp-Apim-Subscription-Key': s.subscriptionKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ncbaPayload)
    })

    const ncbaText = await ncbaResponse.text()
    let ncbaData: any
    try {
      ncbaData = JSON.parse(ncbaText)
    } catch {
      ncbaData = { response: ncbaText }
    }

    if (!ncbaResponse.ok) {
      // Update transaction status
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          metadata: {
            ...walletTransaction.metadata,
            error: ncbaText,
            ncba_response: ncbaData,
            ncba_status: ncbaResponse.status
          }
        })
        .eq('id', walletTransaction.id)

      return NextResponse.json({
        success: false,
        error: ncbaData.error || ncbaText || 'NCBA float purchase failed',
        ncba_response: ncbaData,
        ncba_status: ncbaResponse.status
      }, { status: 500 })
    }

    // NCBA float purchase successful - update wallet balance
    await UnifiedWalletService.updateWalletBalance(
      partnerId,
      -totalCost, // Negative for debit
      'b2c_float_purchase',
      {
        reference: otp_reference,
        description: `B2C Float Purchase - ${floatAmount} KES`,
        float_amount: floatAmount,
        charges: totalCost - floatAmount,
        charge_config_id: walletTransaction.metadata?.charge_config_id,
        ncba_response: ncbaData.data,
        ncba_deal_reference: ncbaData.data?.reqDealReference || otp_reference,
        b2c_shortcode_id: walletTransaction.metadata?.b2c_shortcode_id,
        b2c_shortcode: b2cShortCode,
        b2c_account_name: b2cAccountName
      }
    )

    // Update transaction status
    await supabase
      .from('wallet_transactions')
      .update({
        status: 'completed',
        metadata: {
          ...walletTransaction.metadata,
          ncba_response: ncbaData.data,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', walletTransaction.id)

    return NextResponse.json({
      success: true,
      message: 'Float purchase completed successfully',
      data: {
        float_amount: floatAmount,
        total_cost: totalCost,
        ncba_response: ncbaData.data,
        wallet_transaction_id: walletTransaction.id
      }
    })

  } catch (error: any) {
    console.error('Float purchase confirmation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

