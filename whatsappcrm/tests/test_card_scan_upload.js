const axios = require('axios');

async function testScan() {
  try {
    console.log('1. Attempting login to backend at http://127.0.0.1:3010...');
    const loginRes = await axios.post('http://127.0.0.1:3010/api/user/login', {
      email: 'user@user.com',
      password: 'admin123'
    }, { timeout: 10000 });

    const token = loginRes.data?.token;
    console.log('Login successful, got token:', !!token);

    if (!token) {
      console.error('No token in login response:', loginRes.data);
      process.exit(1);
    }

    console.log('2. Testing /api/card_scan/upload with base64 image (JSON payload as sent by mobile app)...');
    // 1x1 transparent PNG in base64
    const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    
    const scanRes = await axios.post('http://127.0.0.1:3010/api/card_scan/upload', {
      image: sampleBase64,
      event_id: null,
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('Scan Response Status:', scanRes.status);
    console.log('Scan Response Data:', JSON.stringify(scanRes.data, null, 2));

    if (scanRes.data?.success && (scanRes.data?.contact || scanRes.data?.parsed)) {
      console.log('>>> SUCCESS: Scan endpoint returned 200 and parsed contact!');
      process.exit(0);
    } else {
      console.error('>>> FAILED: Response was not success:', scanRes.data);
      process.exit(1);
    }
  } catch (err) {
    if (err.response) {
      console.error('HTTP Error Status:', err.response.status);
      console.error('HTTP Error Data:', err.response.data);
    } else {
      console.error('Request Error:', err.message);
    }
    process.exit(1);
  }
}

testScan();
