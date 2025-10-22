// Test Balance Check Flow
// This script will help test the balance check process step by step

const testBalanceCheck = async () => {
  console.log('🔍 Starting Balance Check Investigation...\n');

  try {
    // Step 1: Test the trigger-check API
    console.log('Step 1: Testing balance trigger API...');
    const triggerResponse = await fetch('http://localhost:3000/api/balance/trigger-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add authentication headers here
      },
      body: JSON.stringify({
        all_tenants: true,
        force_check: true
      })
    });

    if (triggerResponse.ok) {
      const triggerData = await triggerResponse.json();
      console.log('✅ Trigger API Response:', JSON.stringify(triggerData, null, 2));
    } else {
      console.error('❌ Trigger API Error:', triggerResponse.status, triggerResponse.statusText);
      const errorData = await triggerResponse.text();
      console.error('Error Details:', errorData);
    }

    // Step 2: Check balance requests status
    console.log('\nStep 2: Checking balance requests status...');
    const statusResponse = await fetch('http://localhost:3000/api/balance/trigger-check', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status API Response:', JSON.stringify(statusData, null, 2));
    } else {
      console.error('❌ Status API Error:', statusResponse.status, statusResponse.statusText);
    }

    // Step 3: Check official balances
    console.log('\nStep 3: Checking official balances...');
    const balanceResponse = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (balanceResponse.ok) {
      const balanceData = await balanceResponse.json();
      console.log('✅ Official Balances Response:', JSON.stringify(balanceData, null, 2));
      
      // Check specifically for Kulman
      const kulman = balanceData.partners?.find(p => 
        p.name?.toLowerCase().includes('kulman') || 
        p.short_code?.toLowerCase().includes('kulman')
      );
      
      if (kulman) {
        console.log('\n🎯 Kulman Balance Data:', JSON.stringify(kulman, null, 2));
      } else {
        console.log('\n❌ Kulman not found in partners list');
        console.log('Available partners:', balanceData.partners?.map(p => p.name));
      }
    } else {
      console.error('❌ Official Balances API Error:', balanceResponse.status, balanceResponse.statusText);
    }

  } catch (error) {
    console.error('❌ Test Error:', error);
  }
};

// Function to test specific partner
const testSpecificPartner = async (partnerId) => {
  console.log(`\n🔍 Testing balance check for partner: ${partnerId}`);
  
  try {
    const response = await fetch('http://localhost:3000/api/balance/trigger-check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        partner_id: partnerId,
        force_check: true
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Partner-specific balance check result:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Partner-specific balance check error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Partner-specific test error:', error);
  }
};

// Function to check real-time status
const checkRealtimeStatus = async () => {
  console.log('\n🔍 Checking real-time status...');
  
  try {
    const response = await fetch('http://localhost:3000/api/balance/realtime-status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Real-time status:', JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Real-time status error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('❌ Real-time status test error:', error);
  }
};

// Run the tests
const runAllTests = async () => {
  await testBalanceCheck();
  await checkRealtimeStatus();
  
  // Uncomment to test specific partner
  // await testSpecificPartner('your-partner-id-here');
};

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testBalanceCheck,
    testSpecificPartner,
    checkRealtimeStatus,
    runAllTests
  };
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  runAllTests();
}

