const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateIssues() {
  console.log('🔍 Investigating Umoja and Kulman issues...\n');
  
  // 1. Check Umoja recent top-up TJR678MQ1J
  console.log('=== UMOJA TOP-UP INVESTIGATION ===');
  const { data: umojaTx, error: umojaError } = await supabase
    .from('c2b_transactions')
    .select('*')
    .eq('transaction_id', 'TJR678MQ1J')
    .single();
    
  if (umojaTx) {
    console.log('✅ Umoja transaction found:', umojaTx.transaction_id);
    console.log('- Amount:', umojaTx.amount);
    console.log('- Partner ID:', umojaTx.partner_id);
    console.log('- Status:', umojaTx.status);
    console.log('- Created:', umojaTx.created_at);
    
    // Check if wallet transaction was created
    const { data: umojaWalletTx, error: umojaWalletError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('reference', 'TJR678MQ1J')
      .single();
      
    if (umojaWalletTx) {
      console.log('✅ Wallet transaction found:', umojaWalletTx.id);
      console.log('- Amount:', umojaWalletTx.amount);
      console.log('- Status:', umojaWalletTx.status);
    } else {
      console.log('❌ No wallet transaction found for TJR678MQ1J');
    }
    
    // Check Umoja wallet balance
    const { data: umojaWallet, error: umojaWalletError2 } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', umojaTx.partner_id)
      .single();
      
    if (umojaWallet) {
      console.log('✅ Umoja wallet balance:', umojaWallet.current_balance);
      console.log('- Last top-up date:', umojaWallet.last_topup_date);
      console.log('- Last top-up amount:', umojaWallet.last_topup_amount);
      
      // Check if wallet balance needs to be updated
      if (umojaWallet.current_balance === 995 && umojaTx.amount === 5) {
        console.log('🔧 ISSUE: Wallet balance should be 1000 (995 + 5)');
        
        // Update wallet balance
        const newBalance = umojaWallet.current_balance + umojaTx.amount;
        const { error: updateError } = await supabase
          .from('partner_wallets')
          .update({
            current_balance: newBalance,
            last_topup_date: umojaTx.created_at,
            last_topup_amount: umojaTx.amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', umojaWallet.id);
          
        if (updateError) {
          console.error('❌ Error updating Umoja wallet:', updateError);
        } else {
          console.log(`✅ Umoja wallet balance updated: ${umojaWallet.current_balance} -> ${newBalance}`);
        }
      }
    }
  } else {
    console.log('❌ Umoja transaction TJR678MQ1J not found');
  }
  
  console.log('\n=== KULMAN DISBURSEMENT INVESTIGATION ===');
  
  // 2. Check Kulman partner
  const { data: kulmanPartner, error: kulmanPartnerError } = await supabase
    .from('partners')
    .select('*')
    .ilike('short_code', 'KGL')
    .single();
    
  if (kulmanPartner) {
    console.log('✅ Kulman partner found:', kulmanPartner.name);
    
    // Check Kulman wallet
    const { data: kulmanWallet, error: kulmanWalletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', kulmanPartner.id)
      .single();
      
    if (kulmanWallet) {
      console.log('✅ Kulman wallet balance:', kulmanWallet.current_balance);
      
      // Check wallet transactions for disbursements
      const { data: kulmanWalletTx, error: kulmanWalletTxError } = await supabase
        .from('wallet_transactions')
        .select('transaction_type, amount, status, created_at')
        .eq('wallet_id', kulmanWallet.id)
        .eq('transaction_type', 'disbursement')
        .limit(10);
        
      if (kulmanWalletTx && kulmanWalletTx.length > 0) {
        console.log(`✅ Found ${kulmanWalletTx.length} disbursement wallet transactions:`);
        kulmanWalletTx.forEach(tx => {
          console.log(`- ${tx.created_at}: ${tx.amount} (${tx.status})`);
        });
      } else {
        console.log('❌ No disbursement wallet transactions found for Kulman');
      }
      
      // Check all wallet transactions to see what types exist
      const { data: allKulmanTx, error: allKulmanTxError } = await supabase
        .from('wallet_transactions')
        .select('transaction_type')
        .eq('wallet_id', kulmanWallet.id);
        
      if (allKulmanTx) {
        const txTypes = {};
        allKulmanTx.forEach(tx => {
          txTypes[tx.transaction_type] = (txTypes[tx.transaction_type] || 0) + 1;
        });
        
        console.log('📊 Kulman wallet transaction types:');
        Object.entries(txTypes).forEach(([type, count]) => {
          console.log(`- ${type}: ${count} transactions`);
        });
      }
    }
    
    // Check C2B transactions for Kulman
    const { data: kulmanC2bTx, error: kulmanC2bError } = await supabase
      .from('c2b_transactions')
      .select('transaction_type, amount, status, created_at')
      .eq('partner_id', kulmanPartner.id)
      .eq('transaction_type', 'disbursement')
      .limit(10);
      
    if (kulmanC2bTx && kulmanC2bTx.length > 0) {
      console.log(`✅ Found ${kulmanC2bTx.length} disbursement C2B transactions:`);
      kulmanC2bTx.forEach(tx => {
        console.log(`- ${tx.created_at}: ${tx.amount} (${tx.status})`);
      });
    } else {
      console.log('❌ No disbursement C2B transactions found for Kulman');
    }
    
    // Check all C2B transactions for Kulman to see what types exist
    const { data: allKulmanC2bTx, error: allKulmanC2bError } = await supabase
      .from('c2b_transactions')
      .select('transaction_type')
      .eq('partner_id', kulmanPartner.id);
      
    if (allKulmanC2bTx) {
      const c2bTxTypes = {};
      allKulmanC2bTx.forEach(tx => {
        c2bTxTypes[tx.transaction_type] = (c2bTxTypes[tx.transaction_type] || 0) + 1;
      });
      
      console.log('📊 Kulman C2B transaction types:');
      Object.entries(c2bTxTypes).forEach(([type, count]) => {
        console.log(`- ${type}: ${count} transactions`);
      });
    }
  }
}

investigateIssues().catch(console.error);
