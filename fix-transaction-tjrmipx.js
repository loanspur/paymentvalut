const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTransaction() {
  console.log('🔧 Fixing transaction TJR678MIPX...');
  
  // Get the transaction
  const { data: tx, error: txError } = await supabase
    .from('c2b_transactions')
    .select('*')
    .eq('transaction_id', 'TJR678MIPX')
    .single();
    
  if (!tx) {
    console.error('Transaction not found');
    return;
  }
  
  console.log('✅ Transaction found:', tx.transaction_id);
  
  // Get the partner
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .eq('id', tx.partner_id)
    .single();
    
  if (!partner) {
    console.error('Partner not found');
    return;
  }
  
  console.log('✅ Partner found:', partner.name);
  
  // Get the wallet
  const { data: wallet, error: walletError } = await supabase
    .from('partner_wallets')
    .select('*')
    .eq('partner_id', partner.id)
    .single();
    
  if (!wallet) {
    console.error('Wallet not found');
    return;
  }
  
  console.log('✅ Wallet found, current balance:', wallet.current_balance);
  
  // Check if wallet transaction already exists
  const { data: existingWalletTx, error: existingError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('reference', tx.transaction_id)
    .single();
    
  if (existingWalletTx) {
    console.log('⚠️ Wallet transaction already exists:', existingWalletTx.id);
    return;
  }
  
  // Create the missing wallet transaction
  const { data: walletTransaction, error: walletTxError } = await supabase
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      transaction_type: 'top_up',
      amount: tx.amount,
      currency: 'KES',
      status: 'completed',
      reference: tx.transaction_id,
      description: `Wallet top-up via NCBA Paybill (Manual Payment) - ${tx.bill_reference_number}`,
      metadata: {
        c2b_transaction_id: tx.id,
        transaction_type: tx.transaction_type,
        business_short_code: tx.business_short_code,
        bill_reference: tx.bill_reference_number,
        customer_phone: tx.customer_phone,
        customer_name: tx.customer_name,
        source: 'ncba_paybill_notification_fix',
        payment_method: 'manual_paybill',
        partner_name: partner.name,
        partner_short_code: partner.short_code
      }
    })
    .select()
    .single();
    
  if (walletTxError) {
    console.error('❌ Error creating wallet transaction:', walletTxError);
  } else {
    console.log('✅ Wallet transaction created:', walletTransaction.id);
    
    // Update wallet balance
    const newBalance = wallet.current_balance + tx.amount;
    const { error: balanceError } = await supabase
      .from('partner_wallets')
      .update({
        current_balance: newBalance,
        last_topup_date: tx.created_at,
        last_topup_amount: tx.amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', wallet.id);
      
    if (balanceError) {
      console.error('❌ Error updating wallet balance:', balanceError);
    } else {
      console.log(`✅ Wallet balance updated: ${wallet.current_balance} -> ${newBalance}`);
    }
  }
}

fixTransaction().catch(console.error);
