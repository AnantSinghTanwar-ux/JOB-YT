const axios = require('axios');
axios.get('http://localhost:5001/api/v1/health')
  .then(res => console.log(res.data))
  .catch(err => console.error(err.message));
