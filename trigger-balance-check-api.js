// Trigger Balance Check API Script
// This script will trigger fresh balance checks for all partners

const triggerBalanceChecks = async () => {
  console.log('🚀 Starting Fresh Balance Check Process...\n');

  try {
    // Step 1: Trigger balance check for all partners
    console.log('Step 1: Triggering balance check for all partners...');
    
    const triggerResponse = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add authentication headers if needed
        'Cookie': 'auth_token=your_token_here' // Replace with actual token
      },
      body: JSON.stringify({
        force_refresh: true
      })
    });

    if (triggerResponse.ok) {
      const triggerData = await triggerResponse.json();
      console.log('✅ Balance check triggered successfully:', JSON.stringify(triggerData, null, 2));
    } else {
      console.error('❌ Failed to trigger balance check:', triggerResponse.status, triggerResponse.statusText);
      const errorData = await triggerResponse.text();
      console.error('Error details:', errorData);
    }

    // Step 2: Wait a bit for the balance checks to process
    console.log('\nStep 2: Waiting for balance checks to process...');
    await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

    // Step 3: Check the status of balance checks
    console.log('Step 3: Checking balance check status...');
    
    const statusResponse = await fetch('http://localhost:3000/api/balance/realtime-status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Real-time status:', JSON.stringify(statusData, null, 2));
    } else {
      console.error('❌ Failed to get real-time status:', statusResponse.status, statusResponse.statusText);
    }

    // Step 4: Check updated balance data
    console.log('\nStep 4: Checking updated balance data...');
    
    const balanceResponse = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('✅ Updated balance data:', JSON.stringify(balanceData, null, 2));
      
      // Check specifically for Kulman
      const kulman = balanceData.partners?.find(p => 
        p.name?.toLowerCase().includes('kulman')
      );
      
      if (kulman) {
        console.log('\n🎯 Kulman Updated Balance Data:');
        console.log('- Current Balance:', kulman.balance_data?.utility_balance || 'No Data');
        console.log('- Working Balance:', kulman.balance_data?.working_balance || 'No Data');
        console.log('- Data Freshness:', kulman.data_freshness || 'Unknown');
        console.log('- Last Updated:', kulman.balance_data?.last_updated || 'Unknown');
      }
    } else {
      console.error('❌ Failed to get balance data:', balanceResponse.status, balanceResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Error during balance check process:', error);
  }
};

// Function to trigger balance check for specific partner
const triggerSpecificPartner = async (partnerName) => {
  console.log(`\n🎯 Triggering balance check for ${partnerName}...`);
  
  try {
    // First, get the partner ID
    const balanceResponse = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      const partner = balanceData.partners?.find(p => 
        p.name?.toLowerCase().includes(partnerName.toLowerCase())
      );
      
      if (partner) {
        console.log(`Found partner: ${partner.name} (ID: ${partner.id})`);
        
        // Trigger balance check for this specific partner
        const triggerResponse = await fetch('http://localhost:3000/api/balance/official-balances', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            force_refresh: true,
            partner_id: partner.id
          })
        });

        if (triggerResponse.ok) {
          const triggerData = await triggerResponse.json();
          console.log(`✅ Balance check triggered for ${partner.name}:`, JSON.stringify(triggerData, null, 2));
        } else {
          console.error(`❌ Failed to trigger balance check for ${partner.name}:`, triggerResponse.status, triggerResponse.statusText);
        }
      } else {
        console.error(`❌ Partner ${partnerName} not found`);
        console.log('Available partners:', balanceData.partners?.map(p => p.name));
      }
    }
  } catch (error) {
    console.error(`❌ Error triggering balance check for ${partnerName}:`, error);
  }
};

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    triggerBalanceChecks,
    triggerSpecificPartner
  };
}

// Run the script
if (typeof window === 'undefined') {
  console.log('🔍 Balance Check Trigger Script');
  console.log('===============================\n');
  
  // Trigger for all partners
  triggerBalanceChecks();
  
  // Uncomment to trigger for specific partner
  // triggerSpecificPartner('Kulman');
}

