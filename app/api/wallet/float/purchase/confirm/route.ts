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
    if (!payload || !(payload as any).userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication' },
        { status: 401 }
      )
    }
    
    // Type assertion for payload
    const userId = (payload as any).userId as string

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

    // Check expiration first - ensure proper date parsing and UTC comparison
    // This allows us to update status if expired, even if status wasn't updated yet
    // Get current time in UTC to avoid timezone issues
    const currentTime = new Date()
    const currentTimeUTC = new Date(currentTime.toISOString())
    
    // Parse expires_at - Supabase returns timestamps as ISO strings
    // Ensure we parse them correctly as UTC timestamps
    let expiresAt: Date
    if (typeof otpRecord.expires_at === 'string') {
      // Supabase typically returns ISO strings with timezone info
      // If no timezone indicator, PostgreSQL TIMESTAMP is stored in server timezone
      // but we'll parse it and treat as UTC for consistency
      const expiresAtStr = otpRecord.expires_at.trim()
      if (expiresAtStr.endsWith('Z') || expiresAtStr.includes('+') || expiresAtStr.includes('-', 10)) {
        // Has timezone info, parse directly
        expiresAt = new Date(expiresAtStr)
      } else {
        // No timezone info - assume UTC (PostgreSQL TIMESTAMP without TZ is ambiguous)
        // Add Z to force UTC interpretation
        expiresAt = new Date(expiresAtStr + 'Z')
      }
    } else if (otpRecord.expires_at instanceof Date) {
      expiresAt = otpRecord.expires_at
    } else {
      // Fallback: try to parse as date
      expiresAt = new Date(otpRecord.expires_at)
    }
    
    // Validate that expires_at is a valid date
    if (isNaN(expiresAt.getTime())) {
      console.error('Invalid expires_at date:', otpRecord.expires_at, typeof otpRecord.expires_at)
      return NextResponse.json(
        { success: false, error: 'Invalid OTP expiration date' },
        { status: 500 }
      )
    }

    // Convert both to UTC timestamps for accurate comparison
    const currentTimestamp = currentTimeUTC.getTime()
    const expiresTimestamp = expiresAt.getTime()
    
    // Add a small buffer (5 seconds) to account for clock skew between client/server/database
    // This prevents false expiration due to minor time differences
    const bufferMs = 5000
    const timeRemaining = expiresTimestamp - currentTimestamp

    // Debug logging in development
    if (process.env.NODE_ENV === 'development') {
      console.log('OTP expiration check:', {
        now: currentTimeUTC.toISOString(),
        expiresAt: expiresAt.toISOString(),
        timeRemainingMs: timeRemaining,
        timeRemainingMinutes: Math.floor(timeRemaining / 60000),
        isExpired: currentTimestamp >= expiresTimestamp,
        rawExpiresAt: otpRecord.expires_at,
        expiresAtType: typeof otpRecord.expires_at,
        currentTimestamp,
        expiresTimestamp
      })
    }

    // Compare dates properly (expires_at should be in the future)
    // Use getTime() for precise comparison
    // Account for clock skew: only expire if current time (minus buffer) is past expiration
    // This prevents false expiration when clocks are slightly out of sync
    if ((currentTimestamp - bufferMs) >= expiresTimestamp) {
      await supabase
        .from('otp_validations')
        .update({ status: 'expired' })
        .eq('reference', otp_reference)
      
      return NextResponse.json(
        { success: false, error: 'OTP expired' },
        { status: 400 }
      )
    }

    // Validate OTP status - check after expiration to ensure status is current
    if (otpRecord.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'OTP already used or expired' },
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
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('email, phone_number, full_name')
      .eq('id', userId)
      .single()
    
    if (userError || !currentUser) {
      console.error('Error fetching current user:', userError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch user information' },
        { status: 500 }
      )
    }

    // Call NCBA Open Banking float purchase API
    // Import the NCBA float purchase function directly or use internal fetch
    let s: any
    let accessToken: string
    
    try {
      const { loadNcbaOpenBankingSettings } = await import('../../../../../../lib/ncba-settings')
      
      const settingsResult = await loadNcbaOpenBankingSettings()
      if (!settingsResult.ok || !settingsResult.data) {
        console.error('NCBA settings error:', settingsResult.error)
        return NextResponse.json(
          { success: false, error: settingsResult.error || 'NCBA OB settings missing', stage: 'settings' },
          { status: 400 }
        )
      }
      s = settingsResult.data

      // Obtain token first
      console.log('Requesting NCBA token from:', s.tokenPath)
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
        console.error('NCBA token request failed:', {
          status: tokenRes.status,
          statusText: tokenRes.statusText,
          response: tokenText
        })
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
      
      accessToken = tokenData.access_token || tokenData.token || tokenData.Token || tokenData.AccessToken
      if (!accessToken) {
        console.error('No access token in NCBA response:', tokenData)
        return NextResponse.json(
          { success: false, stage: 'token', error: 'No access token in response', response: tokenData },
          { status: 500 }
        )
      }
      
      console.log('NCBA token obtained successfully')
    } catch (tokenError: any) {
      console.error('Error obtaining NCBA token:', {
        message: tokenError?.message,
        stack: tokenError?.stack
      })
      return NextResponse.json(
        { success: false, stage: 'token', error: tokenError?.message || 'Failed to obtain NCBA token' },
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

    // Make NCBA float purchase request
    let ncbaData: any
    try {
      console.log('Making NCBA float purchase request:', {
        url: s.floatPurchasePath,
        baseUrl: s.baseUrl,
        payload: { ...ncbaPayload, reqDebitAccountNumber: '***', reqMobileNumber: '***' }
      })
      
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
      try {
        ncbaData = JSON.parse(ncbaText)
      } catch {
        ncbaData = { response: ncbaText }
      }

      if (!ncbaResponse.ok) {
        console.error('NCBA float purchase failed:', {
          status: ncbaResponse.status,
          statusText: ncbaResponse.statusText,
          response: ncbaData
        })
        
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
          error: ncbaData.error || ncbaData.message || ncbaText || 'NCBA float purchase failed',
          ncba_response: ncbaData,
          ncba_status: ncbaResponse.status,
          stage: 'ncba_api'
        }, { status: 500 })
      }
      
      console.log('NCBA float purchase successful:', ncbaData)
    } catch (ncbaError: any) {
      console.error('Error calling NCBA float purchase API:', {
        message: ncbaError?.message,
        stack: ncbaError?.stack
      })
      
      // Update transaction status
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          metadata: {
            ...walletTransaction.metadata,
            error: ncbaError?.message || 'NCBA API call failed',
            ncba_error: ncbaError?.message
          }
        })
        .eq('id', walletTransaction.id)
      
      return NextResponse.json({
        success: false,
        error: ncbaError?.message || 'Failed to call NCBA float purchase API',
        stage: 'ncba_api'
      }, { status: 500 })
    }

    // NCBA float purchase successful - update wallet balance
    try {
      console.log('Updating wallet balance:', {
        partnerId,
        amount: -totalCost,
        floatAmount
      })
      
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
          ncba_response: ncbaData.data || ncbaData,
          ncba_deal_reference: ncbaData.data?.reqDealReference || ncbaData.reqDealReference || otp_reference,
          b2c_shortcode_id: walletTransaction.metadata?.b2c_shortcode_id,
          b2c_shortcode: b2cShortCode,
          b2c_account_name: b2cAccountName
        }
      )
      
      console.log('Wallet balance updated successfully')
    } catch (walletError: any) {
      console.error('Error updating wallet balance:', {
        message: walletError?.message,
        stack: walletError?.stack
      })
      
      // Update transaction status
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'failed',
          metadata: {
            ...walletTransaction.metadata,
            ncba_response: ncbaData.data || ncbaData,
            wallet_error: walletError?.message,
            error: 'NCBA purchase succeeded but wallet update failed'
          }
        })
        .eq('id', walletTransaction.id)
      
      return NextResponse.json({
        success: false,
        error: walletError?.message || 'Failed to update wallet balance',
        stage: 'wallet_update',
        ncba_success: true
      }, { status: 500 })
    }

    // Update transaction status
    try {
      await supabase
        .from('wallet_transactions')
        .update({
          status: 'completed',
          metadata: {
            ...walletTransaction.metadata,
            ncba_response: ncbaData.data || ncbaData,
            completed_at: new Date().toISOString()
          }
        })
        .eq('id', walletTransaction.id)
      
      console.log('Transaction status updated to completed')
    } catch (updateError: any) {
      console.error('Error updating transaction status:', updateError)
      // Don't fail the request if status update fails - transaction is already completed
    }

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
    console.error('Float purchase confirmation error:', {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      error
    })
    return NextResponse.json(
      { 
        success: false, 
        error: error?.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    )
  }
}

