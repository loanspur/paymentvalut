// Test Authentication Flow
// This script tests the complete authentication flow

const SUPABASE_URL = 'https://mapgmmiobityxaaevomp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hcGdtbWlvYml0eXhhYWV2b21wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1NjU1NzUsImV4cCI6MjA3MzE0MTU3NX0.a_CMOPbg08Pt2yA-FnrQbVYWD_a6cK2h40Zl7b6CUwo';

console.log('🔐 Testing Authentication Flow...\n');

async function testAuthFlow() {
  try {
    // Test 1: Health Check
    console.log('📊 Test 1: Health Check');
    const healthResponse = await fetch('https://paymentvalut-ju.vercel.app/api/health');
    const healthData = await healthResponse.json();
    console.log('Health Status:', healthResponse.status);
    console.log('Health Data:', JSON.stringify(healthData, null, 2));
    
    if (healthData.status === 'ok') {
      console.log('✅ Health check passed\n');
    } else {
      console.log('❌ Health check failed\n');
      return;
    }

    // Test 2: Login with test credentials
    console.log('🔑 Test 2: Login Test');
    const loginResponse = await fetch('https://paymentvalut-ju.vercel.app/api/auth/secure-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'password'
      })
    });

    const loginData = await loginResponse.json();
    console.log('Login Status:', loginResponse.status);
    console.log('Login Data:', JSON.stringify(loginData, null, 2));

    if (loginResponse.ok && loginData.success) {
      console.log('✅ Login successful');
      console.log('User Role:', loginData.user.role);
      
      // Extract cookies from response
      const setCookieHeader = loginResponse.headers.get('set-cookie');
      console.log('Set-Cookie Header:', setCookieHeader);
      
    } else {
      console.log('❌ Login failed:', loginData.error);
    }

  } catch (error) {
    console.log('❌ Error:', error.message);
  }
}

// Run the test
testAuthFlow().catch(console.error);

