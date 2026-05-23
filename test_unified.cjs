const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5002,
  path: '/api/search/unified?q=biryani&districtId=2',
  headers: { 'x-district-slug': 'shahdol' },
  timeout: 5000
};

const req = http.get(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const json = JSON.parse(data);
      console.log('Intent:', json.data?.intent);
      console.log('Vendors:', json.data?.results?.vendors?.length);
      console.log('Products:', json.data?.results?.products?.length);
    } catch(e) {
      console.log('Raw:', data.substring(0, 200));
    }
    process.exit(0);
  });
});

req.on('error', (err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.error('Timeout');
  req.destroy();
  process.exit(1);
});
