require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkWalletTransactions() {
  console.log('🔍 Checking wallet transactions...');
  
  // Get recent wallet transactions
  const { data: walletTransactions, error } = await supabase
    .from('wallet_transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('💰 Recent wallet transactions:');
  walletTransactions.forEach(wt => {
    console.log(`- ${wt.id}: partner_id=${wt.partner_id}, amount=${wt.amount}, type=${wt.transaction_type}, status=${wt.status}`);
  });
  
  // Check if wallet transactions exist for recent C2B transactions
  const { data: c2bTransactions, error: c2bError } = await supabase
    .from('c2b_transactions')
    .select('id, transaction_id, partner_id, amount')
    .order('created_at', { ascending: false })
    .limit(3);
    
  if (c2bError) {
    console.error('C2B Error:', c2bError);
    return;
  }
  
  console.log('\n🔗 Checking wallet transactions for recent C2B transactions:');
  for (const c2b of c2bTransactions) {
    const { data: walletTx, error: walletError } = await supabase
      .from('wallet_transactions')
      .select('id, amount, status')
      .eq('reference', c2b.transaction_id)
      .single();
      
    if (walletError && walletError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error(`Wallet transaction error for ${c2b.transaction_id}:`, walletError);
    } else if (walletTx) {
      console.log(`✅ ${c2b.transaction_id}: Wallet transaction found (${walletTx.status})`);
    } else {
      console.log(`❌ ${c2b.transaction_id}: No wallet transaction found`);
    }
  }
}

checkWalletTransactions();
