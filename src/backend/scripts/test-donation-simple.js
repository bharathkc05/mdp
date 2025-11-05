import fetch from 'node-fetch';

async function test() {
  try {
    // Login
    const loginRes = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({email: 'donor@test.com', password: 'Donor123!'})
    });
    const {token} = await loginRes.json();
    console.log('Token:', token);

    // Donate
    const donateRes = await fetch('http://localhost:3000/api/donate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({causeId: '69072880ce660164b4c798c7', amount: 100})
    });
    
    const result = await donateRes.json();
    console.log('Status:', donateRes.status);
    console.log('Result:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

test();
