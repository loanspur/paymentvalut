// Test Balance Display Script
// This script will test the balance display functionality

const testBalanceDisplay = async () => {
  console.log('🔍 Testing Balance Display Functionality...\n');

  try {
    // Step 1: Fetch current balance data
    console.log('Step 1: Fetching current balance data...');
    
    const response = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Balance data fetched successfully');
      
      // Display balance data for each partner
      if (data.partners && data.partners.length > 0) {
        console.log('\n📊 Current Balance Data:');
        console.log('========================');
        
        data.partners.forEach((partner, index) => {
          console.log(`\n${index + 1}. ${partner.name} (${partner.short_code})`);
          console.log('   Status:', partner.status || 'Unknown');
          console.log('   Data Freshness:', partner.data_freshness || 'Unknown');
          console.log('   Source:', partner.source || 'Unknown');
          
          if (partner.balance_data) {
            console.log('   Balance Data:');
            console.log('     - Utility Balance:', partner.balance_data.utility_balance || 'No Data');
            console.log('     - Working Balance:', partner.balance_data.working_balance || 'No Data');
            console.log('     - Charges Balance:', partner.balance_data.charges_balance || 'No Data');
            console.log('     - Last Updated:', partner.balance_data.last_updated || 'No Data');
            console.log('     - Balance Status:', partner.balance_data.balance_status || 'No Data');
          } else {
            console.log('   Balance Data: No balance data available');
          }
          
          console.log('   Current Balance (mapped):', partner.current_balance || 0);
          console.log('   Last Balance (mapped):', partner.last_balance || 0);
          console.log('   Balance Variance:', partner.balance_variance || 0);
        });
        
        // Check specifically for Kulman
        const kulman = data.partners.find(p => 
          p.name?.toLowerCase().includes('kulman')
        );
        
        if (kulman) {
          console.log('\n🎯 Kulman Specific Analysis:');
          console.log('============================');
          console.log('Name:', kulman.name);
          console.log('Short Code:', kulman.short_code);
          console.log('Has Balance Data:', !!kulman.balance_data);
          console.log('Current Balance:', kulman.current_balance);
          console.log('Balance Data Structure:', JSON.stringify(kulman.balance_data, null, 2));
        }
        
      } else {
        console.log('❌ No partners found in response');
      }
      
    } else {
      console.error('❌ Failed to fetch balance data:', response.status, response.statusText);
      const errorData = await response.text();
      console.error('Error details:', errorData);
    }

  } catch (error) {
    console.error('❌ Error during balance display test:', error);
  }
};

// Function to test specific partner balance
const testSpecificPartner = async (partnerName) => {
  console.log(`\n🎯 Testing balance display for ${partnerName}...`);
  
  try {
    const response = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      const partner = data.partners?.find(p => 
        p.name?.toLowerCase().includes(partnerName.toLowerCase())
      );
      
      if (partner) {
        console.log(`\n📊 ${partner.name} Balance Display Test:`);
        console.log('=====================================');
        
        // Test the display logic
        const utilityBalance = partner.balance_data?.utility_balance;
        const workingBalance = partner.balance_data?.working_balance;
        const chargesBalance = partner.balance_data?.charges_balance;
        const currentBalance = partner.current_balance;
        
        console.log('Display Logic Test:');
        console.log('- Primary Display (utility_balance):', utilityBalance ? `KSh ${utilityBalance.toLocaleString()}` : 'No Data');
        console.log('- Fallback Display (current_balance):', currentBalance > 0 ? `KSh ${currentBalance.toLocaleString()}` : 'No Data');
        console.log('- Working Balance:', workingBalance ? `KSh ${workingBalance.toLocaleString()}` : 'Not Available');
        console.log('- Charges Balance:', chargesBalance ? `KSh ${chargesBalance.toLocaleString()}` : 'Not Available');
        
        // Test the final display value
        const finalDisplayValue = utilityBalance ? utilityBalance : (currentBalance > 0 ? currentBalance : 'No Data');
        console.log('\nFinal Display Value:', finalDisplayValue);
        
      } else {
        console.error(`❌ Partner ${partnerName} not found`);
        console.log('Available partners:', data.partners?.map(p => p.name));
      }
    }
  } catch (error) {
    console.error(`❌ Error testing ${partnerName} balance display:`, error);
  }
};

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBalanceDisplay,
    testSpecificPartner
  };
}

// Run the script
if (typeof window === 'undefined') {
  console.log('🔍 Balance Display Test Script');
  console.log('==============================\n');
  
  // Test all partners
  testBalanceDisplay();
  
  // Uncomment to test specific partner
  // testSpecificPartner('Kulman');
}

