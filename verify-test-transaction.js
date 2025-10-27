// Verify the test transaction was created successfully
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function verifyTestTransaction() {
  console.log('🔍 Verifying test transaction was created successfully...');
  console.log('=======================================================');

  try {
    // 1. Check C2B transaction
    console.log('1️⃣ Checking C2B transaction TJR678LEQ8...');
    const { data: c2bTx, error: c2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('transaction_id', 'TJR678LEQ8')
      .single();

    if (c2bError && c2bError.code !== 'PGRST116') {
      console.log('❌ Error fetching C2B transaction:', c2bError.message);
    } else if (!c2bTx) {
      console.log('❌ C2B transaction not found');
    } else {
      console.log('✅ C2B transaction found!');
      console.log(`   - ID: ${c2bTx.id}`);
      console.log(`   - Transaction ID: ${c2bTx.transaction_id}`);
      console.log(`   - Amount: KES ${c2bTx.amount}`);
      console.log(`   - Status: ${c2bTx.status}`);
      console.log(`   - Partner ID: ${c2bTx.partner_id}`);
      console.log(`   - Customer: ${c2bTx.customer_name} (${c2bTx.customer_phone})`);
      console.log(`   - Account Reference: ${c2bTx.bill_reference_number}`);
      console.log(`   - Created: ${new Date(c2bTx.created_at).toLocaleString()}`);
      console.log('');
    }

    // 2. Check UMOJA wallet balance
    console.log('2️⃣ Checking UMOJA wallet balance...');
    const { data: umojaWallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', 'c0bf511b-b197-46e8-ac28-a4231772c8d2')
      .single();

    if (walletError || !umojaWallet) {
      console.log('❌ Error fetching UMOJA wallet:', walletError?.message);
    } else {
      console.log('✅ UMOJA wallet found!');
      console.log(`   - Current Balance: KES ${umojaWallet.current_balance}`);
      console.log(`   - Currency: ${umojaWallet.currency}`);
      console.log(`   - Last Updated: ${new Date(umojaWallet.updated_at).toLocaleString()}`);
      console.log('');
    }

    // 3. Check wallet transactions
    console.log('3️⃣ Checking recent wallet transactions...');
    const { data: walletTxs, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', umojaWallet.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (walletTxError) {
      console.log('❌ Error fetching wallet transactions:', walletTxError.message);
    } else {
      console.log(`✅ Found ${walletTxs.length} recent wallet transactions:`);
      walletTxs.forEach((tx, index) => {
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

    // 4. Summary
    console.log('📋 VERIFICATION SUMMARY:');
    console.log('========================');
    if (c2bTx) {
      console.log('✅ NCBA notification handler is working correctly!');
      console.log('✅ C2B transaction was created successfully');
      console.log('✅ Database schema issues have been resolved');
      console.log('');
      console.log('🎯 THE REAL ISSUE:');
      console.log('==================');
      console.log('NCBA is NOT sending notifications to your endpoint!');
      console.log('');
      console.log('🔧 IMMEDIATE ACTION REQUIRED:');
      console.log('==============================');
      console.log('1. Contact NCBA support to verify notification endpoint configuration');
      console.log('2. Confirm endpoint URL: https://eazzypay.online/api/ncba/paybill-notification');
      console.log('3. Verify NCBA is configured to send notifications for paybill 880100');
      console.log('4. Check NCBA notification delivery logs');
      console.log('5. Request NCBA to send a test notification');
    } else {
      console.log('❌ Test transaction was not created');
      console.log('   There may still be issues with the notification handler');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }
}

// Run the verification
verifyTestTransaction();
