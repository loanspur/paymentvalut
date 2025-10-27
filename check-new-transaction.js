// Check if the new NCBA notification was processed correctly
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkNewTransaction() {
  console.log('🔍 Checking new NCBA transaction processing...');
  console.log('==============================================');
  console.log('New transaction details:');
  console.log('- Amount: KES 6.00');
  console.log('- Account Reference: 774451 UMOJA');
  console.log('- Customer: JUSTUS MURENGA (072****940)');
  console.log('- M-Pesa Ref: TJR678LEQ8');
  console.log('- Time: 27/10/2025 04:50 PM');
  console.log('');

  try {
    // 1. Check for the new C2B transaction
    console.log('1️⃣ Checking for C2B transaction with M-Pesa reference TJR678LEQ8...');
    const { data: newC2BTransaction, error: c2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('transaction_id', 'TJR678LEQ8')
      .single();

    if (c2bError && c2bError.code !== 'PGRST116') {
      console.log('❌ Error fetching new C2B transaction:', c2bError.message);
    } else if (!newC2BTransaction) {
      console.log('❌ New C2B transaction not found yet');
      console.log('   This could mean:');
      console.log('   1. NCBA notification hasn\'t been received yet');
      console.log('   2. Notification processing failed');
      console.log('   3. There\'s still an issue with the notification handler');
    } else {
      console.log('✅ New C2B transaction found!');
      console.log(`   - Transaction ID: ${newC2BTransaction.transaction_id}`);
      console.log(`   - Amount: KES ${newC2BTransaction.transaction_amount}`);
      console.log(`   - Status: ${newC2BTransaction.status}`);
      console.log(`   - Account Reference: ${newC2BTransaction.bill_reference_number}`);
      console.log(`   - Customer: ${newC2BTransaction.customer_name} (${newC2BTransaction.customer_phone})`);
      console.log(`   - Partner ID: ${newC2BTransaction.partner_id || 'Not allocated'}`);
      console.log(`   - Created: ${new Date(newC2BTransaction.created_at).toLocaleString()}`);
      console.log('');
    }

    // 2. Check all recent C2B transactions (last 2 hours)
    console.log('2️⃣ Checking all recent C2B transactions (last 2 hours)...');
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
    
    const { data: recentC2B, error: recentC2BError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (recentC2BError) {
      console.log('❌ Error fetching recent C2B transactions:', recentC2BError.message);
    } else {
      console.log(`📊 Found ${recentC2B.length} C2B transactions in the last 2 hours:`);
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

    // 3. Check UMOJA wallet balance
    console.log('3️⃣ Checking UMOJA wallet balance...');
    const { data: umojaWallet, error: umojaWalletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', 'c0bf511b-b197-46e8-ac28-a4231772c8d2')
      .single();

    if (umojaWalletError || !umojaWallet) {
      console.log('❌ Error fetching UMOJA wallet:', umojaWalletError?.message);
    } else {
      console.log('✅ UMOJA wallet details:');
      console.log(`   - Current Balance: KES ${umojaWallet.current_balance}`);
      console.log(`   - Currency: ${umojaWallet.currency}`);
      console.log(`   - Last Updated: ${new Date(umojaWallet.updated_at).toLocaleString()}`);
      console.log('');
    }

    // 4. Check recent wallet transactions for UMOJA
    console.log('4️⃣ Checking recent wallet transactions for UMOJA...');
    const { data: recentWalletTx, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('wallet_id', umojaWallet.id)
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (walletTxError) {
      console.log('❌ Error fetching recent wallet transactions:', walletTxError.message);
    } else {
      console.log(`💰 Found ${recentWalletTx.length} recent wallet transactions for UMOJA:`);
      recentWalletTx.forEach((tx, index) => {
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

    // 5. Check for transactions with KES 6.00 amount
    console.log('5️⃣ Checking for transactions with KES 6.00 amount...');
    const { data: sixKesTransactions, error: sixKesError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('transaction_amount', 6.00)
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (!sixKesError && sixKesTransactions.length > 0) {
      console.log(`📊 Found ${sixKesTransactions.length} transactions with amount KES 6.00:`);
      sixKesTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('❌ No transactions found with amount KES 6.00');
    }

    // 6. Summary and Analysis
    console.log('📋 ANALYSIS SUMMARY:');
    console.log('===================');
    
    if (newC2BTransaction) {
      console.log('✅ SUCCESS: New NCBA notification was processed!');
      console.log(`   - C2B transaction created: ${newC2BTransaction.transaction_id}`);
      console.log(`   - Status: ${newC2BTransaction.status}`);
      console.log(`   - Partner allocated: ${newC2BTransaction.partner_id ? 'Yes' : 'No'}`);
      
      if (newC2BTransaction.status === 'completed') {
        console.log('✅ Wallet should have been credited automatically');
      } else {
        console.log('⚠️  Transaction created but status is not completed');
      }
    } else {
      console.log('❌ ISSUE: New NCBA notification was NOT processed');
      console.log('   Possible causes:');
      console.log('   1. NCBA notification not received by endpoint');
      console.log('   2. Notification processing failed');
      console.log('   3. Hash validation failed');
      console.log('   4. Other validation errors');
    }

    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('==============');
    if (!newC2BTransaction) {
      console.log('1. Check server logs for NCBA notification processing errors');
      console.log('2. Verify NCBA notification endpoint is accessible');
      console.log('3. Test notification handler with correct hash validation');
      console.log('4. Check if NCBA is actually sending notifications to your endpoint');
    } else {
      console.log('1. Monitor if wallet balance increases');
      console.log('2. Check if wallet transactions are created');
      console.log('3. Verify the complete flow is working');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
checkNewTransaction();
