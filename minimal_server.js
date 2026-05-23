import { createServer } from 'http';

const server = createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello World\n');
});

server.listen(5004, '0.0.0.0', () => {
  console.log('Simple server listening on port 5004');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});