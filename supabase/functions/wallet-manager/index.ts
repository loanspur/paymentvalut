// Wallet Manager Edge Function
// This function handles wallet operations including STK Push top-ups, B2C float purchases, and balance management
// Date: December 2024
// Version: 1.0

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { NCBAClient, createNCBAClient, DEFAULT_NCBA_CONFIG } from '../_shared/ncba-client.ts'
import { OTPService } from '../_shared/otp-service.ts'
import { WalletService } from '../_shared/wallet-service.ts'
import { corsHeaders } from '../_shared/cors.ts'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

// Initialize services
const walletService = new WalletService(supabaseClient)
const otpService = new OTPService(supabaseClient)

// NCBA Configuration
const ncbaConfig = {
  ...DEFAULT_NCBA_CONFIG,
  username: Deno.env.get('NCBA_USERNAME') || '',
  password: Deno.env.get('NCBA_PASSWORD') || '',
  accountNumber: Deno.env.get('NCBA_ACCOUNT_NUMBER') || ''
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const path = url.pathname
    const method = req.method

    console.log(`[Wallet Manager] ${method} ${path}`)

    // Route handling
    switch (true) {
      case path.endsWith('/balance') && method === 'GET':
        return await handleGetBalance(req)
      
      case path.endsWith('/topup/stk-push') && method === 'POST':
        return await handleSTKPushTopup(req)
      
      case path.endsWith('/topup/validate') && method === 'POST':
        return await handleTopupValidation(req)
      
      case path.endsWith('/float/purchase') && method === 'POST':
        return await handleB2CFloatPurchase(req)
      
      case path.endsWith('/transactions') && method === 'GET':
        return await handleGetTransactions(req)
      
      case path.endsWith('/stk-push/query') && method === 'POST':
        return await handleSTKPushQuery(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Endpoint not found',
            available_endpoints: [
              'GET /balance',
              'POST /topup/stk-push',
              'POST /topup/validate',
              'POST /float/purchase',
              'GET /transactions',
              'POST /stk-push/query'
            ]
          }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
    }
  } catch (error) {
    console.error('[Wallet Manager] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/**
 * Get wallet balance
 */
async function handleGetBalance(req: Request) {
  try {
    const url = new URL(req.url)
    const partnerId = url.searchParams.get('partner_id')

    if (!partnerId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'partner_id parameter is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const wallet = await walletService.getOrCreatePartnerWallet(partnerId)
    
    if (!wallet) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get wallet information' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const b2cFloat = await walletService.getB2CFloatBalance(partnerId)

    return new Response(
      JSON.stringify({
        success: true,
        wallet: {
          id: wallet.id,
          partnerId: wallet.partnerId,
          currentBalance: wallet.currentBalance,
          currency: wallet.currency,
          lastTopupDate: wallet.lastTopupDate,
          lastTopupAmount: wallet.lastTopupAmount,
          lowBalanceThreshold: wallet.lowBalanceThreshold,
          smsNotificationsEnabled: wallet.smsNotificationsEnabled,
          isLowBalance: wallet.currentBalance < wallet.lowBalanceThreshold
        },
        b2cFloat: b2cFloat ? {
          currentFloatBalance: b2cFloat.currentFloatBalance,
          lastPurchaseDate: b2cFloat.lastPurchaseDate,
          lastPurchaseAmount: b2cFloat.lastPurchaseAmount,
          totalPurchased: b2cFloat.totalPurchased,
          totalUsed: b2cFloat.totalUsed
        } : null
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Get Balance] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to get balance',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Initiate STK Push wallet top-up
 */
async function handleSTKPushTopup(req: Request) {
  try {
    const body = await req.json()
    const { partner_id, amount, phone_number, description } = body

    // Validate required fields
    if (!partner_id || !amount || !phone_number) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'partner_id, amount, and phone_number are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate amount
    if (!WalletService.validateAmount(amount)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid amount. Must be between 1 and 1,000,000 KES' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate phone number
    const formattedPhone = NCBAClient.formatPhoneNumber(phone_number)
    if (!NCBAClient.validatePhoneNumber(formattedPhone)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid phone number format' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get or create wallet
    const wallet = await walletService.getOrCreatePartnerWallet(partner_id)
    if (!wallet) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to get wallet information' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create wallet transaction record
    const reference = walletService.generateTransactionReference('topup', partner_id)
    const transaction = await walletService.createWalletTransaction({
      walletId: wallet.id,
      transactionType: 'topup',
      amount: amount,
      reference: reference,
      description: description || `Wallet top-up via STK Push`,
      status: 'pending',
      ncbPaybillNumber: ncbaConfig.paybillNumber,
      ncbAccountNumber: ncbaConfig.accountNumber,
      stkPushStatus: 'initiated'
    })

    if (!transaction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create transaction record' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initiate STK Push
    const ncbaClient = createNCBAClient(ncbaConfig)
    const stkPushRequest = ncbaClient.createWalletTopupRequest(formattedPhone, amount)
    const stkPushResponse = await ncbaClient.initiateSTKPush(stkPushRequest)

    if (!stkPushResponse.success) {
      // Update transaction status to failed
      await supabaseClient
        .from('wallet_transactions')
        .update({ 
          status: 'failed',
          stk_push_status: 'failed'
        })
        .eq('id', transaction.id)

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: stkPushResponse.error || 'STK Push initiation failed',
          transactionId: transaction.id,
          reference: reference
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update transaction with STK Push details
    await supabaseClient
      .from('wallet_transactions')
      .update({ 
        stk_push_transaction_id: stkPushResponse.transactionId,
        ncb_reference_id: stkPushResponse.referenceId,
        stk_push_status: 'pending'
      })
      .eq('id', transaction.id)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push initiated successfully',
        transactionId: transaction.id,
        reference: reference,
        stkPushTransactionId: stkPushResponse.transactionId,
        ncbReferenceId: stkPushResponse.referenceId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[STK Push Topup] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'STK Push top-up failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Validate STK Push payment and credit wallet
 */
async function handleTopupValidation(req: Request) {
  try {
    const body = await req.json()
    const { transaction_id, stk_push_transaction_id } = body

    if (!transaction_id || !stk_push_transaction_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'transaction_id and stk_push_transaction_id are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get transaction record
    const { data: transaction, error: transactionError } = await supabaseClient
      .from('wallet_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single()

    if (transactionError || !transaction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Transaction not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Query STK Push status
    const ncbaClient = createNCBAClient(ncbaConfig)
    const queryResponse = await ncbaClient.querySTKPushStatus({
      transactionId: stk_push_transaction_id
    })

    if (!queryResponse.success) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: queryResponse.error || 'Failed to query STK Push status' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update transaction with query response
    await supabaseClient
      .from('wallet_transactions')
      .update({ 
        stk_push_status: queryResponse.status?.toLowerCase() || 'pending'
      })
      .eq('id', transaction_id)

    // If payment is successful, credit wallet via unified DB function
    if (queryResponse.status?.toLowerCase() === 'completed') {
      // Fetch wallet to get partner_id
      const { data: walletRow } = await supabaseClient
        .from('partner_wallets')
        .select('id, partner_id, current_balance')
        .eq('id', transaction.wallet_id)
        .single()

      if (walletRow && walletRow.partner_id) {
        // Use SQL RPC to perform atomic balance update at DB level
        const { data: rpcResult, error: rpcError } = await supabaseClient
          .rpc('update_partner_wallet_balance', {
            p_partner_id: walletRow.partner_id,
            p_amount: parseFloat(transaction.amount),
            p_transaction_type: 'top_up'
          })

        if (!rpcError) {
          // Update transaction status
          await supabaseClient
            .from('wallet_transactions')
            .update({ 
              status: 'completed',
              stk_push_status: 'completed'
            })
            .eq('id', transaction_id)

          return new Response(
            JSON.stringify({
              success: true,
              message: 'Wallet credited successfully',
              transactionId: transaction_id,
              creditedAmount: parseFloat(transaction.amount)
            }),
            { 
              status: 200, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          )
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'STK Push status updated',
        transactionId: transaction_id,
        status: queryResponse.status,
        amount: queryResponse.amount,
        phoneNumber: queryResponse.phoneNumber
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Topup Validation] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Top-up validation failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Purchase B2C float with OTP validation
 */
async function handleB2CFloatPurchase(req: Request) {
  try {
    const body = await req.json()
    const { partner_id, float_amount, transfer_fee, processing_fee, otp_reference, otp_code, description } = body

    // Validate required fields
    if (!partner_id || !float_amount || !transfer_fee || !processing_fee || !otp_reference || !otp_code) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'All fields are required: partner_id, float_amount, transfer_fee, processing_fee, otp_reference, otp_code' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const totalAmount = float_amount + transfer_fee + processing_fee

    // Validate OTP
    const otpValidation = await otpService.validateOTP({
      reference: otp_reference,
      otpCode: otp_code,
      partnerId: partner_id
    })

    if (!otpValidation.success || !otpValidation.valid) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: otpValidation.message || 'OTP validation failed' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check wallet balance
    const hasBalance = await walletService.hasSufficientBalance(partner_id, totalAmount)
    if (!hasBalance) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Insufficient wallet balance for B2C float purchase' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get wallet
    const wallet = await walletService.getPartnerWallet(partner_id)
    if (!wallet) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Wallet not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create transaction record
    const reference = walletService.generateTransactionReference('b2c_float_purchase', partner_id)
    const transaction = await walletService.createWalletTransaction({
      walletId: wallet.id,
      transactionType: 'b2c_float_purchase',
      amount: totalAmount,
      reference: reference,
      description: description || `B2C float purchase: ${float_amount} KES`,
      floatAmount: float_amount,
      transferFee: transfer_fee,
      processingFee: processing_fee,
      otpReference: otp_reference,
      otpValidated: true,
      otpValidatedAt: new Date().toISOString(),
      status: 'completed'
    })

    if (!transaction) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to create transaction record' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Deduct from wallet
    const newBalance = wallet.currentBalance - totalAmount
    const walletUpdated = await walletService.updateWalletBalance(wallet.id, newBalance)

    if (!walletUpdated) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to update wallet balance' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update B2C float balance
    const b2cFloat = await walletService.getB2CFloatBalance(partner_id)
    if (b2cFloat) {
      const newFloatBalance = b2cFloat.currentFloatBalance + float_amount
      await walletService.updateB2CFloatBalance(partner_id, newFloatBalance, float_amount)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'B2C float purchased successfully',
        transactionId: transaction.id,
        reference: reference,
        floatAmount: float_amount,
        totalAmount: totalAmount,
        newWalletBalance: newBalance
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[B2C Float Purchase] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'B2C float purchase failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Get wallet transactions
 */
async function handleGetTransactions(req: Request) {
  try {
    const url = new URL(req.url)
    const partnerId = url.searchParams.get('partner_id')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    if (!partnerId) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'partner_id parameter is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const wallet = await walletService.getPartnerWallet(partnerId)
    if (!wallet) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Wallet not found' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const transactions = await walletService.getWalletTransactions(wallet.id, limit, offset)

    return new Response(
      JSON.stringify({
        success: true,
        transactions: transactions,
        pagination: {
          limit,
          offset,
          total: transactions.length
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[Get Transactions] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Failed to get transactions',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

/**
 * Query STK Push status
 */
async function handleSTKPushQuery(req: Request) {
  try {
    const body = await req.json()
    const { stk_push_transaction_id } = body

    if (!stk_push_transaction_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'stk_push_transaction_id is required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const ncbaClient = createNCBAClient(ncbaConfig)
    const queryResponse = await ncbaClient.querySTKPushStatus({
      transactionId: stk_push_transaction_id
    })

    return new Response(
      JSON.stringify({
        success: queryResponse.success,
        status: queryResponse.status,
        amount: queryResponse.amount,
        phoneNumber: queryResponse.phoneNumber,
        transactionId: queryResponse.transactionId,
        referenceId: queryResponse.referenceId,
        message: queryResponse.message,
        error: queryResponse.error
      }),
      { 
        status: queryResponse.success ? 200 : 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  } catch (error) {
    console.error('[STK Push Query] Error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'STK Push query failed',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
}

