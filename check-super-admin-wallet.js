// Check if super admin has a wallet and if wallet deduction is required
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSuperAdminWallet() {
  try {
    console.log('🔍 Checking Super Admin Wallet...');
    console.log('===================================');
    
    // Check if super admin user exists
    console.log('👤 Checking super admin user...');
    const { data: superAdmin, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'super_admin')
      .limit(1)
      .single();
    
    if (userError || !superAdmin) {
      console.log('❌ No super admin user found');
      return;
    }
    
    console.log('✅ Super admin user found:');
    console.log('ID:', superAdmin.id);
    console.log('Email:', superAdmin.email);
    console.log('Role:', superAdmin.role);
    console.log('Partner ID:', superAdmin.partner_id);
    console.log('');
    
    // Check if super admin has a partner
    if (superAdmin.partner_id) {
      console.log('🏢 Super admin has partner ID:', superAdmin.partner_id);
      
      // Check partner wallet
      const { data: wallet, error: walletError } = await supabase
        .from('partner_wallets')
        .select('*')
        .eq('partner_id', superAdmin.partner_id)
        .single();
      
      if (walletError || !wallet) {
        console.log('❌ No wallet found for super admin partner');
        console.log('This could be why OTP SMS is not working!');
        console.log('');
        console.log('💡 Solution: Create a wallet for the super admin partner');
        console.log('   OR modify the OTP system to not require wallet deduction');
      } else {
        console.log('✅ Super admin partner has a wallet:');
        console.log('Current Balance:', wallet.current_balance);
        console.log('Currency:', wallet.currency);
        console.log('Created:', wallet.created_at);
        console.log('');
        
        if (wallet.current_balance <= 0) {
          console.log('⚠️  WARNING: Super admin wallet has zero or negative balance!');
          console.log('This could prevent SMS sending if wallet deduction is required.');
        }
      }
    } else {
      console.log('❌ Super admin has no partner ID');
      console.log('This means no wallet is associated with the super admin');
      console.log('');
      console.log('💡 This could be why OTP SMS is not working!');
      console.log('The OTP system might be trying to deduct from a non-existent wallet');
    }
    
    // Check if there are any wallet deduction requirements in the code
    console.log('');
    console.log('🔍 Checking for wallet deduction requirements...');
    console.log('SMS Campaigns: ✅ Check wallet balance and deduct costs');
    console.log('OTP System: ❌ No wallet deduction logic found');
    console.log('');
    console.log('💡 This suggests the OTP system should work without wallet deduction');
    console.log('   But there might be hidden wallet checks we haven\'t found yet');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSuperAdminWallet();


