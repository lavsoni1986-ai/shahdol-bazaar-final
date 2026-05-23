#!/usr/bin/env node
/**
 * BASELINE SNAPSHOT CAPTURE
 * Starts server → queries endpoints → saves JSON → stops server
 * 
 * Usage: node scripts/capture-baseline.cjs
 */

const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..'); // Root from scripts/
const BASELINE_DIR = path.join(PROJECT_ROOT, 'tests', 'baseline');
const ENDPOINTS_DIR = path.join(BASELINE_DIR, 'endpoints');
const QUERIES_DIR = path.join(BASELINE_DIR, 'queries');

const BASE_URL = 'http://localhost:5002';
const DISTRICT_ID = 2;
const DISTRICT_SLUG = 'shahdol';

// Ensure directories exist
[ENDPOINTS_DIR, QUERIES_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Test definition: { name, endpoint, params, category }
const TESTS = [
  // Static endpoints (no query)
  { name: 'stores_default', endpoint: '/api/marketplace/stores', params: { districtId: DISTRICT_ID }, category: 'endpoint' },
  { name: 'products_trending', endpoint: '/api/marketplace/products', params: { districtId: DISTRICT_ID }, category: 'endpoint' },
  { name: 'stats_overview', endpoint: '/api/stats/hospitals', params: { districtId: DISTRICT_ID }, category: 'endpoint' }, // hospitals
  { name: 'stats_bus', endpoint: '/api/stats/bus-timetable', params: { districtId: DISTRICT_ID }, category: 'endpoint' },
  
  // AI Search queries
  { name: 'doctor_search', endpoint: '/api/search/global', params: { q: 'doctor', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'kirana_intent', endpoint: '/api/search/global', params: { q: 'kirana', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'bus_timing', endpoint: '/api/search/global', params: { q: 'bus to rewa', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'hospital_emergency', endpoint: '/api/search/global', params: { q: 'emergency hospital', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'plumber_service', endpoint: '/api/search/global', params: { q: 'plumber', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'biryani_food', endpoint: '/api/search/global', params: { q: 'biryani', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'electronics_shop', endpoint: '/api/search/global', params: { q: 'electronics', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'dentist', endpoint: '/api/search/global', params: { q: 'dentist', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'fresh_vegetables', endpoint: '/api/search/global', params: { q: 'fresh vegetables', districtId: DISTRICT_ID }, category: 'query' },
  { name: 'mobile_repair', endpoint: '/api/search/global', params: { q: 'mobile repair', districtId: DISTRICT_ID }, category: 'query' },
];

function waitForServer(maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get(`${BASE_URL}/health`, (res) => {
        clearInterval(interval);
        resolve();
      });
      req.on('error', () => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Server failed to start'));
        }
      });
      req.setTimeout(2000, () => {
        req.destroy();
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Server startup timeout'));
        }
      });
    }, 1000);
  });
}

function fetchWithHeaders(endpoint, params, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    Object.keys(params).forEach(k => url.searchParams.append(k, params[k]));
    
    const options = {
      headers: {
        'Accept': 'application/json',
        ...headers
      },
      timeout: 15000
    };

    const req = http.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
          json: null
        });
      });
    });
    req.on('error', reject);
  });
}

async function captureAll() {
  console.log('🚀 Starting baseline capture...\n');
  
  // Start server
  console.log('Starting server...');
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  // Pipe output to console (for debugging)
  server.stdout.on('data', d => process.stdout.write(d.toString()));
  server.stderr.on('data', d => process.stderr.write(d.toString()));

  try {
    console.log('⏳ Waiting for server...');
    await waitForServer();
    console.log('✅ Server ready\n');

    // Run tests
    for (const test of TESTS) {
      try {
        const saveDir = test.category === 'endpoint' ? ENDPOINTS_DIR : QUERIES_DIR;
        console.log(`📡 ${test.name} [${test.category}]`);
        console.log(`   ${test.endpoint}?${new URLSearchParams(test.params).toString()}`);
        
        const result = await fetchWithHeaders(test.endpoint, test.params, {
          'x-district-slug': DISTRICT_SLUG
        });

        const output = {
          _meta: {
            name: test.name,
            endpoint: test.endpoint,
            params: test.params,
            timestamp: new Date().toISOString(),
            districtId: DISTRICT_ID,
            districtSlug: DISTRICT_SLUG
          },
          response: {
            status: result.status,
            headers: result.headers,
            data: result.json !== null ? result.json : result.body
          }
        };

        const filePath = path.join(saveDir, `${test.name}.json`);
        fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
        console.log(`   ✅ Saved (HTTP ${result.status})\n`);
      } catch (err) {
        console.error(`   ❌ Failed: ${err.message}\n`);
      }

      // Rate limiting delay
      await new Promise(r => setTimeout(r, 300));
    }

    // Create summary
    const summary = {
      generatedAt: new Date().toISOString(),
      server: {
        port: 5002,
        districtId: DISTRICT_ID,
        districtSlug: DISTRICT_SLUG
      },
      totalTests: TESTS.length,
      categories: {
        endpoint: TESTS.filter(t => t.category === 'endpoint').length,
        query: TESTS.filter(t => t.category === 'query').length
      }
    };
    fs.writeFileSync(path.join(BASELINE_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

    console.log('📦 Baseline capture complete!');
    console.log(`   Endpoints: ${ENDPOINTS_DIR}`);
    console.log(`   Queries: ${QUERIES_DIR}`);
    console.log(`   Summary: ${path.join(BASELINE_DIR, 'summary.json')}`);

  } finally {
    // Always stop server
    console.log('\n🛑 Stopping server...');
    server.kill('SIGTERM');
    await new Promise(r => setTimeout(r, 2000));
    process.exit(0);
  }
}

// Error handling
process.on('SIGINT', () => {
  console.log('\n⚠️ Interrupted');
  process.exit(1);
});
process.on('SIGTERM', () => {
  process.exit(0);
});

captureAll().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
