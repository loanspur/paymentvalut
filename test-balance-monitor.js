// Test Balance Monitor Function
// This script will test the updated balance monitor function

const testBalanceMonitor = async () => {
  console.log('🔍 Testing Updated Balance Monitor Function...\n');

  try {
    // Step 1: Trigger balance check for all partners
    console.log('Step 1: Triggering balance check for all partners...');
    
    const triggerResponse = await fetch('https://mapgmmiobityxaaevomp.supabase.co/functions/v1/balance-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY' // Replace with actual key
      },
      body: JSON.stringify({
        force_check: true
      })
    });

    if (triggerResponse.ok) {
      const triggerData = await triggerResponse.json();
      console.log('✅ Balance monitor triggered successfully:', JSON.stringify(triggerData, null, 2));
      
      // Check the results
      if (triggerData.results && triggerData.results.length > 0) {
        console.log('\n📊 Balance Check Results:');
        triggerData.results.forEach((result, index) => {
          console.log(`\n${index + 1}. Partner ID: ${result.partner_id}`);
          console.log(`   Status: ${result.status}`);
          if (result.partner_name) {
            console.log(`   Partner Name: ${result.partner_name}`);
          }
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
          if (result.balance_data) {
            console.log(`   Balance Data:`, result.balance_data);
          }
          if (result.checked_at) {
            console.log(`   Checked At: ${result.checked_at}`);
          }
        });
        
        console.log('\n📈 Summary:');
        console.log(`- Total: ${triggerData.summary?.total || 0}`);
        console.log(`- Successful: ${triggerData.summary?.successful || 0}`);
        console.log(`- Failed: ${triggerData.summary?.failed || 0}`);
        console.log(`- Skipped: ${triggerData.summary?.skipped || 0}`);
      }
    } else {
      console.error('❌ Failed to trigger balance monitor:', triggerResponse.status, triggerResponse.statusText);
      const errorData = await triggerResponse.text();
      console.error('Error details:', errorData);
    }

  } catch (error) {
    console.error('❌ Error during balance monitor test:', error);
  }
};

// Function to test specific partner
const testSpecificPartner = async (partnerId) => {
  console.log(`\n🎯 Testing balance monitor for specific partner: ${partnerId}...`);
  
  try {
    const triggerResponse = await fetch('https://mapgmmiobityxaaevomp.supabase.co/functions/v1/balance-monitor', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer YOUR_SUPABASE_ANON_KEY' // Replace with actual key
      },
      body: JSON.stringify({
        partner_id: partnerId,
        force_check: true
      })
    });

    if (triggerResponse.ok) {
      const triggerData = await triggerResponse.json();
      console.log(`✅ Balance monitor triggered for partner ${partnerId}:`, JSON.stringify(triggerData, null, 2));
    } else {
      console.error(`❌ Failed to trigger balance monitor for partner ${partnerId}:`, triggerResponse.status, triggerResponse.statusText);
    }
  } catch (error) {
    console.error(`❌ Error testing balance monitor for partner ${partnerId}:`, error);
  }
};

// Function to check balance data via API
const checkBalanceData = async () => {
  console.log('\n🔍 Checking balance data via API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Balance data retrieved successfully');
      
      if (data.partners && data.partners.length > 0) {
        console.log('\n📊 Current Balance Data:');
        data.partners.forEach((partner, index) => {
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
      console.error('❌ Failed to get balance data:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Error checking balance data:', error);
  }
};

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBalanceMonitor,
    testSpecificPartner,
    checkBalanceData
  };
}

// Run the script
if (typeof window === 'undefined') {
  console.log('🔍 Balance Monitor Test Script');
  console.log('==============================\n');
  
  // Test balance monitor function
  testBalanceMonitor();
  
  // Check balance data
  checkBalanceData();
  
  // Uncomment to test specific partner
  // testSpecificPartner('partner-uuid-here');
}

