require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugWalletTransactions() {
  console.log('🔍 Debugging wallet transactions API...');
  console.log('=====================================');
  
  // 1. Check wallet_transactions table structure
  console.log('\n📊 Checking wallet_transactions table structure:');
  const { data: walletTransactions, error: wtError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .limit(1);
    
  if (wtError) {
    console.error('Error fetching wallet_transactions:', wtError);
  } else {
    console.log('Sample wallet_transaction:', walletTransactions?.[0]);
  }
  
  // 2. Check partner_wallets table structure
  console.log('\n💰 Checking partner_wallets table structure:');
  const { data: partnerWallets, error: pwError } = await supabase
    .from('partner_wallets')
    .select('*')
    .limit(1);
    
  if (pwError) {
    console.error('Error fetching partner_wallets:', pwError);
  } else {
    console.log('Sample partner_wallet:', partnerWallets?.[0]);
  }
  
  // 3. Check partners table
  console.log('\n🏢 Checking partners table:');
  const { data: partners, error: partnersError } = await supabase
    .from('partners')
    .select('*')
    .limit(3);
    
  if (partnersError) {
    console.error('Error fetching partners:', partnersError);
  } else {
    console.log('Sample partners:', partners);
  }
  
  // 4. Test the problematic query
  console.log('\n🧪 Testing the problematic query:');
  try {
    const { data: testData, error: testError } = await supabase
      .from('wallet_transactions')
      .select(`
        *,
        partners!inner(
          id,
          name,
          short_code
        )
      `)
      .limit(1);
      
    if (testError) {
      console.error('❌ Query failed:', testError);
    } else {
      console.log('✅ Query succeeded:', testData);
    }
  } catch (error) {
    console.error('❌ Query exception:', error);
  }
  
  // 5. Test alternative query approach
  console.log('\n🔄 Testing alternative query approach:');
  try {
    // First get wallet transactions
    const { data: wtData, error: wtDataError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .limit(5);
      
    if (wtDataError) {
      console.error('❌ Wallet transactions query failed:', wtDataError);
    } else {
      console.log('✅ Wallet transactions:', wtData);
      
      // Then get partner info for each wallet
      if (wtData && wtData.length > 0) {
        for (const wt of wtData) {
          const { data: walletData, error: walletError } = await supabase
            .from('partner_wallets')
            .select('partner_id')
            .eq('id', wt.wallet_id)
            .single();
            
          if (walletError) {
            console.error(`❌ Wallet query failed for ${wt.id}:`, walletError);
          } else {
            console.log(`✅ Wallet ${wt.id} belongs to partner:`, walletData.partner_id);
            
            // Get partner details
            const { data: partnerData, error: partnerError } = await supabase
              .from('partners')
              .select('id, name, short_code')
              .eq('id', walletData.partner_id)
              .single();
              
            if (partnerError) {
              console.error(`❌ Partner query failed for ${walletData.partner_id}:`, partnerError);
            } else {
              console.log(`✅ Partner details:`, partnerData);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Alternative query exception:', error);
  }
}

debugWalletTransactions().catch(console.error);
