require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateWalletBalances() {
  console.log('🔍 Investigating wallet balance update issues...');
  console.log('===============================================');
  
  // 1. Check recent NCBA transactions
  console.log('\n📊 Recent NCBA Transactions (last 24 hours):');
  const { data: recentTransactions, error: transactionsError } = await supabase
    .from('c2b_transactions')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
    
  if (transactionsError) {
    console.error('Error fetching transactions:', transactionsError);
    return;
  }
  
  console.log(`Found ${recentTransactions?.length || 0} recent transactions`);
  recentTransactions?.forEach(t => {
    console.log(`- ${t.transaction_id}: ${t.amount} KES for partner ${t.partner_id} (${t.status})`);
  });
  
  // 2. Check wallet transactions
  console.log('\n💰 Wallet Transactions (last 24 hours):');
  const { data: walletTransactions, error: walletError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });
    
  if (walletError) {
    console.error('Error fetching wallet transactions:', walletError);
    return;
  }
  
  console.log(`Found ${walletTransactions?.length || 0} wallet transactions`);
  walletTransactions?.forEach(wt => {
    console.log(`- ${wt.reference}: ${wt.amount} KES (${wt.transaction_type}) - ${wt.status}`);
  });
  
  // 3. Check current partner wallet balances
  console.log('\n🏦 Current Partner Wallet Balances:');
  const { data: wallets, error: walletsError } = await supabase
    .from('partner_wallets')
    .select(`
      *,
      partners!inner(name, short_code)
    `)
    .order('current_balance', { ascending: false });
    
  if (walletsError) {
    console.error('Error fetching wallets:', walletsError);
    return;
  }
  
  wallets?.forEach(wallet => {
    console.log(`- ${wallet.partners.name} (${wallet.partners.short_code}): ${wallet.current_balance} KES`);
  });
  
  // 4. Check for UMOJA specifically (since we know there were recent transactions)
  console.log('\n🎯 UMOJA Specific Investigation:');
  const { data: umojaPartner, error: umojaError } = await supabase
    .from('partners')
    .select('*')
    .ilike('short_code', 'umoja')
    .single();
    
  if (umojaPartner) {
    console.log(`UMOJA Partner ID: ${umojaPartner.id}`);
    
    // Check UMOJA wallet
    const { data: umojaWallet, error: umojaWalletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', umojaPartner.id)
      .single();
      
    if (umojaWallet) {
      console.log(`UMOJA Wallet Balance: ${umojaWallet.current_balance} KES`);
      console.log(`UMOJA Wallet Updated At: ${umojaWallet.updated_at}`);
    }
    
    // Check UMOJA wallet transactions
    const { data: umojaWalletTransactions, error: umojaWtError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('partner_id', umojaPartner.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log(`\nUMOJA Wallet Transactions (last 10):`);
    umojaWalletTransactions?.forEach(wt => {
      console.log(`- ${wt.created_at}: ${wt.amount} KES (${wt.transaction_type}) - ${wt.status} - Ref: ${wt.reference}`);
    });
    
    // Check UMOJA C2B transactions
    const { data: umojaC2bTransactions, error: umojaC2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('partner_id', umojaPartner.id)
      .order('created_at', { ascending: false })
      .limit(10);
      
    console.log(`\nUMOJA C2B Transactions (last 10):`);
    umojaC2bTransactions?.forEach(ct => {
      console.log(`- ${ct.created_at}: ${ct.amount} KES - ${ct.status} - Ref: ${ct.transaction_id}`);
    });
  }
  
  // 5. Check if there's a mismatch between C2B and wallet transactions
  console.log('\n🔍 Cross-Reference Analysis:');
  if (recentTransactions && walletTransactions) {
    const c2bIds = recentTransactions.map(t => t.transaction_id);
    const walletRefs = walletTransactions.map(wt => wt.reference);
    
    const missingWalletTransactions = c2bIds.filter(id => !walletRefs.includes(id));
    const missingC2bTransactions = walletRefs.filter(ref => !c2bIds.includes(ref));
    
    console.log(`C2B transactions without wallet transactions: ${missingWalletTransactions.length}`);
    missingWalletTransactions.forEach(id => console.log(`  - ${id}`));
    
    console.log(`Wallet transactions without C2B transactions: ${missingC2bTransactions.length}`);
    missingC2bTransactions.forEach(ref => console.log(`  - ${ref}`));
  }
}

investigateWalletBalances();
