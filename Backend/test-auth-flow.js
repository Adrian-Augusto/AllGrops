const axios = require('axios');

const API = 'http://localhost:8080/api/v1';

async function testAuthFlow() {
  try {
    console.log('\n🔍 Testing Google Auth Exchange Code Flow\n');

    // Step 1: Simulate exchange-code endpoint
    console.log('📝 Step 1: Exchange-code with test code');
    
    // We need to manually call googleLogin first to generate a code
    // For testing, we'll use a test user directly
    
    console.log('Note: This test requires a valid temp code from the Google callback.');
    console.log('To test properly:');
    console.log('1. Start the backend: npm run start');
    console.log('2. Go to: http://localhost:8080/api/v1/auth/google');
    console.log('3. Complete Google OAuth to get the temp code');
    console.log('4. Replace the code below and run this test');
    
    const testCode = process.argv[2];
    
    if (!testCode) {
      console.log('\n❌ No code provided. Usage: node test-auth-flow.js <temp_code>');
      return;
    }

    // Create axios instance with credentials
    const client = axios.create({
      baseURL: API,
      withCredentials: true,
      jar: new (require('tough-cookie')).CookieJar(),
    });

    console.log(`\n📤 Exchanging code: ${testCode.substring(0, 10)}...`);
    
    const response = await client.post('/auth/exchange-code', { code: testCode });

    console.log('\n✅ Exchange-code response:');
    console.log(JSON.stringify(response.data, null, 2));

    // Step 2: Check if cookie was set
    console.log('\n📋 Response headers:');
    console.log('Set-Cookie:', response.headers['set-cookie']);

    // Step 3: Try to access protected endpoint with cookie
    console.log('\n📝 Step 2: Access protected endpoint with cookie');
    
    const profileResponse = await client.get('/auth/google/profile');
    
    console.log('\n✅ Google profile response:');
    console.log(JSON.stringify(profileResponse.data, null, 2));

    console.log('\n✅ Auth flow test PASSED!');

  } catch (error) {
    console.error('\n❌ Error:', error.response?.data || error.message);
    process.exit(1);
  }
}

testAuthFlow();
