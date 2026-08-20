const axios = require('axios');
const API = 'http://localhost:5001/api/v1';

async function test() {
  const routes = [
    '/jobs',
    '/health',
    '/auth/me'
  ];
  for (const route of routes) {
    try {
      const res = await axios.get(`${API}${route}`);
      console.log(`[OK] ${route}: ${res.status}`);
    } catch(err) {
      console.log(`[FAIL] ${route}: ${err.response?.status || err.message}`);
    }
  }
}
test();
