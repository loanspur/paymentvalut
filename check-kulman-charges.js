const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKulmanCharges() {
  console.log('🔍 Checking Kulman charge transactions metadata...');
  
  // Get Kulman partner
  const { data: kulmanPartner, error: kulmanPartnerError } = await supabase
    .from('partners')
    .select('*')
    .ilike('short_code', 'KGL')
    .single();
    
  if (!kulmanPartner) {
    console.log('❌ Kulman partner not found');
    return;
  }
  
  // Get Kulman wallet
  const { data: kulmanWallet, error: kulmanWalletError } = await supabase
    .from('partner_wallets')
    .select('*')
    .eq('partner_id', kulmanPartner.id)
    .single();
    
  if (!kulmanWallet) {
    console.log('❌ Kulman wallet not found');
    return;
  }
  
  // Get some charge transactions to see their metadata
  const { data: chargeTx, error: chargeError } = await supabase
    .from('wallet_transactions')
    .select('transaction_type, amount, description, metadata, created_at')
    .eq('wallet_id', kulmanWallet.id)
    .eq('transaction_type', 'charge')
    .limit(10);
    
  if (chargeTx && chargeTx.length > 0) {
    console.log(`📋 Sample Kulman charge transactions (${chargeTx.length} shown):`);
    chargeTx.forEach((tx, index) => {
      console.log(`\n${index + 1}. Amount: ${tx.amount}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Metadata:`, JSON.stringify(tx.metadata, null, 2));
      console.log(`   Created: ${tx.created_at}`);
    });
  } else {
    console.log('❌ No charge transactions found for Kulman');
  }
}

checkKulmanCharges().catch(console.error);
