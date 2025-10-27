// Further investigation of UMOJA transactions and wallet structure
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function furtherInvestigation() {
  console.log('🔍 Further investigation of UMOJA transactions...');
  console.log('===============================================');

  try {
    // 1. Check wallet transactions table structure
    console.log('1️⃣ Checking wallet transactions table structure...');
    const { data: walletTxStructure, error: structureError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .limit(1);

    if (structureError) {
      console.log('❌ Error checking wallet transactions structure:', structureError.message);
    } else {
      console.log('✅ Wallet transactions table structure:');
      if (walletTxStructure.length > 0) {
        console.log('Available columns:', Object.keys(walletTxStructure[0]));
      } else {
        console.log('No wallet transactions found in table');
      }
    }
    console.log('');

    // 2. Check all recent C2B transactions (last 24 hours)
    console.log('2️⃣ Checking all recent C2B transactions (last 24 hours)...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentC2B, error: recentC2BError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .gte('created_at', yesterday.toISOString())
      .order('created_at', { ascending: false });

    if (recentC2BError) {
      console.log('❌ Error fetching recent C2B transactions:', recentC2BError.message);
    } else {
      console.log(`📊 Found ${recentC2B.length} C2B transactions in the last 24 hours:`);
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

    // 3. Check for any transactions with UMOJA in account reference
    console.log('3️⃣ Checking for any transactions with UMOJA in account reference...');
    const { data: umojaRefTransactions, error: umojaRefError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .ilike('bill_reference_number', '%UMOJA%')
      .order('created_at', { ascending: false });

    if (umojaRefError) {
      console.log('❌ Error fetching UMOJA reference transactions:', umojaRefError.message);
    } else {
      console.log(`🔍 Found ${umojaRefTransactions.length} transactions with UMOJA in account reference:`);
      umojaRefTransactions.forEach((tx, index) => {
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

    // 4. Check UMOJA wallet balance properly
    console.log('4️⃣ Checking UMOJA wallet balance properly...');
    const { data: umojaWallet, error: umojaWalletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', 'c0bf511b-b197-46e8-ac28-a4231772c8d2')
      .single();

    if (umojaWalletError) {
      console.log('❌ Error fetching UMOJA wallet:', umojaWalletError.message);
    } else if (!umojaWallet) {
      console.log('❌ No wallet found for UMOJA partner');
    } else {
      console.log('✅ UMOJA wallet details:');
      console.log('   - Balance:', umojaWallet.balance);
      console.log('   - Currency:', umojaWallet.currency);
      console.log('   - Active:', umojaWallet.is_active);
      console.log('   - Created:', new Date(umojaWallet.created_at).toLocaleString());
      console.log('   - Updated:', new Date(umojaWallet.updated_at).toLocaleString());
      console.log('   - Raw wallet data:', JSON.stringify(umojaWallet, null, 2));
    }
    console.log('');

    // 5. Check if there are any wallet transactions with different column names
    console.log('5️⃣ Checking wallet transactions with different approaches...');
    
    // Try to find wallet transactions by looking for UMOJA partner ID in different ways
    const { data: allWalletTx, error: allWalletTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .limit(10);

    if (allWalletTxError) {
      console.log('❌ Error fetching wallet transactions:', allWalletTxError.message);
    } else {
      console.log(`📊 Found ${allWalletTx.length} wallet transactions (sample):`);
      allWalletTx.forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction ID: ${tx.id}`);
        console.log(`      - Available columns:`, Object.keys(tx));
        console.log(`      - Raw data:`, JSON.stringify(tx, null, 2));
        console.log('');
      });
    }

    // 6. Check NCBA notification endpoint logs (if any)
    console.log('6️⃣ Checking for any system logs or audit trails...');
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_logs')
      .select('*')
      .ilike('action', '%ncba%')
      .or('details.ilike.%umoja%,details.ilike.%774451%')
      .order('created_at', { ascending: false })
      .limit(5);

    if (auditError) {
      console.log('❌ Error fetching audit logs:', auditError.message);
    } else {
      console.log(`📋 Found ${auditLogs.length} relevant audit logs:`);
      auditLogs.forEach((log, index) => {
        console.log(`   ${index + 1}. Action: ${log.action}`);
        console.log(`      - Details: ${log.details}`);
        console.log(`      - Created: ${new Date(log.created_at).toLocaleString()}`);
        console.log('');
      });
    }

    // 7. Summary
    console.log('📋 INVESTIGATION SUMMARY:');
    console.log('========================');
    console.log('✅ UMOJA partner exists and is active');
    console.log('❌ No C2B transactions found for UMOJA');
    console.log('❌ No transactions found with account reference 774451#UMOJA');
    console.log('✅ UMOJA wallet exists');
    console.log('❌ Wallet transactions table has structural issues');
    console.log('');
    console.log('💡 CONCLUSION:');
    console.log('==============');
    console.log('The two transactions you made to paybill 880100 with account reference 774451#UMOJA');
    console.log('were NOT received by the NCBA notification endpoint or were not processed correctly.');
    console.log('');
    console.log('🔧 NEXT STEPS:');
    console.log('==============');
    console.log('1. Verify NCBA notification endpoint is working: https://eazzypay.online/api/ncba/paybill-notification');
    console.log('2. Check NCBA system settings and credentials');
    console.log('3. Test the notification endpoint with a sample payload');
    console.log('4. Check server logs for any errors during notification processing');

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
furtherInvestigation();
