// Test the OTP API directly to see what's happening
require('dotenv').config();

async function testOTPAPIDirectly() {
  try {
    console.log('🧪 Testing OTP API Directly...');
    console.log('================================');
    
    // Test the OTP generation API endpoint
    const response = await fetch('http://localhost:3000/api/auth/otp/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'justmurenga@gmail.com'
      })
    });
    
    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', data);
    
    if (response.ok) {
      console.log('✅ OTP API call successful');
      if (data.success) {
        console.log('✅ OTP generated successfully');
        console.log('Message:', data.message);
      } else {
        console.log('❌ OTP generation failed');
        console.log('Error:', data.error);
      }
    } else {
      console.log('❌ OTP API call failed');
      console.log('Error:', data.error || 'Unknown error');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('');
    console.log('💡 Make sure the development server is running:');
    console.log('   npm run dev');
    console.log('   or');
    console.log('   yarn dev');
  }
}

testOTPAPIDirectly();



