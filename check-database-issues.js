// Check database issues with NCBA notification processing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkDatabaseIssues() {
  console.log('🔍 Checking database issues with NCBA notification processing...');
  console.log('==============================================================');

  try {
    // 1. Check if the transaction already exists
    console.log('1️⃣ Checking if transaction TJR678LEQ8 already exists...');
    const { data: existingTx, error: existingError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('transaction_id', 'TJR678LEQ8')
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.log('❌ Error checking existing transaction:', existingError.message);
    } else if (existingTx) {
      console.log('✅ Transaction already exists:');
      console.log(`   - ID: ${existingTx.id}`);
      console.log(`   - Amount: KES ${existingTx.transaction_amount}`);
      console.log(`   - Status: ${existingTx.status}`);
      console.log(`   - Partner ID: ${existingTx.partner_id || 'Not allocated'}`);
      console.log(`   - Created: ${new Date(existingTx.created_at).toLocaleString()}`);
      console.log('');
    } else {
      console.log('✅ No existing transaction found (good for testing)');
      console.log('');
    }

    // 2. Check UMOJA partner
    console.log('2️⃣ Checking UMOJA partner...');
    const { data: umojaPartner, error: umojaError } = await supabase
      .from('partners')
      .select('*')
      .eq('short_code', 'UMOJA')
      .eq('is_active', true)
      .single();

    if (umojaError || !umojaPartner) {
      console.log('❌ UMOJA partner not found:', umojaError?.message);
      return;
    } else {
      console.log('✅ UMOJA partner found:');
      console.log(`   - ID: ${umojaPartner.id}`);
      console.log(`   - Name: ${umojaPartner.name}`);
      console.log(`   - Short Code: ${umojaPartner.short_code}`);
      console.log(`   - Active: ${umojaPartner.is_active}`);
      console.log('');
    }

    // 3. Check UMOJA wallet
    console.log('3️⃣ Checking UMOJA wallet...');
    const { data: umojaWallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', umojaPartner.id)
      .single();

    if (walletError || !umojaWallet) {
      console.log('❌ UMOJA wallet not found:', walletError?.message);
      return;
    } else {
      console.log('✅ UMOJA wallet found:');
      console.log(`   - ID: ${umojaWallet.id}`);
      console.log(`   - Current Balance: KES ${umojaWallet.current_balance}`);
      console.log(`   - Currency: ${umojaWallet.currency}`);
      console.log(`   - Last Updated: ${new Date(umojaWallet.updated_at).toLocaleString()}`);
      console.log('');
    }

    // 4. Test creating a C2B transaction manually
    console.log('4️⃣ Testing C2B transaction creation...');
    const testC2BData = {
      transaction_id: 'TEST_' + Date.now(),
      transaction_type: 'PAYBILL',
      transaction_amount: 6.00,
      currency: 'KES',
      status: 'completed',
      business_short_code: '880100',
      bill_reference_number: '774451 UMOJA',
      customer_phone: '254727638940',
      customer_name: 'JUSTUS MURENGA',
      partner_id: umojaPartner.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newC2B, error: c2bError } = await supabase
      .from('c2b_transactions')
      .insert(testC2BData)
      .select()
      .single();

    if (c2bError) {
      console.log('❌ Error creating C2B transaction:', c2bError.message);
      console.log('   This explains why notifications are failing!');
    } else {
      console.log('✅ C2B transaction created successfully:');
      console.log(`   - ID: ${newC2B.id}`);
      console.log(`   - Transaction ID: ${newC2B.transaction_id}`);
      console.log(`   - Amount: KES ${newC2B.transaction_amount}`);
      console.log(`   - Status: ${newC2B.status}`);
      console.log('');
      
      // Clean up test transaction
      await supabase
        .from('c2b_transactions')
        .delete()
        .eq('id', newC2B.id);
      console.log('🧹 Test transaction cleaned up');
    }

    // 5. Test creating a wallet transaction manually
    console.log('5️⃣ Testing wallet transaction creation...');
    const testWalletData = {
      wallet_id: umojaWallet.id,
      partner_id: umojaPartner.id,
      transaction_type: 'top_up',
      amount: 6.00,
      currency: 'KES',
      status: 'completed',
      reference: 'TEST_' + Date.now(),
      description: 'Test wallet transaction',
      metadata: {
        test: true,
        source: 'manual_test'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: newWalletTx, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .insert(testWalletData)
      .select()
      .single();

    if (walletTxError) {
      console.log('❌ Error creating wallet transaction:', walletTxError.message);
      console.log('   This explains why wallet updates are failing!');
    } else {
      console.log('✅ Wallet transaction created successfully:');
      console.log(`   - ID: ${newWalletTx.id}`);
      console.log(`   - Type: ${newWalletTx.transaction_type}`);
      console.log(`   - Amount: KES ${newWalletTx.amount}`);
      console.log(`   - Status: ${newWalletTx.status}`);
      console.log('');
      
      // Clean up test transaction
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', newWalletTx.id);
      console.log('🧹 Test wallet transaction cleaned up');
    }

    // 6. Summary
    console.log('📋 DATABASE CHECK SUMMARY:');
    console.log('==========================');
    if (c2bError || walletTxError) {
      console.log('❌ DATABASE ISSUES FOUND:');
      if (c2bError) {
        console.log(`   - C2B Transaction Error: ${c2bError.message}`);
      }
      if (walletTxError) {
        console.log(`   - Wallet Transaction Error: ${walletTxError.message}`);
      }
      console.log('');
      console.log('🔧 IMMEDIATE ACTION REQUIRED:');
      console.log('==============================');
      console.log('1. Fix database schema issues');
      console.log('2. Check table permissions');
      console.log('3. Verify column names and types');
      console.log('4. Test notification handler again');
    } else {
      console.log('✅ DATABASE IS WORKING CORRECTLY');
      console.log('✅ All tables and permissions are fine');
      console.log('✅ The "Failed to record transaction" error is likely a different issue');
      console.log('');
      console.log('🔍 NEXT STEPS:');
      console.log('==============');
      console.log('1. Check server logs for detailed error messages');
      console.log('2. Test with a real NCBA notification');
      console.log('3. Verify NCBA is sending notifications to your endpoint');
    }

  } catch (error) {
    console.error('❌ Database check failed:', error);
  }
}

// Run the check
checkDatabaseIssues();
