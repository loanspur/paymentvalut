// NCBA notification monitoring script
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function monitorNCBANotifications() {
  console.log('🔍 NCBA Notification Monitor');
  console.log('============================');
  console.log('Monitoring for incoming NCBA notifications...');
  console.log('Press Ctrl+C to stop monitoring');
  console.log('');

  let lastCheckTime = new Date();
  let notificationCount = 0;

  const checkInterval = setInterval(async () => {
    try {
      // Check for new C2B transactions
      const { data: newTransactions, error } = await supabase
        .from('c2b_transactions')
        .select('*')
        .gt('created_at', lastCheckTime.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.log(`❌ Error checking transactions: ${error.message}`);
        return;
      }

      if (newTransactions && newTransactions.length > 0) {
        console.log(`🎉 NEW NCBA NOTIFICATION RECEIVED!`);
        console.log(`📊 Found ${newTransactions.length} new transaction(s):`);
        
        newTransactions.forEach((tx, index) => {
          console.log(`   ${index + 1}. Transaction ID: ${tx.transaction_id}`);
          console.log(`      - Amount: KES ${tx.amount}`);
          console.log(`      - Status: ${tx.status}`);
          console.log(`      - Customer: ${tx.customer_name} (${tx.customer_phone})`);
          console.log(`      - Account Reference: ${tx.bill_reference_number}`);
          console.log(`      - Partner ID: ${tx.partner_id || 'Not allocated'}`);
          console.log(`      - Received: ${new Date(tx.created_at).toLocaleString()}`);
          console.log('');
        });

        notificationCount += newTransactions.length;
        console.log(`📈 Total notifications received: ${notificationCount}`);
        console.log('');

        // Check wallet transactions for these C2B transactions
        for (const tx of newTransactions) {
          const { data: walletTxs, error: walletError } = await supabase
            .from('wallet_transactions')
            .select('*')
            .eq('reference', tx.transaction_id)
            .order('created_at', { ascending: false });

          if (!walletError && walletTxs && walletTxs.length > 0) {
            console.log(`💰 Wallet transaction created for ${tx.transaction_id}:`);
            walletTxs.forEach(walletTx => {
              console.log(`   - Type: ${walletTx.transaction_type}`);
              console.log(`   - Amount: KES ${walletTx.amount}`);
              console.log(`   - Status: ${walletTx.status}`);
              console.log(`   - Description: ${walletTx.description}`);
            });
            console.log('');
          }
        }
      } else {
        // Show monitoring status
        const now = new Date();
        const timeDiff = Math.floor((now - lastCheckTime) / 1000);
        process.stdout.write(`\r⏰ Monitoring... Last check: ${timeDiff}s ago | Notifications: ${notificationCount} | Time: ${now.toLocaleTimeString()}`);
      }

      lastCheckTime = new Date();
    } catch (error) {
      console.log(`\n❌ Monitoring error: ${error.message}`);
    }
  }, 5000); // Check every 5 seconds

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Monitoring stopped');
    console.log(`📊 Total notifications received during monitoring: ${notificationCount}`);
    clearInterval(checkInterval);
    process.exit(0);
  });

  // Initial status
  console.log('✅ Monitoring started successfully');
  console.log('📡 Endpoint: https://eazzypay.online/api/ncba/paybill-notification');
  console.log('🔄 Check interval: 5 seconds');
  console.log('');
}

// Start monitoring
monitorNCBANotifications();
