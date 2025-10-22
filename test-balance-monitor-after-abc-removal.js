// Test Balance Monitor After ABC Partner Removal
// This script will test the balance monitor function with the remaining partners

const testBalanceMonitorAfterABCRemoval = async () => {
  console.log('🔍 Testing Balance Monitor After ABC Partner Removal...\n');

  try {
    // Step 1: Check remaining partners
    console.log('Step 1: Checking remaining partners...');
    
    const partnersResponse = await fetch('http://localhost:3000/api/partners', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (partnersResponse.ok) {
      const partnersData = await partnersResponse.json();
      console.log('✅ Partners retrieved successfully');
      
      if (partnersData.partners && partnersData.partners.length > 0) {
        console.log('\n📊 Remaining Partners:');
        partnersData.partners.forEach((partner, index) => {
          console.log(`${index + 1}. ${partner.name} (${partner.short_code})`);
          console.log(`   - M-Pesa Shortcode: ${partner.mpesa_shortcode}`);
          console.log(`   - Environment: ${partner.mpesa_environment}`);
          console.log(`   - Status: ${partner.is_active ? 'Active' : 'Inactive'}`);
          console.log(`   - M-Pesa Configured: ${partner.is_mpesa_configured ? 'Yes' : 'No'}`);
        });
      } else {
        console.log('❌ No partners found');
        return;
      }
    } else {
      console.error('❌ Failed to get partners:', partnersResponse.status, partnersResponse.statusText);
      return;
    }

    // Step 2: Trigger balance check
    console.log('\nStep 2: Triggering balance check for all partners...');
    
    const triggerResponse = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        force_refresh: true
      })
    });

    if (triggerResponse.ok) {
      const triggerData = await triggerResponse.json();
      console.log('✅ Balance check triggered successfully');
      console.log('Response:', JSON.stringify(triggerData, null, 2));
    } else {
      console.error('❌ Failed to trigger balance check:', triggerResponse.status, triggerResponse.statusText);
      const errorData = await triggerResponse.text();
      console.error('Error details:', errorData);
    }

    // Step 3: Wait for processing
    console.log('\nStep 3: Waiting for balance checks to process...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Step 4: Check balance data
    console.log('Step 4: Checking updated balance data...');
    
    const balanceResponse = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('✅ Balance data retrieved successfully');
      
      if (balanceData.partners && balanceData.partners.length > 0) {
        console.log('\n📊 Current Balance Data:');
        balanceData.partners.forEach((partner, index) => {
          console.log(`\n${index + 1}. ${partner.name} (${partner.short_code})`);
          console.log('   Status:', partner.status || 'Unknown');
          console.log('   Data Freshness:', partner.data_freshness || 'Unknown');
          
          if (partner.balance_data) {
            console.log('   Balance Data:');
            console.log('     - Utility Balance:', partner.balance_data.utility_balance || 'No Data');
            console.log('     - Working Balance:', partner.balance_data.working_balance || 'No Data');
            console.log('     - Charges Balance:', partner.balance_data.charges_balance || 'No Data');
            console.log('     - Last Updated:', partner.balance_data.last_updated || 'No Data');
          } else {
            console.log('   Balance Data: No balance data available');
          }
        });
      }
    } else {
      console.error('❌ Failed to get balance data:', balanceResponse.status, balanceResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Error during balance monitor test:', error);
  }
};

// Function to check Supabase logs
const checkSupabaseLogs = () => {
  console.log('\n🔍 To check Supabase logs:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to Functions → balance-monitor');
  console.log('3. Check the logs for any errors or success messages');
  console.log('4. Look for M-Pesa API calls and responses');
};

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBalanceMonitorAfterABCRemoval,
    checkSupabaseLogs
  };
}

// Run the script
if (typeof window === 'undefined') {
  console.log('🔍 Balance Monitor Test After ABC Removal');
  console.log('==========================================\n');
  
  // Test balance monitor
  testBalanceMonitorAfterABCRemoval();
  
  // Show log checking instructions
  checkSupabaseLogs();
}

