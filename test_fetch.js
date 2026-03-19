const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3013,
  path: '/profile/me',
  method: 'GET',
  headers: {
    'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidGVuYW50X2lkIjoxLCJyb2xlIjoiYWRtaW4iLCJlbWFpbCI6ImFkbWluQHBzaWZsdXguY29tIiwibmFtZSI6IkFkbWluaXN0cmFkb3IiLCJpYXQiOjE3NzM4NzQ1NTYsImV4cCI6MTc3NDQ3OTM1Nn0.cGrk8xrlZbEWgrvXVdflEmB8FRXraBYh04beT84820E'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    console.log("RESPONSE:", data);
  });
});

req.on('error', (e) => {
  console.error(e);
});
req.end();
