require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTransactionTimestamps() {
  console.log('🔍 Checking transaction timestamps...');
  
  // Get the specific transaction that failed
  const { data: transaction, error } = await supabase
    .from('c2b_transactions')
    .select('*')
    .eq('transaction_id', 'TJR678M4TL')
    .single();
    
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  console.log('📊 Transaction details:');
  console.log('- Transaction ID:', transaction.transaction_id);
  console.log('- Created At (DB):', transaction.created_at);
  console.log('- Transaction Time (NCBA):', transaction.transaction_time);
  
  // Parse the NCBA transaction time
  const ncbaTime = transaction.transaction_time; // "20251027190952"
  if (ncbaTime && ncbaTime.length === 14) {
    const year = ncbaTime.substring(0, 4);
    const month = ncbaTime.substring(4, 6);
    const day = ncbaTime.substring(6, 8);
    const hour = ncbaTime.substring(8, 10);
    const minute = ncbaTime.substring(10, 12);
    const second = ncbaTime.substring(12, 14);
    
    const ncbaDateTime = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
    console.log('- NCBA DateTime (parsed):', ncbaDateTime.toISOString());
    console.log('- NCBA DateTime (local):', ncbaDateTime.toString());
  }
  
  // Check the raw notification
  if (transaction.raw_notification) {
    console.log('\n📋 Raw notification timestamps:');
    console.log('- TransTime:', transaction.raw_notification.TransTime);
    console.log('- Notification received at:', new Date().toISOString());
  }
  
  // Check wallet transaction
  const { data: walletTransaction, error: walletError } = await supabase
    .from('wallet_transactions')
    .select('created_at, updated_at')
    .eq('reference', 'TJR678M4TL')
    .single();
    
  if (!walletError && walletTransaction) {
    console.log('\n💰 Wallet transaction timestamps:');
    console.log('- Created At:', walletTransaction.created_at);
    console.log('- Updated At:', walletTransaction.updated_at);
  }
}

checkTransactionTimestamps();
