// Check specifically for KES 4.00 transaction
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkKES4Transaction() {
  console.log('🔍 Checking specifically for KES 4.00 transaction...');
  console.log('==================================================');

  try {
    // 1. Check for KES 4.00 transactions
    console.log('1️⃣ Checking for transactions with amount KES 4.00...');
    const { data: amount4Tx, error: amount4Error } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('amount', 4.00)
      .order('created_at', { ascending: false });

    if (amount4Error) {
      console.log('❌ Error fetching KES 4.00 transactions:', amount4Error.message);
    } else if (amount4Tx && amount4Tx.length > 0) {
      console.log(`✅ Found ${amount4Tx.length} transaction(s) with amount KES 4.00:`);
      amount4Tx.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('❌ No transactions found with amount KES 4.00');
    }

    // 2. Check for all transactions in the last 2 hours
    console.log('2️⃣ Checking all C2B transactions in the last 2 hours...');
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    const { data: recentC2B, error: c2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (c2bError) {
      console.log('❌ Error fetching recent C2B transactions:', c2bError.message);
    } else {
      console.log(`📊 Found ${recentC2B.length} C2B transactions in the last 2 hours:`);
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

    // 3. Check for wallet transactions with KES 4.00
    console.log('3️⃣ Checking wallet transactions with KES 4.00...');
    const { data: wallet4Tx, error: wallet4Error } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('amount', 4.00)
      .order('created_at', { ascending: false });

    if (wallet4Error) {
      console.log('❌ Error fetching wallet KES 4.00 transactions:', wallet4Error.message);
    } else if (wallet4Tx && wallet4Tx.length > 0) {
      console.log(`💰 Found ${wallet4Tx.length} wallet transaction(s) with amount KES 4.00:`);
      wallet4Tx.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.transaction_type} - KES ${tx.amount} - ${tx.status}`);
        console.log(`      - Reference: ${tx.reference}`);
        console.log(`      - Description: ${tx.description}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        if (tx.metadata && tx.metadata.source === 'ncba_paybill_notification') {
          console.log(`      - 🎯 NCBA Notification Transaction!`);
        }
        console.log('');
      });
    } else {
      console.log('❌ No wallet transactions found with amount KES 4.00');
    }

    // 4. Check UMOJA wallet balance
    console.log('4️⃣ Checking UMOJA wallet balance...');
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

    // 5. Summary
    console.log('📋 KES 4.00 TRANSACTION CHECK SUMMARY:');
    console.log('======================================');
    
    if (amount4Tx && amount4Tx.length > 0) {
      console.log('✅ KES 4.00 transaction found and processed!');
      console.log('✅ NCBA notifications are working correctly');
    } else {
      console.log('❌ KES 4.00 transaction not found yet');
      console.log('');
      console.log('⏰ POSSIBLE REASONS:');
      console.log('===================');
      console.log('1. NCBA notification delivery delay (can take 5-15 minutes)');
      console.log('2. Different account reference format used');
      console.log('3. Different phone number used');
      console.log('4. NCBA notification failed to send');
      console.log('');
      console.log('💡 RECOMMENDATIONS:');
      console.log('===================');
      console.log('1. Wait 5-10 more minutes');
      console.log('2. Check M-Pesa SMS for exact transaction reference');
      console.log('3. Verify account reference format: "774451 UMOJA"');
      console.log('4. Check if you received NCBA email notification');
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkKES4Transaction();
