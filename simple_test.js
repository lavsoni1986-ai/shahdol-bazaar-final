import http from 'http';

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/',
  method: 'GET'
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  res.on('data', (chunk) => {
    console.log(`Response: ${chunk.toString().slice(0, 200)}`);
  });
});

req.on('error', (e) => {
  console.error(`Problem: ${e.message}`);
});

req.end();