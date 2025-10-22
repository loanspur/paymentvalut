// Simple test to check balance API
const testBalanceAPI = async () => {
  try {
    const response = await fetch('http://localhost:3000/api/balance/official-balances', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // You'll need to add a valid auth token here
        'Cookie': 'auth_token=your_token_here'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Balance API Response:', JSON.stringify(data, null, 2));
      
      // Check Kulman specifically
      const kulman = data.partners?.find(p => p.name?.toLowerCase().includes('kulman'));
      if (kulman) {
        console.log('\nKulman Balance Data:', JSON.stringify(kulman, null, 2));
      } else {
        console.log('\nKulman not found in partners list');
      }
    } else {
      console.error('API Error:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Test Error:', error);
  }
};

// Run the test
testBalanceAPI();

