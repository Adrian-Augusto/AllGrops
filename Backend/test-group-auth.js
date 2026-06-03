const axios = require('axios');

const API_URL = 'http://localhost:8080/api/v1';

async function testGroupAuth() {
  console.log('=== Testing Group Authentication & Authorization ===\n');

  let token = '';
  let groupId = '';

  // Test 1: Register and login to get token
  console.log('1. Registering and logging in...');
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  try {
    await axios.post(`${API_URL}/auth/register`, {
      name: 'Test User',
      email: testEmail,
      password: 'TestPassword123!'
    });
  } catch (error) {
    // User might already exist
  }

  const loginResponse = await axios.post(`${API_URL}/auth/login`, {
    email: testEmail,
    password: 'TestPassword123!'
  });
  token = loginResponse.data.accessToken;
  console.log('✅ Login successful, token obtained');

  // Accept terms
  console.log('\n1.5. Accepting terms...');
  await axios.post(`${API_URL}/terms/accept`, { accepted: true }, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log('✅ Terms accepted');

  // Test 2: Create a group (should succeed with token)
  console.log('\n2. Creating group with authentication...');
  try {
    const createResponse = await axios.post(
      `${API_URL}/groups`,
      {
        title: 'Test Group',
        description: 'A test group',
        link: 'https://discord.gg/test',
        platform: 'Discord',
        photoUrl: 'uploads/groups/test.jpg',
        category: 'Tecnologia',
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    groupId = createResponse.data.id;
    console.log('✅ Group created successfully:', groupId);
  } catch (error) {
    console.log('❌ Failed to create group:', error.response?.data || error.message);
  }

  // Test 3: Try to access groups without token (should return 401)
  console.log('\n3. Testing GET /groups without token (should return 401)...');
  try {
    await axios.get(`${API_URL}/groups`);
    console.log('❌ Should have returned 401');
  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('✅ Correctly returned 401 without token');
    } else {
      console.log('❌ Unexpected error:', error.response?.status);
    }
  }

  // Test 4: Try to access groups with token (should succeed)
  console.log('\n4. Testing GET /groups with token (should succeed)...');
  try {
    await axios.get(`${API_URL}/groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Successfully accessed groups with token');
  } catch (error) {
    console.log('❌ Failed with token:', error.response?.data || error.message);
  }

  // Test 5: Try to edit group with token (should succeed for owner)
  console.log('\n5. Testing PATCH /groups/:id with owner token (should succeed)...');
  try {
    await axios.patch(
      `${API_URL}/groups/${groupId}`,
      { description: 'Updated description' },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    console.log('✅ Successfully edited group as owner');
  } catch (error) {
    console.log('❌ Failed to edit as owner:', error.response?.data || error.message);
  }

  // Test 6: Create another user and try to edit the group (should return 403)
  console.log('\n6. Testing PATCH /groups/:id with non-owner token (should return 403)...');
  const anotherEmail = process.env.TEST_USER_EMAIL_2 || 'test2@example.com';
  try {
    await axios.post(`${API_URL}/auth/register`, {
      name: 'Another User',
      email: anotherEmail,
      password: 'AnotherPassword123!'
    });
  } catch (error) {
    // User might already exist
  }

  const anotherLogin = await axios.post(`${API_URL}/auth/login`, {
    email: anotherEmail,
    password: 'AnotherPassword123!'
  });
  const anotherToken = anotherLogin.data.accessToken;

  try {
    await axios.patch(
      `${API_URL}/groups/${groupId}`,
      { description: 'Hacked description' },
      {
        headers: { Authorization: `Bearer ${anotherToken}` }
      }
    );
    console.log('❌ Should have returned 403 for non-owner');
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('✅ Correctly returned 403 for non-owner');
    } else {
      console.log('❌ Unexpected error:', error.response?.status);
    }
  }

  // Test 7: Try to delete group with non-owner token (should return 403)
  console.log('\n7. Testing DELETE /groups/:id with non-owner token (should return 403)...');
  try {
    await axios.delete(`${API_URL}/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${anotherToken}` }
    });
    console.log('❌ Should have returned 403 for non-owner');
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log('✅ Correctly returned 403 for non-owner');
    } else {
      console.log('❌ Unexpected error:', error.response?.status);
    }
  }

  // Test 8: Delete group with owner token (should succeed)
  console.log('\n8. Testing DELETE /groups/:id with owner token (should succeed)...');
  try {
    await axios.delete(`${API_URL}/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('✅ Successfully deleted group as owner');
  } catch (error) {
    console.log('❌ Failed to delete as owner:', error.response?.data || error.message);
  }

  console.log('\n=== Test Complete ===');
}

testGroupAuth();
