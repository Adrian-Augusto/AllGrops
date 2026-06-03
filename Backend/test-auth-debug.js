const axios = require('axios');

const API_URL = 'http://localhost:8080/api/v1';

async function testAuth() {
  console.log('=== Testing Backend Authentication ===\n');

  // Test 1: Register a new user
  console.log('1. Testing Register...');
  try {
    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      name: 'Test User',
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: 'TestPassword123!'
    });
    console.log('✅ Register successful');
    console.log('Response:', registerResponse.data);
    const token = registerResponse.data.accessToken;
    
    // Test 2: Login
    console.log('\n2. Testing Login...');
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: 'TestPassword123!'
    });
    console.log('✅ Login successful');
    console.log('Token received:', loginResponse.data.accessToken ? 'Yes' : 'No');
    const loginToken = loginResponse.data.accessToken;

    // Test 3: Protected route without token
    console.log('\n3. Testing protected route WITHOUT token (should fail with 401)...');
    try {
      await axios.get(`${API_URL}/auth/google/profile`);
      console.log('❌ Should have failed with 401');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly returned 401 without token');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Test 4: Protected route WITH token
    console.log('\n4. Testing protected route WITH token (should succeed)...');
    try {
      const profileResponse = await axios.get(`${API_URL}/auth/google/profile`, {
        headers: {
          'Authorization': `Bearer ${loginToken}`
        }
      });
      console.log('✅ Protected route successful with token');
      console.log('Profile data:', profileResponse.data);
    } catch (error) {
      console.log('❌ Failed with token:', error.response?.data || error.message);
    }

    // Test 5: Wrong token format
    console.log('\n5. Testing protected route with WRONG token format (should fail)...');
    try {
      await axios.get(`${API_URL}/auth/google/profile`, {
        headers: {
          'Authorization': loginToken // Missing "Bearer " prefix
        }
      });
      console.log('❌ Should have failed');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly returned 401 with wrong format');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
  }
}

testAuth();
