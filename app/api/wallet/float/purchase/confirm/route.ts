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
    // Try updating with validated_at first, if that fails, try without it
    const validatedAt = new Date().toISOString()
    let { error: otpUpdateError } = await supabase
      .from('otp_validations')
      .update({ status: 'validated', validated_at: validatedAt })
      .eq('reference', otp_reference)
    
    // If update fails, try updating just the status (validated_at might have a constraint)
    if (otpUpdateError) {
      console.warn('First OTP update attempt failed, trying status only:', {
        error: otpUpdateError.message,
        code: otpUpdateError.code
      })
      
      const { error: statusOnlyError } = await supabase
        .from('otp_validations')
        .update({ status: 'validated' })
        .eq('reference', otp_reference)
      
      if (statusOnlyError) {
        console.error('Error updating OTP validation status (both attempts failed):', {
          firstError: otpUpdateError,
          secondError: statusOnlyError,
          reference: otp_reference,
          message: statusOnlyError.message,
          code: statusOnlyError.code,
          details: statusOnlyError.details,
          hint: statusOnlyError.hint
        })
        // Don't fail the request - log and continue
        // The OTP is already validated in memory, so we can proceed
      } else {
        console.log('OTP status updated successfully (without validated_at)')
      }
    } else {
      console.log('OTP validation updated successfully with validated_at')
    }

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
      console.error('Error fetching wallet transaction:', {
        error: transactionError,
        transactionId,
        message: transactionError?.message,
        code: transactionError?.code
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Wallet transaction not found',
          details: transactionError?.message || 'Transaction not found or invalid'
        },
        { status: 404 }
      )
    }

    // Extract partner ID from the joined data
    const partnerId = (walletTransaction as any).partner_wallets?.partner_id
    if (!partnerId) {
      console.error('Partner ID not found in wallet transaction:', walletTransaction)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Partner ID not found in transaction',
          details: 'Wallet transaction is missing partner information'
        },
        { status: 400 }
      )
    }
    
    const floatAmount = walletTransaction.metadata?.float_amount || walletTransaction.float_amount || 0
    const totalCost = Math.abs(walletTransaction.amount)
    
    if (floatAmount <= 0) {
      console.error('Invalid float amount:', floatAmount)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid float amount in transaction',
          details: `Float amount must be greater than 0, got: ${floatAmount}`
        },
        { status: 400 }
      )
    }

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
      .select('email, phone_number, first_name, last_name')
      .eq('id', userId)
      .single()
    
    if (userError || !currentUser) {
      console.error('Error fetching current user:', {
        error: userError,
        userId,
        message: userError?.message,
        code: userError?.code
      })
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to fetch user information',
          details: userError?.message || 'User not found'
        },
        { status: 500 }
      )
    }
    
    // Construct full name from first_name and last_name
    const fullName = currentUser.first_name || currentUser.last_name
      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim()
      : null

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
      // Use the same URL construction as the working float-purchase route
      const tokenUrl = new URL(s.tokenPath, s.baseUrl).toString()
      
      console.log('Requesting NCBA token:', {
        constructedUrl: tokenUrl,
        baseUrl: s.baseUrl,
        tokenPath: s.tokenPath,
        environment: s.environment
      })
      
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
        let tokenErrorData: any
        try {
          tokenErrorData = JSON.parse(tokenText)
        } catch {
          tokenErrorData = { error: tokenText }
        }
        
        console.error('NCBA token request failed:', {
          status: tokenRes.status,
          statusText: tokenRes.statusText,
          response: tokenErrorData,
          responseText: tokenText.substring(0, 500),
          headers: Object.fromEntries(tokenRes.headers.entries()),
          requestedUrl: tokenUrl,
          finalUrl: tokenRes.url
        })
        
        // Handle specific error codes
        if (tokenRes.status === 401) {
          return NextResponse.json(
            { 
              success: false, 
              stage: 'token', 
              status: 401,
              error: 'NCBA Authentication Failed: Invalid username or password',
              details: tokenErrorData.title || tokenErrorData.error || 'Please verify your NCBA credentials are correct',
              ncba_response: tokenErrorData
            },
            { status: 401 }
          )
        } else if (tokenRes.status === 403) {
          return NextResponse.json(
            { 
              success: false, 
              stage: 'token', 
              status: 403,
              error: 'NCBA Access Forbidden: Your IP address may not be whitelisted',
              details: 'Please contact NCBA to whitelist your server IP address',
              ncba_response: tokenErrorData
            },
            { status: 403 }
          )
        }
        
        return NextResponse.json(
          { 
            success: false, 
            stage: 'token', 
            status: tokenRes.status, 
            error: tokenErrorData.title || tokenErrorData.error || tokenText.substring(0, 500),
            ncba_response: tokenErrorData
          },
          { status: tokenRes.status >= 500 ? 500 : tokenRes.status }
        )
      }
      
      // Check if response is HTML (error page)
      if (tokenText.trim().startsWith('<!DOCTYPE') || tokenText.trim().startsWith('<html')) {
        console.error('NCBA token endpoint returned HTML instead of JSON:', {
          response: tokenText.substring(0, 500),
          requestedUrl: tokenUrl,
          finalUrl: tokenRes.url
        })
        return NextResponse.json(
          { 
            success: false, 
            stage: 'token', 
            error: 'NCBA token endpoint returned HTML error page',
            requestedUrl: tokenUrl,
            finalUrl: tokenRes.url,
            responsePreview: tokenText.substring(0, 200)
          },
          { status: 500 }
        )
      }
      
      let tokenData: any
      try {
        tokenData = JSON.parse(tokenText)
      } catch (parseError) {
        // If not JSON, treat the entire response as the token (if it's not HTML)
        if (!tokenText.trim().startsWith('<!')) {
          console.log('Token response is not JSON, treating as plain text token')
          tokenData = { token: tokenText.trim() }
        } else {
          console.error('Token response appears to be HTML:', tokenText.substring(0, 200))
          return NextResponse.json(
            { 
              success: false, 
              stage: 'token', 
              error: 'NCBA returned HTML instead of token',
              responsePreview: tokenText.substring(0, 200)
            },
            { status: 500 }
          )
        }
      }
      
      // Log the full response structure for debugging
      console.log('NCBA token response structure:', {
        hasData: !!tokenData.data,
        keys: Object.keys(tokenData),
        sample: JSON.stringify(tokenData).substring(0, 200)
      })
      
      // Try multiple possible token field names and nested structures
      accessToken = 
        tokenData.access_token || 
        tokenData.token || 
        tokenData.Token || 
        tokenData.AccessToken ||
        tokenData.accessToken ||
        tokenData.data?.access_token ||
        tokenData.data?.token ||
        tokenData.data?.Token ||
        tokenData.data?.AccessToken ||
        tokenData.result?.access_token ||
        tokenData.result?.token ||
        (typeof tokenData === 'string' ? tokenData.trim() : null)
      
      if (!accessToken) {
        console.error('No access token found in NCBA response:', {
          responseStructure: Object.keys(tokenData),
          fullResponse: JSON.stringify(tokenData).substring(0, 500),
          rawText: tokenText.substring(0, 500)
        })
        return NextResponse.json(
          { 
            success: false, 
            stage: 'token', 
            error: 'No access token in response', 
            response: tokenData,
            responseKeys: Object.keys(tokenData),
            rawResponse: tokenText.substring(0, 200)
          },
          { status: 500 }
        )
      }
      
      console.log('NCBA token obtained successfully:', {
        tokenLength: accessToken.length,
        tokenPreview: accessToken.substring(0, 20) + '...' + accessToken.substring(accessToken.length - 10),
        tokenStartsWith: accessToken.substring(0, 10)
      })
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
      reqAgentName: fullName || currentUser?.email || 'EazzyPay Agent',
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
      // Use the same URL construction as the working float-purchase route
      const url = new URL(s.floatPurchasePath, s.baseUrl).toString()
      
      // Ensure token is trimmed and properly formatted
      const cleanToken = accessToken.trim()
      
      console.log('Making NCBA float purchase request:', {
        constructedUrl: url,
        baseUrl: s.baseUrl,
        floatPurchasePath: s.floatPurchasePath,
        environment: s.environment,
        payloadKeys: Object.keys(ncbaPayload),
        payload: { ...ncbaPayload, reqDebitAccountNumber: '***', reqMobileNumber: '***' },
        tokenLength: cleanToken.length,
        tokenPreview: cleanToken.substring(0, 20) + '...' + cleanToken.substring(cleanToken.length - 10),
        subscriptionKeyLength: s.subscriptionKey?.length || 0,
        subscriptionKeyPreview: s.subscriptionKey ? s.subscriptionKey.substring(0, 10) + '...' : 'MISSING'
      })
      
      const ncbaResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanToken}`,
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
          requestedUrl: url,
          finalUrl: ncbaResponse.url, // May differ if redirected
          response: ncbaData,
          responseText: ncbaText.substring(0, 500), // First 500 chars
          headers: Object.fromEntries(ncbaResponse.headers.entries()),
          tokenLength: accessToken?.length,
          hasSubscriptionKey: !!s.subscriptionKey
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
              ncba_status: ncbaResponse.status,
              ncba_url: url,
              ncba_final_url: ncbaResponse.url
            }
          })
          .eq('id', walletTransaction.id)

        // Handle specific error codes
        if (ncbaResponse.status === 401) {
          return NextResponse.json({
            success: false,
            error: 'NCBA Authentication Failed: Invalid or expired access token',
            details: ncbaData.title || ncbaData.error || 'The access token may be invalid, expired, or the subscription key may be incorrect',
            ncba_response: ncbaData,
            ncba_status: ncbaResponse.status,
            ncba_url: url,
            ncba_final_url: ncbaResponse.url,
            stage: 'ncba_api',
            troubleshooting: {
              issue: '401 Unauthorized',
              possible_causes: [
                'Access token is invalid or expired',
                'Subscription key is incorrect',
                'Token was not properly obtained',
                'NCBA credentials may have changed'
              ],
              action: 'Verify NCBA credentials and try again. If the issue persists, check with NCBA support.'
            }
          }, { status: 401 })
        } else if (ncbaResponse.status === 403) {
          return NextResponse.json({
            success: false,
            error: 'NCBA Access Forbidden: Your IP address may not be whitelisted',
            details: ncbaData.title || ncbaData.error || 'Please contact NCBA to whitelist your server IP address',
            ncba_response: ncbaData,
            ncba_status: ncbaResponse.status,
            stage: 'ncba_api'
          }, { status: 403 })
        }

        return NextResponse.json({
          success: false,
          error: ncbaData.title || ncbaData.error || ncbaData.message || ncbaText || 'NCBA float purchase failed',
          ncba_response: ncbaData,
          ncba_status: ncbaResponse.status,
          ncba_url: url,
          ncba_final_url: ncbaResponse.url,
          stage: 'ncba_api'
        }, { status: ncbaResponse.status >= 500 ? 500 : ncbaResponse.status })
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
      
      const walletResult = await UnifiedWalletService.updateWalletBalance(
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
      
      if (!walletResult.success) {
        console.error('Wallet balance update failed:', walletResult)
        
        // Update transaction status
        await supabase
          .from('wallet_transactions')
          .update({
            status: 'failed',
            metadata: {
              ...walletTransaction.metadata,
              ncba_response: ncbaData.data || ncbaData,
              wallet_error: walletResult.error,
              error: 'NCBA purchase succeeded but wallet update failed'
            }
          })
          .eq('id', walletTransaction.id)
        
        return NextResponse.json({
          success: false,
          error: walletResult.error || 'Failed to update wallet balance',
          stage: 'wallet_update',
          ncba_success: true,
          wallet_result: walletResult
        }, { status: 500 })
      }
      
      console.log('Wallet balance updated successfully:', {
        previousBalance: walletResult.previousBalance,
        newBalance: walletResult.newBalance,
        amount: walletResult.amount
      })
    } catch (walletError: any) {
      console.error('Exception updating wallet balance:', {
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

