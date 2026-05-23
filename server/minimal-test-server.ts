import { createServer } from "http";

const PORT = 3001;

console.log(`Testing raw Node.js HTTP server on port ${PORT}...`);

const server = createServer((req, res) => {
  console.log(`📨 REQUEST: ${req.method} ${req.url}`);

  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      ok: true,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    }));
  } else {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ RAW SERVER: listen() callback fired on port ${PORT}`);
});

server.on("listening", () => {
  console.log(`✅ RAW SERVER: listening event fired on port ${PORT}`);
  const address = server.address();
  console.log(`📍 Server address info:`, address);
});

server.on("error", (err) => {
  console.error(`❌ SERVER ERROR:`, err.message);
  console.error(`❌ Error code:`, err.code);
});

server.on("connection", (socket) => {
  console.log(`📡 CONNECTION: New connection from ${socket.remoteAddress}:${socket.remotePort}`);
});

process.on("uncaughtException", (err) => {
  console.error("❌ UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ UNHANDLED REJECTION:", err);
});

// Heartbeat
setInterval(() => {
  console.log("💓 RAW HEARTBEAT:", new Date().toISOString());
}, 3000);