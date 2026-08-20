const axios = require('axios');
const API = 'http://localhost:5001/api/v1';

async function test() {
  try {
    const res = await axios.post(`${API}/auth/refresh-token`, {
      refreshToken: 'invalid_token'
    });
    console.log(`[OK] refresh: ${res.status}`);
    console.log(res.data);
  } catch(err) {
    console.log(`[FAIL] refresh: ${err.response?.status || err.message}`);
    console.log(err.response?.data);
  }
}
test();
