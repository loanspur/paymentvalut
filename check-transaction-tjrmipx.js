const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTransaction() {
  console.log('🔍 Checking for transaction TJR678MIPX...');
  
  // Check NCBA transactions table (stored in c2b_transactions)
  const { data: ncbaTx, error: ncbaError } = await supabase
    .from('c2b_transactions')
    .select('*')
    .eq('transaction_id', 'TJR678MIPX')
    .single();
    
  if (ncbaError && ncbaError.code !== 'PGRST116') {
    console.error('Error checking NCBA transactions:', ncbaError);
  } else if (ncbaTx) {
    console.log('✅ Found NCBA transaction:', ncbaTx);
  } else {
    console.log('❌ Transaction TJR678MIPX not found in ncba_transactions');
  }
  
  // Check wallet transactions
  const { data: walletTx, error: walletError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .ilike('reference', '%TJR678MIPX%')
    .limit(5);
    
  if (walletError) {
    console.error('Error checking wallet transactions:', walletError);
  } else if (walletTx && walletTx.length > 0) {
    console.log('✅ Found wallet transactions:', walletTx);
  } else {
    console.log('❌ No wallet transactions found for TJR678MIPX');
  }
  
  // Check FINSA partner
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('*')
    .ilike('short_code', 'FINSA')
    .single();
    
  if (partnerError && partnerError.code !== 'PGRST116') {
    console.error('Error checking FINSA partner:', partnerError);
  } else if (partner) {
    console.log('✅ Found FINSA partner:', partner);
    
    // Check FINSA wallet
    const { data: wallet, error: walletError2 } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partner.id)
      .single();
      
    if (walletError2 && walletError2.code !== 'PGRST116') {
      console.error('Error checking FINSA wallet:', walletError2);
    } else if (wallet) {
      console.log('✅ Found FINSA wallet:', wallet);
    } else {
      console.log('❌ No wallet found for FINSA partner');
    }
  } else {
    console.log('❌ FINSA partner not found');
  }
  
  // Check recent NCBA transactions to see the pattern
  console.log('\n🔍 Recent NCBA transactions (last 10):');
  const { data: recentTx, error: recentError } = await supabase
    .from('c2b_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (recentError) {
    console.error('Error checking recent transactions:', recentError);
  } else if (recentTx) {
    recentTx.forEach(tx => {
      console.log(`- ${tx.transaction_id}: ${tx.bill_ref_number} ${tx.narrative || 'N/A'} - ${tx.trans_amount}`);
    });
  }
}

checkTransaction().catch(console.error);
