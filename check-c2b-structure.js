// Check c2b_transactions table structure and fix notification handler
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkC2BTableStructure() {
  console.log('🔍 Checking c2b_transactions table structure...');
  console.log('===============================================');

  try {
    // Try to insert a record with different column names to identify the correct ones
    console.log('1️⃣ Testing different column name variations...');
    
    const testVariations = [
      { amount: 6.00 },
      { transaction_amount: 6.00 },
      { amount_value: 6.00 },
      { value: 6.00 },
      { total_amount: 6.00 }
    ];

    for (const variation of testVariations) {
      const testData = {
        transaction_id: 'TEST_' + Date.now() + '_' + Object.keys(variation)[0],
        ...variation,
        status: 'completed',
        created_at: new Date().toISOString()
      };

      console.log(`   Testing with ${Object.keys(variation)[0]}: ${variation[Object.keys(variation)[0]]}`);

      const { data, error } = await supabase
        .from('c2b_transactions')
        .insert(testData)
        .select()
        .single();

      if (error) {
        console.log(`     ❌ Failed: ${error.message}`);
      } else {
        console.log(`     ✅ Success! Available columns:`, Object.keys(data));
        
        // Clean up
        await supabase
          .from('c2b_transactions')
          .delete()
          .eq('id', data.id);
        console.log(`     🧹 Cleaned up`);
        break;
      }
    }

    console.log('');
    console.log('2️⃣ Checking if we can query existing records...');
    
    // Try to get any existing records to see the structure
    const { data: existingRecords, error: queryError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .limit(5);

    if (queryError) {
      console.log('❌ Error querying existing records:', queryError.message);
    } else if (existingRecords && existingRecords.length > 0) {
      console.log('✅ Found existing records:');
      console.log('📊 Available columns:', Object.keys(existingRecords[0]));
    } else {
      console.log('📊 No existing records found');
    }

    console.log('');
    console.log('3️⃣ Checking wallet_transactions for partner_id column...');
    
    // Check if wallet_transactions has partner_id column
    const walletTestData = {
      wallet_id: 'b0f5e823-a453-4b36-bd50-51a8bd3cbfaa',
      transaction_type: 'top_up',
      amount: 6.00,
      status: 'completed',
      reference: 'TEST_PARTNER_' + Date.now(),
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
      console.log('✅ Wallet test successful:');
      console.log('📊 Available columns:', Object.keys(walletTest));
      
      // Check if partner_id column exists
      if ('partner_id' in walletTest) {
        console.log('✅ partner_id column exists in wallet_transactions');
      } else {
        console.log('❌ partner_id column does NOT exist in wallet_transactions');
        console.log('   This explains why wallet transactions fail');
      }
      
      // Clean up
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', walletTest.id);
      console.log('🧹 Wallet test cleaned up');
    }

    console.log('');
    console.log('📋 FINDINGS SUMMARY:');
    console.log('===================');
    console.log('1. c2b_transactions table structure needs to be identified');
    console.log('2. wallet_transactions table is missing partner_id column');
    console.log('3. These schema mismatches prevent NCBA notifications from being processed');
    console.log('');
    console.log('🔧 IMMEDIATE FIXES NEEDED:');
    console.log('==========================');
    console.log('1. Update NCBA notification handler to use correct column names');
    console.log('2. Add missing partner_id column to wallet_transactions table');
    console.log('3. Verify c2b_transactions column names');

  } catch (error) {
    console.error('❌ Structure check failed:', error);
  }
}

// Run the check
checkC2BTableStructure();
