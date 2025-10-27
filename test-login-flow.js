// Test the complete login flow to see where it's failing
require('dotenv').config();

async function testLoginFlow() {
  try {
    console.log('🧪 Testing Complete Login Flow...');
    console.log('===================================');
    
    // Step 1: Test login
    console.log('🔐 Step 1: Testing login...');
    const loginResponse = await fetch('http://localhost:3000/api/auth/secure-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include', // Include cookies
      body: JSON.stringify({
        email: 'justmurenga@gmail.com',
        password: 'your_password_here' // Replace with actual password
      })
    });
    
    console.log('Login Response Status:', loginResponse.status);
    const loginData = await loginResponse.json();
    console.log('Login Response Data:', loginData);
    
    if (loginResponse.ok) {
      console.log('✅ Login successful');
      console.log('Requires OTP:', loginData.requires_otp);
      
      if (loginData.requires_otp) {
        console.log('');
        console.log('🔐 Step 2: Testing OTP generation...');
        
        // Step 2: Test OTP generation
        const otpResponse = await fetch('http://localhost:3000/api/auth/otp/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include', // Include cookies
        });
        
        console.log('OTP Response Status:', otpResponse.status);
        const otpData = await otpResponse.json();
        console.log('OTP Response Data:', otpData);
        
        if (otpResponse.ok) {
          console.log('✅ OTP generation successful');
          console.log('OTP sent to phone and email');
        } else {
          console.log('❌ OTP generation failed');
          console.log('Error:', otpData.error);
        }
      }
    } else {
      console.log('❌ Login failed');
      console.log('Error:', loginData.error);
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

testLoginFlow();



