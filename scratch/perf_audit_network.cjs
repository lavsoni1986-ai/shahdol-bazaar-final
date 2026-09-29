const https = require('https');

function timeRequest(url, headers = {}) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const parsed = new URL(url);
    const req = https.request({
      hostname: parsed.hostname,
      port: 443,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        ...headers
      }
    }, (res) => {
      const tFirstByte = performance.now();
      let bytes = 0;
      res.on('data', chunk => bytes += chunk.length);
      res.on('end', () => {
        const tEnd = performance.now();
        resolve({
          url,
          status: res.statusCode,
          ttfbMs: Math.round(tFirstByte - t0),
          totalMs: Math.round(tEnd - t0),
          bytes,
          contentLength: res.headers['content-length'] ? Number(res.headers['content-length']) : bytes,
          contentEncoding: res.headers['content-encoding'] || 'none',
          cacheControl: res.headers['cache-control'] || 'none'
        });
      });
    });
    req.on('error', (err) => {
      resolve({ url, error: err.message, totalMs: Math.round(performance.now() - t0) });
    });
    req.end();
  });
}

async function run() {
  console.log("=== MEASURING NETWORK WATERFALL & RESOURCE SIZES ===\n");

  const resources = [
    { label: "Homepage HTML", url: "https://shahdolbazaar.com/" },
    { label: "Cloudinary Upload Widget (PARSER-BLOCKING)", url: "https://upload-widget.cloudinary.com/global/all.js" },
    { label: "Google Tag Manager", url: "https://www.googletagmanager.com/gtag/js?id=G-0XF6DJ74YS" },
    { label: "Google Fonts CSS", url: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@400;500;600&display=swap" },
    { label: "Main CSS Bundle", url: "https://shahdolbazaar.com/assets/index-BxYI2bc9.css" },
    { label: "Main JS Bundle (Entry)", url: "https://shahdolbazaar.com/assets/index-BX1EQzwa.js" },
    { label: "Vendor JS Chunk", url: "https://shahdolbazaar.com/assets/vendor-vXNJ9j65.js" },
    { label: "Framer Motion JS Chunk", url: "https://shahdolbazaar.com/assets/pkg-framer-motion-BYudeMXi.js" },
    { label: "Motion DOM JS Chunk", url: "https://shahdolbazaar.com/assets/pkg-motion-dom-DfBxfA55.js" },
    { label: "Icons JS Chunk", url: "https://shahdolbazaar.com/assets/icons-Bflgp9Yb.js" },
    { label: "Query Core JS Chunk", url: "https://shahdolbazaar.com/assets/pkg--tanstack-query-core-_SpRg2rq.js" },
    { label: "Radix JS Chunk", url: "https://shahdolbazaar.com/assets/radix-BHwiZKB_.js" },
    { label: "Service Worker (sw.js)", url: "https://shahdolbazaar.com/sw.js" },
    { label: "Featured Product/Shop Cloudinary Image", url: "https://res.cloudinary.com/dbz0kkwaj/image/upload/v1790020557/shahdol-bazaar/am7zunper44wqcl4mhpb.png" },
    { label: "API: Home Snapshot", url: "https://shahdolbazaar.com/api/marketplace/home-snapshot", headers: { 'x-district-slug': 'shahdol', 'x-district-id': '1' } },
    { label: "API: Local Pulse", url: "https://shahdolbazaar.com/api/local/pulse", headers: { 'x-district-slug': 'shahdol', 'x-district-id': '1' } },
    { label: "API: Auth Verify", url: "https://shahdolbazaar.com/api/auth/verify" },
    { label: "API: Districts List", url: "https://shahdolbazaar.com/api/districts" }
  ];

  for (const r of resources) {
    const res = await timeRequest(r.url, r.headers);
    console.log(`[${r.label}]`);
    console.log(`  Status: ${res.status} | TTFB: ${res.ttfbMs}ms | Total: ${res.totalMs}ms | Size: ${(res.bytes / 1024).toFixed(1)} KB (${res.contentEncoding})`);
    console.log(`  Cache-Control: ${res.cacheControl}\n`);
  }
}

run();
