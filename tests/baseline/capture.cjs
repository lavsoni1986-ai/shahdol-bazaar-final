const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:5002';
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`${BASE_URL}/health`, (res) => {
          resolve(res);
        });
        req.on('error', reject);
        req.setTimeout(2000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      console.log('✅ Server is up');
      return true;
    } catch (e) {
      console.log(`⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
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
        const result = {
          status: res.statusCode,
          headers: res.headers,
          body: data
        };
        
        // Try to parse JSON
        try {
          result.json = JSON.parse(data);
        } catch (e) {
          result.json = null;
          result.error = 'Not JSON';
        }
        resolve(result);
      });
    });
    req.on('error', reject);
  });
}

(async () => {
  console.log('🚀 Starting server...');
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    cwd: PROJECT_ROOT,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  server.stdout.on('data', d => process.stdout.write(d.toString()));
  server.stderr.on('data', d => process.stderr.write(d.toString()));

  if (!await waitForServer()) {
    console.error('❌ Server failed to start');
    server.kill();
    process.exit(1);
  }

  // Use known default district
  const districtId = 2;
  const districtSlug = 'shahdol'; // Common default slug
  
  console.log(`🏢 Using district: ID=${districtId}, slug=${districtSlug}\n`);

  const tests = [
    { name: 'search_doctor', endpoint: '/api/search/global', params: { q: 'doctor', districtId } },
    { name: 'search_kirana', endpoint: '/api/search/global', params: { q: 'kirana', districtId } },
    { name: 'search_bus', endpoint: '/api/search/global', params: { q: 'bus', districtId } },
    { name: 'search_grocery', endpoint: '/api/search/global', params: { q: 'grocery', districtId } },
    { name: 'search_hospital', endpoint: '/api/search/global', params: { q: 'hospital', districtId } },
    { name: 'search_electronics', endpoint: '/api/search/global', params: { q: 'electronics', districtId } },
    { name: 'stores_all', endpoint: '/api/marketplace/stores', params: { districtId } },
    { name: 'products_all', endpoint: '/api/marketplace/products', params: { districtId } },
    { name: 'stats_hospitals', endpoint: '/api/stats/hospitals', params: { districtId } },
    { name: 'stats_bus', endpoint: '/api/stats/bus-timetable', params: { districtId } },
  ];

  const baselineDir = path.join(__dirname);
  if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });

  for (const test of tests) {
    try {
      console.log(`📡 ${test.name}: ${test.endpoint}`);
      const result = await fetchWithHeaders(test.endpoint, test.params, {
        'x-district-slug': districtSlug
      });
      
      const filePath = path.join(baselineDir, `${test.name}.json`);
      const output = {
        url: `${BASE_URL}${test.endpoint}`,
        method: 'GET',
        params: test.params,
        headers: { 'x-district-slug': districtSlug },
        response: {
          status: result.status,
          headers: result.headers,
          body: result.json !== null ? result.json : result.body
        }
      };
      
      fs.writeFileSync(filePath, JSON.stringify(output, null, 2));
      console.log(`  ✅ ${test.name}.json — HTTP ${result.status}${result.json ? ' (JSON)' : ' (non-JSON)'}\n`);
    } catch (err) {
      console.error(`  ❌ ${test.name}: ${err.message}\n`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  // Save summary
  const summary = {
    capturedAt: new Date().toISOString(),
    district: { id: districtId, slug: districtSlug, source: 'hardcoded (default fallback)' },
    endpoints: tests.map(t => ({ name: t.name, endpoint: t.endpoint, params: t.params }))
  };
  fs.writeFileSync(path.join(baselineDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log('📦 Baseline capture complete! Summary saved.');

  server.kill('SIGTERM');
  process.exit(0);
})();

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
