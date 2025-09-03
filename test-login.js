const axios = require('axios');

async function testLogin() {
  console.log('Testing login to TOEQbank...\n');
  
  const credentials = {
    username: 'huckfinne',
    password: 'admin123'
  };
  
  try {
    // Test production API
    console.log('1. Testing production API health check...');
    try {
      const healthResponse = await axios.get('https://toeqbank-wxhxl.ondigitalocean.app/api/health');
      console.log('✅ Backend is running:', healthResponse.data);
    } catch (error) {
      console.log('❌ Backend health check failed:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
    }
    
    console.log('\n2. Testing login endpoint...');
    const loginResponse = await axios.post(
      'https://toeqbank-wxhxl.ondigitalocean.app/api/auth/login',
      credentials,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Login successful!');
    console.log('User:', loginResponse.data.user);
    console.log('Token received:', loginResponse.data.token ? 'Yes' : 'No');
    
  } catch (error) {
    console.log('\n❌ Login failed:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testLogin();