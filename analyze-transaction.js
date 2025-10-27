const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeTransaction() {
  console.log('🔍 Analyzing transaction TJR678MIPX...');
  
  const { data: tx, error } = await supabase
    .from('c2b_transactions')
    .select('*')
    .eq('transaction_id', 'TJR678MIPX')
    .single();
    
  if (tx) {
    console.log('📋 Transaction Details:');
    console.log('- Transaction ID:', tx.transaction_id);
    console.log('- Amount:', tx.amount);
    console.log('- Customer:', tx.customer_name);
    console.log('- Phone:', tx.customer_phone);
    console.log('- Bill Reference Number:', tx.bill_reference_number);
    console.log('- Business Short Code:', tx.business_short_code);
    console.log('- Partner ID:', tx.partner_id);
    console.log('- Status:', tx.status);
    
    console.log('\n📋 Raw Notification Data:');
    const raw = tx.raw_notification;
    console.log('- BillRefNumber:', raw.BillRefNumber);
    console.log('- Narrative:', raw.Narrative);
    console.log('- BusinessShortCode:', raw.BusinessShortCode);
    console.log('- TransAmount:', raw.TransAmount);
    
    // Check if partner exists
    if (tx.partner_id) {
      const { data: partner, error: partnerError } = await supabase
        .from('partners')
        .select('*')
        .eq('id', tx.partner_id)
        .single();
        
      if (partner) {
        console.log('\n✅ Partner Found:', partner.name, '(' + partner.short_code + ')');
        
        // Check wallet
        const { data: wallet, error: walletError } = await supabase
          .from('partner_wallets')
          .select('*')
          .eq('partner_id', partner.id)
          .single();
          
        if (wallet) {
          console.log('✅ Wallet Found - Balance:', wallet.current_balance);
        } else {
          console.log('❌ No wallet found for partner');
        }
      } else {
        console.log('❌ Partner not found for ID:', tx.partner_id);
      }
    } else {
      console.log('❌ No partner_id assigned to transaction');
    }
    
    // Check if wallet transaction was created
    const { data: walletTx, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('reference', tx.transaction_id)
      .limit(5);
      
    if (walletTx && walletTx.length > 0) {
      console.log('\n✅ Wallet transactions found:', walletTx.length);
      walletTx.forEach(wt => {
        console.log(`- ${wt.transaction_type}: ${wt.amount} (${wt.status})`);
      });
    } else {
      console.log('\n❌ No wallet transactions found for this transaction');
    }
  }
}

analyzeTransaction().catch(console.error);
