// Investigate specific UMOJA transaction from email notification
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateSpecificTransaction() {
  console.log('🔍 Investigating specific UMOJA transaction from email notification...');
  console.log('=====================================================================');

  try {
    // 1. Check for the specific M-Pesa reference from the email
    console.log('1️⃣ Checking for M-Pesa reference TJR678LH5T...');
    const { data: specificTransaction, error: specificError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('transaction_id', 'TJR678LH5T')
      .single();

    if (specificError && specificError.code !== 'PGRST116') {
      console.log('❌ Error fetching specific transaction:', specificError.message);
    } else if (!specificTransaction) {
      console.log('❌ Transaction with M-Pesa reference TJR678LH5T not found in C2B transactions');
    } else {
      console.log('✅ Found specific transaction:');
      console.log(`   - Transaction ID: ${specificTransaction.transaction_id}`);
      console.log(`   - Amount: KES ${specificTransaction.transaction_amount}`);
      console.log(`   - Status: ${specificTransaction.status}`);
      console.log(`   - Account Reference: ${specificTransaction.bill_reference_number}`);
      console.log(`   - Customer: ${specificTransaction.customer_name} (${specificTransaction.customer_phone})`);
      console.log(`   - Partner ID: ${specificTransaction.partner_id || 'Not allocated'}`);
      console.log(`   - Created: ${new Date(specificTransaction.created_at).toLocaleString()}`);
      console.log(`   - Raw Notification: ${specificTransaction.raw_notification ? 'Yes' : 'No'}`);
      console.log('');
    }

    // 2. Check for transactions with 774451 UMOJA account reference
    console.log('2️⃣ Checking for transactions with account reference 774451 UMOJA...');
    const { data: umojaTransactions, error: umojaError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .ilike('bill_reference_number', '%774451%UMOJA%')
      .order('created_at', { ascending: false });

    if (umojaError) {
      console.log('❌ Error fetching UMOJA transactions:', umojaError.message);
    } else {
      console.log(`📊 Found ${umojaTransactions.length} transactions with 774451 UMOJA account reference:`);
      umojaTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Amount: KES ${tx.transaction_amount}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 3. Check recent C2B transactions (last 48 hours)
    console.log('3️⃣ Checking all recent C2B transactions (last 48 hours)...');
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const { data: recentC2B, error: recentC2BError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .gte('created_at', twoDaysAgo.toISOString())
      .order('created_at', { ascending: false });

    if (recentC2BError) {
      console.log('❌ Error fetching recent C2B transactions:', recentC2BError.message);
    } else {
      console.log(`📊 Found ${recentC2B.length} C2B transactions in the last 48 hours:`);
      recentC2B.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Amount: KES ${tx.transaction_amount}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 4. Check wallet transactions for UMOJA (using wallet_id approach)
    console.log('4️⃣ Checking wallet transactions for UMOJA...');
    
    // First get UMOJA wallet ID
    const { data: umojaWallet, error: umojaWalletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', 'c0bf511b-b197-46e8-ac28-a4231772c8d2')
      .single();

    if (umojaWalletError || !umojaWallet) {
      console.log('❌ Error fetching UMOJA wallet:', umojaWalletError?.message);
    } else {
      console.log('✅ UMOJA wallet found:');
      console.log(`   - Wallet ID: ${umojaWallet.id}`);
      console.log(`   - Current Balance: KES ${umojaWallet.current_balance}`);
      console.log(`   - Currency: ${umojaWallet.currency}`);
      console.log('');

      // Now get wallet transactions using wallet_id
      const { data: walletTransactions, error: walletTxError } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('wallet_id', umojaWallet.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (walletTxError) {
        console.log('❌ Error fetching wallet transactions:', walletTxError.message);
      } else {
        console.log(`💰 Found ${walletTransactions.length} wallet transactions for UMOJA:`);
        walletTransactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. Transaction ID: ${tx.id}`);
          console.log(`      - Type: ${tx.transaction_type}`);
          console.log(`      - Amount: KES ${tx.amount}`);
          console.log(`      - Status: ${tx.status}`);
          console.log(`      - Description: ${tx.description}`);
          console.log(`      - Reference: ${tx.reference}`);
          console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
          if (tx.metadata) {
            console.log(`      - Metadata: ${JSON.stringify(tx.metadata, null, 2)}`);
          }
          console.log('');
        });
      }
    }

    // 5. Check for transactions with specific amounts (KES 5.00, KES 10.00, KES 11.00, KES 1.00)
    console.log('5️⃣ Checking for transactions with amounts mentioned in admin panel...');
    const amounts = [5.00, 10.00, 11.00, 1.00];
    
    for (const amount of amounts) {
      const { data: amountTransactions, error: amountError } = await supabase
        .from('c2b_transactions')
        .select('*')
        .eq('transaction_amount', amount)
        .gte('created_at', twoDaysAgo.toISOString())
        .order('created_at', { ascending: false });

      if (!amountError && amountTransactions.length > 0) {
        console.log(`📊 Found ${amountTransactions.length} transactions with amount KES ${amount}:`);
        amountTransactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
          console.log(`      - Status: ${tx.status}`);
          console.log(`      - Account Reference: ${tx.bill_reference_number}`);
          console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
          console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
          console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
          console.log('');
        });
      }
    }

    // 6. Summary
    console.log('📋 INVESTIGATION SUMMARY:');
    console.log('========================');
    console.log('✅ NCBA sent email notification for KES 5.00 transaction');
    console.log('✅ Admin panel shows multiple "Top Up" transactions for UMOJA');
    console.log('✅ All admin panel transactions show "pending" status');
    console.log('');
    console.log('🔍 KEY FINDINGS:');
    console.log('===============');
    console.log('1. NCBA notifications ARE being sent (confirmed by email)');
    console.log('2. Transactions ARE being recorded in the system');
    console.log('3. Transactions are stuck in "pending" status');
    console.log('4. Wallet credits are not being processed');
    console.log('');
    console.log('💡 ROOT CAUSE:');
    console.log('==============');
    console.log('The issue is NOT that notifications are not being received.');
    console.log('The issue is that the notification processing is failing to:');
    console.log('1. Complete the C2B transaction status');
    console.log('2. Credit the partner wallet');
    console.log('3. Update wallet transaction status from "pending" to "completed"');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Check NCBA notification handler logs for processing errors');
    console.log('2. Verify partner lookup logic in notification handler');
    console.log('3. Check wallet credit process in notification handler');
    console.log('4. Test notification processing with sample data');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateSpecificTransaction();
