import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
// CORS headers (inline to avoid import issues)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};
// Function to parse M-Pesa balance data
function parseMpesaBalanceData(balanceString) {
  try {
    console.log('🔍 [Balance Parser] Parsing balance string:', balanceString);
    // Split by & to get different account types
    const accountSections = balanceString.split('&');
    console.log('🔍 [Balance Parser] Account sections:', accountSections);
    let workingAccountBalance = null;
    let utilityAccountBalance = null;
    let chargesPaidAccountBalance = null;
    for (const section of accountSections){
      console.log('🔍 [Balance Parser] Processing section:', section);
      // Split by | to get account details
      const parts = section.split('|');
      console.log('🔍 [Balance Parser] Section parts:', parts);
      if (parts.length >= 4) {
        const accountType = parts[0].trim();
        const currency = parts[1].trim();
        const currentBalance = parseFloat(parts[2].trim());
        const availableBalance = parseFloat(parts[3].trim());
        console.log('🔍 [Balance Parser] Account details:', {
          accountType,
          currency,
          currentBalance,
          availableBalance
        });
        switch(accountType){
          case 'Working Account':
            workingAccountBalance = currentBalance;
            console.log('✅ [Balance Parser] Working Account Balance:', workingAccountBalance);
            break;
          case 'Utility Account':
            utilityAccountBalance = currentBalance;
            console.log('✅ [Balance Parser] Utility Account Balance:', utilityAccountBalance);
            break;
          case 'Charges Paid Account':
            chargesPaidAccountBalance = currentBalance;
            console.log('✅ [Balance Parser] Charges Paid Account Balance:', chargesPaidAccountBalance);
            break;
        }
      }
    }
    return {
      workingAccountBalance,
      utilityAccountBalance,
      chargesPaidAccountBalance
    };
  } catch (error) {
    console.error('❌ [Balance Parser] Error parsing balance data:', error);
    return {
      workingAccountBalance: null,
      utilityAccountBalance: null,
      chargesPaidAccountBalance: null
    };
  }
}
serve(async (req)=>{
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Allow all requests - Safaricom won't have authentication
  // This function must be accessible without authentication for M-Pesa callbacks
  try {
    // Initialize Supabase client with service role key for database access
    const supabaseUrl = Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response('Configuration error', {
        status: 500
      });
    }
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
    // Parse the callback data
    const callbackData = await req.json();
    console.log('🔔 [M-Pesa Callback] Received callback:', JSON.stringify(callbackData, null, 2));
    const { Result } = callbackData;
    const conversationId = Result.ConversationID;
    const originatorConversationId = Result.OriginatorConversationID;
    const transactionId = Result.TransactionID;
    // First, try to find a balance request by conversation ID
    let { data: balanceRequest, error: balanceError } = await supabaseClient.from('balance_requests').select('*').eq('conversation_id', conversationId).single();
    if (!balanceError && balanceRequest) {
      console.log('✅ [M-Pesa Callback] Found balance request:', balanceRequest.id);
      // Extract balance information from ResultParameters
      let balanceBefore = null;
      let balanceAfter = null;
      let utilityAccountBalance = null;
      if (Result.ResultParameters?.ResultParameter) {
        console.log('🔍 [M-Pesa Callback] Processing ResultParameter array...');
        for (const param of Result.ResultParameters.ResultParameter){
          console.log(`🔍 [M-Pesa Callback] Processing parameter: ${param.Key} = ${param.Value}`);
          if (param.Key === 'AccountBalance') {
            console.log('🔍 [M-Pesa Callback] Found AccountBalance parameter, parsing...');
            // Parse the complex balance string
            const balanceData = parseMpesaBalanceData(param.Value);
            // Use working account as main balance
            balanceAfter = balanceData.workingAccountBalance;
            utilityAccountBalance = balanceData.utilityAccountBalance;
            console.log('✅ [M-Pesa Callback] Parsed balance data:', {
              workingAccountBalance: balanceData.workingAccountBalance,
              utilityAccountBalance: balanceData.utilityAccountBalance,
              chargesPaidAccountBalance: balanceData.chargesPaidAccountBalance
            });
          }
        }
      }
      // Determine the final status based on result code
      let finalStatus = 'failed';
      if (Result.ResultCode === 0) {
        finalStatus = 'completed';
      } else if (Result.ResultCode === 1) {
        finalStatus = 'pending';
      }
      console.log('📊 [M-Pesa Callback] Final balance data:', {
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        utility_account_balance: utilityAccountBalance,
        final_status: finalStatus
      });
      // Update the balance request status with balance information
      const { error: updateError } = await supabaseClient.from('balance_requests').update({
        status: finalStatus,
        result_code: Result.ResultCode.toString(),
        result_desc: Result.ResultDesc,
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        utility_account_balance: utilityAccountBalance,
        updated_at: new Date().toISOString()
      }).eq('id', balanceRequest.id);
      if (updateError) {
        console.error('❌ [M-Pesa Callback] Error updating balance request:', updateError);
      } else {
        console.log('✅ [M-Pesa Callback] Balance request updated successfully:', {
          id: balanceRequest.id,
          status: finalStatus,
          balance_before: balanceBefore,
          balance_after: balanceAfter,
          utility_account_balance: utilityAccountBalance
        });
      }
      return new Response('OK', {
        status: 200
      });
    }
    // If not a balance request, try to find a disbursement request
    console.log('🔍 [M-Pesa Callback] Not a balance request, checking disbursement requests...');
    let { data: disbursementRequest, error: findError } = await supabaseClient.from('disbursement_requests').select('*').eq('conversation_id', conversationId).single();
    // If not found by conversation_id, try to find by Occasion (disbursement ID)
    if (findError || !disbursementRequest) {
      console.log(`🔍 [M-Pesa Callback] Disbursement not found by conversation_id: ${conversationId}, trying Occasion field`);
      // Extract Occasion from ResultParameters if available
      let occasion = null;
      if (Result.ResultParameters?.ResultParameter) {
        for (const param of Result.ResultParameters.ResultParameter){
          if (param.Key === 'Occasion') {
            occasion = param.Value;
            break;
          }
        }
      }
      if (occasion) {
        console.log(`🔍 [M-Pesa Callback] Trying to find disbursement by Occasion: ${occasion}`);
        const { data: disbursementByOccasion, error: occasionError } = await supabaseClient.from('disbursement_requests').select('*').eq('id', occasion).single();
        if (!occasionError && disbursementByOccasion) {
          disbursementRequest = disbursementByOccasion;
          findError = null;
          console.log(`✅ [M-Pesa Callback] Found disbursement by Occasion: ${occasion}`);
        }
      }
    }
    if (findError || !disbursementRequest) {
      console.log(`❌ [M-Pesa Callback] No matching request found for conversation_id: ${conversationId}`);
      return new Response('OK', {
        status: 200
      });
    }
    // Handle disbursement request (existing logic)
    console.log('✅ [M-Pesa Callback] Found disbursement request:', disbursementRequest.id);
    // Extract transaction details from ResultParameters
    let receiptNumber = null;
    let transactionAmount = null;
    let transactionDate = null;
    let utilityAccountBalance = null;
    if (Result.ResultParameters?.ResultParameter) {
      for (const param of Result.ResultParameters.ResultParameter){
        switch(param.Key){
          case 'TransactionReceipt':
            receiptNumber = param.Value;
            break;
          case 'TransactionAmount':
            transactionAmount = parseFloat(param.Value);
            break;
          case 'TransactionDate':
            transactionDate = param.Value;
            break;
          case 'B2CUtilityAccountAvailableFunds':
            utilityAccountBalance = parseFloat(param.Value);
            break;
          case 'B2CRecipientIsRegisteredCustomer':
            break;
        }
      }
    }
    // Determine the final status based on result code
    let finalStatus = 'failed';
    if (Result.ResultCode === 0) {
      finalStatus = 'success';
    } else if (Result.ResultCode === 1) {
      finalStatus = 'pending';
    }
    // Update the disbursement request status with balance information
    const { error: updateError } = await supabaseClient.from('disbursement_requests').update({
      status: finalStatus,
      result_code: Result.ResultCode.toString(),
      result_desc: Result.ResultDesc,
      transaction_id: transactionId,
      receipt_number: receiptNumber,
      transaction_amount: transactionAmount,
      transaction_date: transactionDate,
      mpesa_utility_account_balance: utilityAccountBalance,
      balance_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }).eq('id', disbursementRequest.id);
    if (updateError) {
      console.error('❌ [M-Pesa Callback] Error updating disbursement request:', updateError);
    } else {
      console.log('✅ [M-Pesa Callback] Disbursement request updated successfully:', {
        id: disbursementRequest.id,
        status: finalStatus,
        receipt_number: receiptNumber,
        transaction_amount: transactionAmount
      });
    }
    return new Response('OK', {
      status: 200
    });
  } catch (error) {
    console.error('❌ [M-Pesa Callback] Error processing callback:', error);
    return new Response('Error', {
      status: 500
    });
  }
});
