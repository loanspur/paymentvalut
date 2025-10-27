// Check and fix database schema issues
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixSchema() {
  console.log('🔍 Checking and fixing database schema issues...');
  console.log('===============================================');

  try {
    // 1. Check c2b_transactions table schema
    console.log('1️⃣ Checking c2b_transactions table schema...');
    const { data: c2bColumns, error: c2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .limit(1);

    if (c2bError) {
      console.log('❌ Error accessing c2b_transactions:', c2bError.message);
    } else {
      console.log('✅ c2b_transactions table accessible');
      if (c2bColumns && c2bColumns.length > 0) {
        console.log('📊 Available columns:', Object.keys(c2bColumns[0]));
      } else {
        console.log('📊 Table is empty, checking schema via information_schema...');
        
        // Check schema via SQL query
        const { data: schemaData, error: schemaError } = await supabase
          .rpc('get_table_columns', { table_name: 'c2b_transactions' });
          
        if (schemaError) {
          console.log('❌ Error getting schema:', schemaError.message);
        } else {
          console.log('📊 Schema data:', schemaData);
        }
      }
    }
    console.log('');

    // 2. Check wallet_transactions table schema
    console.log('2️⃣ Checking wallet_transactions table schema...');
    const { data: walletColumns, error: walletError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .limit(1);

    if (walletError) {
      console.log('❌ Error accessing wallet_transactions:', walletError.message);
    } else {
      console.log('✅ wallet_transactions table accessible');
      if (walletColumns && walletColumns.length > 0) {
        console.log('📊 Available columns:', Object.keys(walletColumns[0]));
      } else {
        console.log('📊 Table is empty, checking schema via information_schema...');
        
        // Check schema via SQL query
        const { data: schemaData, error: schemaError } = await supabase
          .rpc('get_table_columns', { table_name: 'wallet_transactions' });
          
        if (schemaError) {
          console.log('❌ Error getting schema:', schemaError.message);
        } else {
          console.log('📊 Schema data:', schemaData);
        }
      }
    }
    console.log('');

    // 3. Try to create a simple test record to see what columns are actually available
    console.log('3️⃣ Testing with minimal data to identify available columns...');
    
    // Test c2b_transactions with minimal data
    const minimalC2B = {
      transaction_id: 'TEST_MINIMAL_' + Date.now(),
      transaction_amount: 6.00,
      status: 'completed',
      created_at: new Date().toISOString()
    };

    const { data: testC2B, error: testC2BError } = await supabase
      .from('c2b_transactions')
      .insert(minimalC2B)
      .select()
      .single();

    if (testC2BError) {
      console.log('❌ Minimal C2B test failed:', testC2BError.message);
    } else {
      console.log('✅ Minimal C2B test successful:');
      console.log('📊 Available columns:', Object.keys(testC2B));
      
      // Clean up
      await supabase
        .from('c2b_transactions')
        .delete()
        .eq('id', testC2B.id);
      console.log('🧹 Test record cleaned up');
    }
    console.log('');

    // Test wallet_transactions with minimal data
    const minimalWallet = {
      wallet_id: 'b0f5e823-a453-4b36-bd50-51a8bd3cbfaa', // UMOJA wallet ID
      transaction_type: 'top_up',
      amount: 6.00,
      status: 'completed',
      reference: 'TEST_MINIMAL_' + Date.now(),
      created_at: new Date().toISOString()
    };

    const { data: testWallet, error: testWalletError } = await supabase
      .from('wallet_transactions')
      .insert(minimalWallet)
      .select()
      .single();

    if (testWalletError) {
      console.log('❌ Minimal wallet test failed:', testWalletError.message);
    } else {
      console.log('✅ Minimal wallet test successful:');
      console.log('📊 Available columns:', Object.keys(testWallet));
      
      // Clean up
      await supabase
        .from('wallet_transactions')
        .delete()
        .eq('id', testWallet.id);
      console.log('🧹 Test record cleaned up');
    }
    console.log('');

    // 4. Summary and recommendations
    console.log('📋 SCHEMA ANALYSIS SUMMARY:');
    console.log('===========================');
    console.log('The database schema issues are preventing NCBA notifications from being processed.');
    console.log('');
    console.log('🔧 RECOMMENDED ACTIONS:');
    console.log('=======================');
    console.log('1. Check the actual table schemas in Supabase dashboard');
    console.log('2. Verify column names match what the notification handler expects');
    console.log('3. Add missing columns if needed');
    console.log('4. Update the notification handler to use correct column names');
    console.log('');
    console.log('💡 NEXT STEPS:');
    console.log('==============');
    console.log('1. Go to Supabase dashboard → Table Editor');
    console.log('2. Check c2b_transactions table columns');
    console.log('3. Check wallet_transactions table columns');
    console.log('4. Compare with what the notification handler expects');
    console.log('5. Fix any mismatches');

  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

// Run the check
checkAndFixSchema();
