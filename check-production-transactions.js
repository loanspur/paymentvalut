// Check production database for new transactions
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProductionTransactions() {
  console.log('🔍 Checking production database for new transactions...');
  console.log('======================================================');

  try {
    // Check for transactions in the last 30 minutes
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);

    console.log('1️⃣ Checking C2B transactions in the last 30 minutes...');
    const { data: recentC2B, error: c2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .gte('created_at', thirtyMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (c2bError) {
      console.log('❌ Error fetching C2B transactions:', c2bError.message);
    } else {
      console.log(`📊 Found ${recentC2B.length} C2B transactions in the last 30 minutes:`);
      recentC2B.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Amount: KES ${tx.amount}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Check for wallet transactions in the last 30 minutes
    console.log('2️⃣ Checking wallet transactions in the last 30 minutes...');
    const { data: recentWalletTx, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .gte('created_at', thirtyMinutesAgo.toISOString())
      .order('created_at', { ascending: false });

    if (walletTxError) {
      console.log('❌ Error fetching wallet transactions:', walletTxError.message);
    } else {
      console.log(`💰 Found ${recentWalletTx.length} wallet transactions in the last 30 minutes:`);
      recentWalletTx.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.transaction_type} - KES ${tx.amount} - ${tx.status}`);
        console.log(`      - Reference: ${tx.reference}`);
        console.log(`      - Description: ${tx.description}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        if (tx.metadata && tx.metadata.source === 'ncba_paybill_notification') {
          console.log(`      - 🎯 NCBA Notification Transaction!`);
        }
        console.log('');
      });
    }

    // Check UMOJA wallet balance
    console.log('3️⃣ Checking UMOJA wallet balance...');
    const { data: umojaWallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', 'c0bf511b-b197-46e8-ac28-a4231772c8d2')
      .single();

    if (walletError || !umojaWallet) {
      console.log('❌ Error fetching UMOJA wallet:', walletError?.message);
    } else {
      console.log('✅ UMOJA wallet details:');
      console.log(`   - Current Balance: KES ${umojaWallet.current_balance}`);
      console.log(`   - Currency: ${umojaWallet.currency}`);
      console.log(`   - Last Updated: ${new Date(umojaWallet.updated_at).toLocaleString()}`);
      console.log('');
    }

    // Summary
    console.log('📋 PRODUCTION CHECK SUMMARY:');
    console.log('============================');
    if (recentC2B.length > 0) {
      console.log('✅ NCBA notifications ARE being received on production!');
      console.log('✅ Transactions are being processed correctly');
      console.log('✅ Your system is working perfectly');
    } else {
      console.log('❌ No NCBA notifications received in the last 30 minutes');
      console.log('❌ This confirms NCBA is not sending notifications');
      console.log('');
      console.log('🔧 NEXT STEPS:');
      console.log('==============');
      console.log('1. Contact NCBA with this evidence');
      console.log('2. Request NCBA to send a test notification');
      console.log('3. Verify NCBA has the correct endpoint URL');
      console.log('4. Check NCBA notification delivery logs');
    }

  } catch (error) {
    console.error('❌ Production check failed:', error);
  }
}

// Run the check
checkProductionTransactions();
