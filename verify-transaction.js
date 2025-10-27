require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTransaction() {
  console.log('🔍 Verifying the processed transaction...');
  
  // Check for the specific transaction ID
  const { data: c2bTransaction, error: c2bError } = await supabase
    .from('c2b_transactions')
    .select('*')
    .eq('transaction_id', 'TJR678M4TL')
    .single();
    
  if (c2bError) {
    console.error('C2B Transaction error:', c2bError);
  } else {
    console.log('✅ C2B Transaction found:', c2bTransaction);
  }
  
  // Check for wallet transaction
  const { data: walletTransaction, error: walletError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('reference', 'TJR678M4TL')
    .single();
    
  if (walletError) {
    console.error('Wallet Transaction error:', walletError);
  } else {
    console.log('✅ Wallet Transaction found:', walletTransaction);
  }
  
  // Check UMOJA partner wallet balance
  const { data: partnerWallet, error: walletBalanceError } = await supabase
    .from('partner_wallets')
    .select('*')
    .eq('partner_id', 'c0bf511b-b197-46e8-ac28-a4231772c8d2')
    .single();
    
  if (walletBalanceError) {
    console.error('Partner Wallet error:', walletBalanceError);
  } else {
    console.log('💰 UMOJA Partner Wallet:', {
      current_balance: partnerWallet.current_balance,
      currency: partnerWallet.currency
    });
  }
}

verifyTransaction();
