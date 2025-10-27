// Investigate UMOJA transactions and wallet credits
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function investigateUmojaTransactions() {
  console.log('🔍 Investigating UMOJA transactions and wallet credits...');
  console.log('=======================================================');

  try {
    // 1. Check if UMOJA partner exists
    console.log('1️⃣ Checking UMOJA partner...');
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('short_code', 'UMOJA')
      .single();

    if (partnerError) {
      console.log('❌ Error fetching UMOJA partner:', partnerError.message);
      return;
    }

    if (!partner) {
      console.log('❌ UMOJA partner not found in database');
      console.log('');
      console.log('Available partners:');
      const { data: allPartners } = await supabase
        .from('partners')
        .select('id, name, short_code, is_active')
        .order('name');
      
      allPartners?.forEach(p => {
        console.log(`   - ${p.name} (${p.short_code}) - ${p.is_active ? 'Active' : 'Inactive'}`);
      });
      return;
    }

    console.log('✅ UMOJA partner found:');
    console.log(`   - ID: ${partner.id}`);
    console.log(`   - Name: ${partner.name}`);
    console.log(`   - Short Code: ${partner.short_code}`);
    console.log(`   - Active: ${partner.is_active}`);
    console.log('');

    // 2. Check C2B transactions for UMOJA
    console.log('2️⃣ Checking C2B transactions for UMOJA...');
    const { data: c2bTransactions, error: c2bError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false });

    if (c2bError) {
      console.log('❌ Error fetching C2B transactions:', c2bError.message);
      return;
    }

    console.log(`📊 Found ${c2bTransactions.length} C2B transactions for UMOJA:`);
    c2bTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
      console.log(`      - Amount: KES ${tx.transaction_amount}`);
      console.log(`      - Status: ${tx.status}`);
      console.log(`      - Account Reference: ${tx.bill_reference_number}`);
      console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
      console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
      console.log(`      - Raw Notification: ${tx.raw_notification ? 'Yes' : 'No'}`);
      console.log('');
    });

    // 3. Check recent C2B transactions with account reference 774451#UMOJA
    console.log('3️⃣ Checking recent C2B transactions with account reference 774451#UMOJA...');
    const { data: recentTransactions, error: recentError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .ilike('bill_reference_number', '%774451#UMOJA%')
      .order('created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.log('❌ Error fetching recent transactions:', recentError.message);
      return;
    }

    console.log(`🔍 Found ${recentTransactions.length} recent transactions with account reference 774451#UMOJA:`);
    recentTransactions.forEach((tx, index) => {
      console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
      console.log(`      - Amount: KES ${tx.transaction_amount}`);
      console.log(`      - Status: ${tx.status}`);
      console.log(`      - Account Reference: ${tx.bill_reference_number}`);
      console.log(`      - Customer: ${tx.customer_name || 'Unknown'} (${tx.customer_phone})`);
      console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
      console.log(`      - Created: ${new Date(tx.created_at).toLocaleString()}`);
      console.log('');
    });

    // 4. Check partner wallet
    console.log('4️⃣ Checking UMOJA partner wallet...');
    const { data: wallet, error: walletError } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', partner.id)
      .single();

    if (walletError && walletError.code !== 'PGRST116') {
      console.log('❌ Error fetching wallet:', walletError.message);
      return;
    }

    if (!wallet) {
      console.log('❌ No wallet found for UMOJA partner');
      console.log('This means wallet credits cannot be processed!');
    } else {
      console.log('✅ UMOJA wallet found:');
      console.log(`   - Balance: KES ${wallet.balance}`);
      console.log(`   - Currency: ${wallet.currency}`);
      console.log(`   - Active: ${wallet.is_active}`);
      console.log(`   - Created: ${new Date(wallet.created_at).toLocaleString()}`);
      console.log(`   - Updated: ${new Date(wallet.updated_at).toLocaleString()}`);
      console.log('');
    }

    // 5. Check wallet transactions
    console.log('5️⃣ Checking wallet transactions for UMOJA...');
    const { data: walletTransactions, error: walletTxError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('partner_id', partner.id)
      .order('created_at', { ascending: false });

    if (walletTxError) {
      console.log('❌ Error fetching wallet transactions:', walletTxError.message);
      return;
    }

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

    // 6. Check for exact account reference matches
    console.log('6️⃣ Checking for transactions with exact account reference 774451#UMOJA...');
    const exactMatches = recentTransactions.filter(tx => tx.bill_reference_number === '774451#UMOJA');
    console.log(`Found ${exactMatches.length} transactions with exact account reference 774451#UMOJA:`);
    exactMatches.forEach((tx, index) => {
      console.log(`   ${index + 1}. ${tx.transaction_id} - KES ${tx.transaction_amount} - ${tx.status} - ${tx.customer_phone}`);
    });
    console.log('');

    // 7. Summary and Analysis
    console.log('📋 SUMMARY AND ANALYSIS:');
    console.log('========================');
    console.log(`   - UMOJA Partner: ${partner ? '✅ Found' : '❌ Not Found'}`);
    console.log(`   - C2B Transactions: ${c2bTransactions.length}`);
    console.log(`   - Wallet Balance: ${wallet ? `KES ${wallet.balance}` : '❌ No wallet'}`);
    console.log(`   - Wallet Transactions: ${walletTransactions.length}`);
    console.log(`   - Recent 774451#UMOJA transactions: ${recentTransactions.length}`);
    console.log(`   - Exact 774451#UMOJA matches: ${exactMatches.length}`);

    // Calculate expected vs actual balance
    if (wallet && c2bTransactions.length > 0) {
      const totalC2BAmount = c2bTransactions.reduce((sum, tx) => sum + tx.transaction_amount, 0);
      const totalWalletCredits = walletTransactions
        .filter(tx => tx.transaction_type === 'top_up' && tx.status === 'completed')
        .reduce((sum, tx) => sum + tx.amount, 0);
      
      console.log(`   - Total C2B Amount: KES ${totalC2BAmount}`);
      console.log(`   - Total Wallet Credits: KES ${totalWalletCredits}`);
      console.log(`   - Balance Match: ${wallet.balance === totalWalletCredits ? '✅ Yes' : '❌ No'}`);
    }

    // 8. Recommendations
    console.log('');
    console.log('💡 RECOMMENDATIONS:');
    console.log('===================');
    
    if (exactMatches.length === 0) {
      console.log('❌ No transactions found with account reference 774451#UMOJA');
      console.log('   - Check if payments were made correctly');
      console.log('   - Verify NCBA notification endpoint is working');
      console.log('   - Check NCBA system settings');
    } else {
      console.log('✅ Transactions found with account reference 774451#UMOJA');
      console.log('   - Check if wallet was credited for each transaction');
      console.log('   - Verify notification processing worked correctly');
    }

    if (!wallet) {
      console.log('❌ UMOJA partner has no wallet');
      console.log('   - Create a wallet for UMOJA partner');
      console.log('   - This is required for automatic wallet credits');
    }

    if (walletTransactions.length === 0 && c2bTransactions.length > 0) {
      console.log('❌ C2B transactions exist but no wallet transactions');
      console.log('   - This suggests wallet credit process failed');
      console.log('   - Check NCBA notification handler logs');
    }

  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateUmojaTransactions();