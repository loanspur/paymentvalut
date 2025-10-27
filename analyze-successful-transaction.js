// Analyze the successful KES 6.00 transaction to understand the working pattern
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeSuccessfulTransaction() {
  console.log('🔍 Analyzing the successful KES 6.00 transaction...');
  console.log('==================================================');

  try {
    // 1. Get the successful C2B transaction details
    console.log('1️⃣ Analyzing successful C2B transaction TJR678LEQ8...');
    const { data: successfulTx, error: txError } = await supabase
      .from('c2b_transactions')
      .select('*')
      .eq('transaction_id', 'TJR678LEQ8')
      .single();

    if (txError || !successfulTx) {
      console.log('❌ Error fetching successful transaction:', txError?.message);
      return;
    }

    console.log('✅ Successful transaction details:');
    console.log(`   - Transaction ID: ${successfulTx.transaction_id}`);
    console.log(`   - Amount: KES ${successfulTx.amount}`);
    console.log(`   - Status: ${successfulTx.status}`);
    console.log(`   - Transaction Type: ${successfulTx.transaction_type}`);
    console.log(`   - Business Short Code: ${successfulTx.business_short_code}`);
    console.log(`   - Bill Reference Number: ${successfulTx.bill_reference_number}`);
    console.log(`   - Customer Phone: ${successfulTx.customer_phone}`);
    console.log(`   - Customer Name: ${successfulTx.customer_name}`);
    console.log(`   - Partner ID: ${successfulTx.partner_id}`);
    console.log(`   - Created At: ${new Date(successfulTx.created_at).toLocaleString()}`);
    console.log(`   - Updated At: ${new Date(successfulTx.updated_at).toLocaleString()}`);
    
    if (successfulTx.raw_notification) {
      console.log('   - Raw Notification Data:');
      console.log(JSON.stringify(successfulTx.raw_notification, null, 2));
    }
    console.log('');

    // 2. Get the corresponding wallet transaction
    console.log('2️⃣ Analyzing corresponding wallet transaction...');
    const { data: walletTx, error: walletError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('reference', 'TJR678LEQ8')
      .single();

    if (walletError || !walletTx) {
      console.log('❌ Error fetching wallet transaction:', walletError?.message);
    } else {
      console.log('✅ Wallet transaction details:');
      console.log(`   - ID: ${walletTx.id}`);
      console.log(`   - Wallet ID: ${walletTx.wallet_id}`);
      console.log(`   - Transaction Type: ${walletTx.transaction_type}`);
      console.log(`   - Amount: KES ${walletTx.amount}`);
      console.log(`   - Status: ${walletTx.status}`);
      console.log(`   - Reference: ${walletTx.reference}`);
      console.log(`   - Description: ${walletTx.description}`);
      console.log(`   - Created At: ${new Date(walletTx.created_at).toLocaleString()}`);
      
      if (walletTx.metadata) {
        console.log('   - Metadata:');
        console.log(JSON.stringify(walletTx.metadata, null, 2));
      }
    }
    console.log('');

    // 3. Check UMOJA partner details
    console.log('3️⃣ Analyzing UMOJA partner details...');
    const { data: umojaPartner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', successfulTx.partner_id)
      .single();

    if (partnerError || !umojaPartner) {
      console.log('❌ Error fetching UMOJA partner:', partnerError?.message);
    } else {
      console.log('✅ UMOJA partner details:');
      console.log(`   - ID: ${umojaPartner.id}`);
      console.log(`   - Name: ${umojaPartner.name}`);
      console.log(`   - Short Code: ${umojaPartner.short_code}`);
      console.log(`   - Active: ${umojaPartner.is_active}`);
      console.log(`   - Created At: ${new Date(umojaPartner.created_at).toLocaleString()}`);
    }
    console.log('');

    // 4. Check UMOJA wallet details
    console.log('4️⃣ Analyzing UMOJA wallet details...');
    const { data: umojaWallet, error: walletError2 } = await supabase
      .from('partner_wallets')
      .select('*')
      .eq('partner_id', successfulTx.partner_id)
      .single();

    if (walletError2 || !umojaWallet) {
      console.log('❌ Error fetching UMOJA wallet:', walletError2?.message);
    } else {
      console.log('✅ UMOJA wallet details:');
      console.log(`   - ID: ${umojaWallet.id}`);
      console.log(`   - Partner ID: ${umojaWallet.partner_id}`);
      console.log(`   - Current Balance: KES ${umojaWallet.current_balance}`);
      console.log(`   - Currency: ${umojaWallet.currency}`);
      console.log(`   - Active: ${umojaWallet.is_active}`);
      console.log(`   - Created At: ${new Date(umojaWallet.created_at).toLocaleString()}`);
      console.log(`   - Updated At: ${new Date(umojaWallet.updated_at).toLocaleString()}`);
    }
    console.log('');

    // 5. Check NCBA system settings used
    console.log('5️⃣ Analyzing NCBA system settings...');
    const { data: ncbaSettings, error: settingsError } = await supabase
      .from('system_settings')
      .select('setting_key, setting_value')
      .in('setting_key', [
        'ncba_business_short_code',
        'ncba_notification_username',
        'ncba_notification_password',
        'ncba_notification_secret_key',
        'ncba_account_number',
        'ncba_account_reference_separator'
      ]);

    if (settingsError) {
      console.log('❌ Error fetching NCBA settings:', settingsError.message);
    } else {
      console.log('✅ NCBA system settings used:');
      ncbaSettings.forEach(setting => {
        const value = setting.setting_key.includes('password') || setting.setting_key.includes('secret') 
          ? setting.setting_value.substring(0, 10) + '...' 
          : setting.setting_value;
        console.log(`   - ${setting.setting_key}: ${value}`);
      });
    }
    console.log('');

    // 6. Analyze the account reference parsing
    console.log('6️⃣ Analyzing account reference parsing...');
    const accountRef = successfulTx.bill_reference_number;
    const separator = ncbaSettings.find(s => s.setting_key === 'ncba_account_reference_separator')?.setting_value || ' ';
    const accountNumber = ncbaSettings.find(s => s.setting_key === 'ncba_account_number')?.setting_value || '774451';
    
    console.log(`   - Account Reference: "${accountRef}"`);
    console.log(`   - Separator: "${separator}"`);
    console.log(`   - Account Number: "${accountNumber}"`);
    
    if (accountRef.includes(separator)) {
      const parts = accountRef.split(separator);
      console.log(`   - Split parts: [${parts.join(', ')}]`);
      
      if (parts.length === 2 && parts[0] === accountNumber) {
        const partnerIdentifier = parts[1];
        console.log(`   - Partner identifier: "${partnerIdentifier}"`);
        console.log(`   - Matches UMOJA short code: ${partnerIdentifier === umojaPartner.short_code}`);
      }
    }
    console.log('');

    // 7. Summary and recommendations
    console.log('📋 SUCCESSFUL TRANSACTION ANALYSIS:');
    console.log('===================================');
    console.log('');
    console.log('✅ WORKING PATTERN IDENTIFIED:');
    console.log('==============================');
    console.log(`1. Transaction ID: ${successfulTx.transaction_id}`);
    console.log(`2. Amount: KES ${successfulTx.amount}`);
    console.log(`3. Account Reference: ${successfulTx.bill_reference_number}`);
    console.log(`4. Customer Phone: ${successfulTx.customer_phone}`);
    console.log(`5. Customer Name: ${successfulTx.customer_name}`);
    console.log(`6. Business Short Code: ${successfulTx.business_short_code}`);
    console.log(`7. Partner: ${umojaPartner.name} (${umojaPartner.short_code})`);
    console.log('');
    console.log('🔍 WHY OTHER TRANSACTIONS MIGHT NOT BE WORKING:');
    console.log('===============================================');
    console.log('1. Different account reference format');
    console.log('2. Different customer phone number');
    console.log('3. Different business short code');
    console.log('4. NCBA notification delivery delay');
    console.log('5. Different transaction timing');
    console.log('');
    console.log('💡 RECOMMENDATIONS FOR TESTING:');
    console.log('===============================');
    console.log('1. Use EXACTLY the same account reference: "774451 UMOJA"');
    console.log('2. Use the same phone number: 254727638940');
    console.log('3. Use the same business short code: 880100');
    console.log('4. Wait 5-10 minutes for NCBA notification delivery');
    console.log('5. Check M-Pesa SMS for exact transaction reference');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

// Run the analysis
analyzeSuccessfulTransaction();
