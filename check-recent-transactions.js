// Check for recent transactions that might be the KES 2.00 and KES 3.00 transactions
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkRecentTransactions() {
  console.log('🔍 Checking for recent transactions (KES 2.00 and KES 3.00)...');
  console.log('============================================================');

  try {
    // Check for transactions in the last 2 hours
    const twoHoursAgo = new Date();
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);

    console.log('1️⃣ Checking all C2B transactions in the last 2 hours...');
    const { data: recentC2B, error: c2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .gte('created_at', twoHoursAgo.toISOString())
      .order('created_at', { ascending: false });

    if (c2bError) {
      console.log('❌ Error fetching C2B transactions:', c2bError.message);
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

    // Check for transactions with specific amounts
    console.log('2️⃣ Checking for transactions with amounts KES 2.00 and KES 3.00...');
    const { data: amount2Tx, error: amount2Error } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('amount', 2.00)
      .order('created_at', { ascending: false });

    const { data: amount3Tx, error: amount3Error } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('amount', 3.00)
      .order('created_at', { ascending: false });

    if (amount2Error) {
      console.log('❌ Error fetching KES 2.00 transactions:', amount2Error.message);
    } else if (amount2Tx && amount2Tx.length > 0) {
      console.log(`📊 Found ${amount2Tx.length} transaction(s) with amount KES 2.00:`);
      amount2Tx.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('❌ No transactions found with amount KES 2.00');
    }

    if (amount3Error) {
      console.log('❌ Error fetching KES 3.00 transactions:', amount3Error.message);
    } else if (amount3Tx && amount3Tx.length > 0) {
      console.log(`📊 Found ${amount3Tx.length} transaction(s) with amount KES 3.00:`);
      amount3Tx.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    } else {
      console.log('❌ No transactions found with amount KES 3.00');
    }

    // Check for transactions with UMOJA account reference
    console.log('3️⃣ Checking for transactions with UMOJA account reference...');
    const { data: umojaTx, error: umojaError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .ilike('bill_reference_number', '%UMOJA%')
      .order('created_at', { ascending: false });

    if (umojaError) {
      console.log('❌ Error fetching UMOJA transactions:', umojaError.message);
    } else {
      console.log(`📊 Found ${umojaTx.length} transaction(s) with UMOJA account reference:`);
      umojaTx.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
        console.log(`      - Amount: KES ${tx.amount}`);
        console.log(`      - Status: ${tx.status}`);
        console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
        console.log(`      - Account Reference: ${tx.bill_reference_number}`);
        console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // Summary
    console.log('📋 RECENT TRANSACTIONS SUMMARY:');
    console.log('==============================');
    console.log('');
    console.log('🔍 ANALYSIS:');
    console.log('============');
    if (recentC2B.length === 1) {
      console.log('✅ Only 1 transaction found (the successful KES 6.00)');
      console.log('❌ KES 2.00 and KES 3.00 transactions are NOT in the database');
      console.log('');
      console.log('🎯 POSSIBLE REASONS:');
      console.log('====================');
      console.log('1. Different account reference format used');
      console.log('2. Different phone number used');
      console.log('3. NCBA notification delivery delay');
      console.log('4. NCBA notification failed to send');
      console.log('5. Different business short code used');
      console.log('');
      console.log('💡 RECOMMENDATIONS:');
      console.log('===================');
      console.log('1. Use EXACTLY: Account Reference "774451 UMOJA"');
      console.log('2. Use EXACTLY: Phone Number 254727638940');
      console.log('3. Use EXACTLY: Business Short Code 880100');
      console.log('4. Wait 10-15 minutes for NCBA notification');
      console.log('5. Check M-Pesa SMS for exact transaction reference');
    } else {
      console.log(`✅ Found ${recentC2B.length} transactions - some may be your test transactions`);
    }

  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

// Run the check
checkRecentTransactions();
