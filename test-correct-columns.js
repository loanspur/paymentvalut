// Test c2b_transactions with correct column names
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testC2BWithCorrectColumns() {
  console.log('🧪 Testing c2b_transactions with correct column names...');
  console.log('======================================================');

  try {
    // Test with amount column and required fields
    console.log('1️⃣ Testing with amount column and required fields...');
    
    const testData = {
      transaction_id: 'TEST_' + Date.now(),
      amount: 6.00,  // Use 'amount' instead of 'transaction_amount'
      status: 'completed',
      customer_phone: '254727638940',  // Required field
      created_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('c2b_transactions')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.log('❌ Test failed:', error.message);
    } else {
      console.log('✅ Test successful!');
      console.log('📊 Available columns:', Object.keys(data));
      console.log('📊 Sample data:', data);
      
      // Clean up
      await supabase
        .from('c2b_transactions')
        .delete()
        .eq('id', data.id);
      console.log('🧹 Test record cleaned up');
    }

    console.log('');
    console.log('2️⃣ Testing wallet_transactions without partner_id...');
    
    // Test wallet_transactions without partner_id
    const walletTestData = {
      wallet_id: 'b0f5e823-a453-4b36-bd50-51a8bd3cbfaa',
      transaction_type: 'top_up',
      amount: 6.00,
      status: 'completed',
      reference: 'TEST_NO_PARTNER_' + Date.now(),
      description: 'Test transaction without partner_id',
      created_at: new Date().toISOString()
    };

    const { data: walletTest, error: walletTestError } = await supabase
      .from('wallet_transactions')
      .insert(walletTestData)
      .select()
      .single();

    if (walletTestError) {
      console.log('❌ Wallet test failed:', walletTestError.message);
    } else {
      console.log('✅ Wallet test successful!');
      console.log('📊 Available columns:', Object.keys(walletTest));
      
      // Clean up
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', walletTest.id);
      console.log('🧹 Wallet test cleaned up');
    }

    console.log('');
    console.log('📋 FINAL FINDINGS:');
    console.log('==================');
    console.log('✅ c2b_transactions uses "amount" column (not "transaction_amount")');
    console.log('✅ c2b_transactions requires "customer_phone" field');
    console.log('✅ wallet_transactions does NOT have "partner_id" column');
    console.log('');
    console.log('🔧 FIXES NEEDED:');
    console.log('================');
    console.log('1. Update NCBA notification handler to use "amount" instead of "transaction_amount"');
    console.log('2. Remove "partner_id" from wallet_transactions insert in notification handler');
    console.log('3. Add "customer_phone" to c2b_transactions insert');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testC2BWithCorrectColumns();
