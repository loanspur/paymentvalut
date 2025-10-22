// Test Safaricom API Calls
// This script will test the actual Safaricom API calls to identify issues

const testSafaricomAPI = async () => {
  console.log('🔍 Testing Safaricom API Calls...\n');

  try {
    // Step 1: Test OAuth Token Generation
    console.log('Step 1: Testing OAuth Token Generation...');
    
    // You'll need to replace these with actual credentials
    const testCredentials = {
      consumer_key: 'YOUR_CONSUMER_KEY',
      consumer_secret: 'YOUR_CONSUMER_SECRET',
      environment: 'sandbox' // or 'production'
    };

    const authUrl = testCredentials.environment === 'production'
      ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
      : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';

    const auth = btoa(`${testCredentials.consumer_key}:${testCredentials.consumer_secret}`);
    
    const authResponse = await fetch(authUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (authResponse.ok) {
      const authData = await authResponse.json();
      console.log('✅ OAuth token generated successfully');
      console.log('Access Token:', authData.access_token ? 'Present' : 'Missing');
      console.log('Expires In:', authData.expires_in || 'Unknown');
      
      // Step 2: Test Balance Check API
      console.log('\nStep 2: Testing Balance Check API...');
      
      const balanceUrl = testCredentials.environment === 'production'
        ? 'https://api.safaricom.co.ke/mpesa/accountbalance/v1/query'
        : 'https://sandbox.safaricom.co.ke/mpesa/accountbalance/v1/query';

      // You'll need to replace these with actual values
      const balanceRequest = {
        Initiator: 'YOUR_INITIATOR_NAME',
        SecurityCredential: 'YOUR_SECURITY_CREDENTIAL',
        CommandID: 'AccountBalance',
        PartyA: 'YOUR_SHORTCODE',
        IdentifierType: '4',
        Remarks: 'balance inquiry',
        QueueTimeOutURL: 'https://your-project.supabase.co/functions/v1/mpesa-balance-result',
        ResultURL: 'https://your-project.supabase.co/functions/v1/mpesa-balance-result'
      };

      console.log('Balance Request Format:');
      console.log(JSON.stringify(balanceRequest, null, 2));

      const balanceResponse = await fetch(balanceUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(balanceRequest)
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        console.log('✅ Balance check request sent successfully');
        console.log('Response Code:', balanceData.ResponseCode);
        console.log('Response Description:', balanceData.ResponseDescription);
        console.log('Conversation ID:', balanceData.ConversationID);
        console.log('Originator Conversation ID:', balanceData.OriginatorConversationID);
        
        if (balanceData.ResponseCode === '0') {
          console.log('✅ Request accepted by Safaricom');
          console.log('⏳ Waiting for callback...');
        } else {
          console.log('❌ Request rejected by Safaricom');
          console.log('Error:', balanceData.ResponseDescription);
        }
      } else {
        const errorText = await balanceResponse.text();
        console.log('❌ Balance check request failed');
        console.log('Status:', balanceResponse.status);
        console.log('Error:', errorText);
      }
    } else {
      const errorText = await authResponse.text();
      console.log('❌ OAuth token generation failed');
      console.log('Status:', authResponse.status);
      console.log('Error:', errorText);
    }

  } catch (error) {
    console.error('❌ Error during Safaricom API test:', error);
  }
};

// Function to test callback URL accessibility
const testCallbackURL = async () => {
  console.log('\n🔍 Testing Callback URL Accessibility...');
  
  try {
    const callbackUrl = 'https://your-project.supabase.co/functions/v1/mpesa-balance-result';
    
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        test: 'callback accessibility test'
      })
    });

    if (response.ok) {
      console.log('✅ Callback URL is accessible');
      console.log('Status:', response.status);
    } else {
      console.log('❌ Callback URL is not accessible');
      console.log('Status:', response.status);
      console.log('Error:', await response.text());
    }
  } catch (error) {
    console.error('❌ Error testing callback URL:', error);
  }
};

// Function to validate API request format
const validateAPIRequestFormat = () => {
  console.log('\n🔍 Validating API Request Format...');
  
  const requiredFields = [
    'Initiator',
    'SecurityCredential', 
    'CommandID',
    'PartyA',
    'IdentifierType',
    'Remarks',
    'QueueTimeOutURL',
    'ResultURL'
  ];

  const sampleRequest = {
    Initiator: 'YOUR_INITIATOR_NAME',
    SecurityCredential: 'YOUR_SECURITY_CREDENTIAL',
    CommandID: 'AccountBalance',
    PartyA: 'YOUR_SHORTCODE',
    IdentifierType: '4',
    Remarks: 'balance inquiry',
    QueueTimeOutURL: 'https://your-project.supabase.co/functions/v1/mpesa-balance-result',
    ResultURL: 'https://your-project.supabase.co/functions/v1/mpesa-balance-result'
  };

  console.log('Required Fields:');
  requiredFields.forEach(field => {
    const hasField = sampleRequest.hasOwnProperty(field);
    console.log(`- ${field}: ${hasField ? '✅' : '❌'}`);
  });

  console.log('\nSample Request Format:');
  console.log(JSON.stringify(sampleRequest, null, 2));

  console.log('\nValidation Notes:');
  console.log('- Initiator: Should be your initiator name');
  console.log('- SecurityCredential: Should be encrypted initiator password');
  console.log('- CommandID: Must be "AccountBalance"');
  console.log('- PartyA: Should be your M-Pesa shortcode');
  console.log('- IdentifierType: Must be "4" for organization');
  console.log('- Remarks: Can be any descriptive text');
  console.log('- QueueTimeOutURL: Must be accessible from Safaricom');
  console.log('- ResultURL: Must be accessible from Safaricom');
};

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testSafaricomAPI,
    testCallbackURL,
    validateAPIRequestFormat
  };
}

// Run the script
if (typeof window === 'undefined') {
  console.log('🔍 Safaricom API Test Script');
  console.log('============================\n');
  
  // Validate request format
  validateAPIRequestFormat();
  
  // Test callback URL
  testCallbackURL();
  
  // Uncomment to test actual API calls (requires real credentials)
  // testSafaricomAPI();
}

