const axios = require('axios');
const API = 'http://localhost:5001/api/v1';

async function test() {
  try {
    const res = await axios.post(`${API}/auth/login`, {
      email: 'test@example.com',
      password: 'wrongpassword'
    });
    console.log(`[OK] login: ${res.status}`);
  } catch(err) {
    console.log(`[FAIL] login: ${err.response?.status || err.message}`);
    console.log(err.response?.data);
  }
}
test();
