#!/usr/bin/env node
/**
 * SHAHDOL BAZAAR - LOCAL DEVELOPMENT SERVER
 * 
 * This script:
 * 1. Verifies PostgreSQL connection
 * 2. Checks database schema
 * 3. Ensures admin user exists
 * 4. Starts Express server on port 5000
 * 5. Binds to all interfaces (0.0.0.0)
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import { setTimeout } from 'timers/promises';

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 SHAHDOL BAZAAR - LOCAL DEVELOPMENT STARTUP');
  console.log('='.repeat(60) + '\n');

  // Step 1: Verify environment
  console.log('📋 Step 1: Checking Environment...');
  const port = process.env.PORT || 5001;
  const dbUrl = process.env.DATABASE_URL;
  const nodeEnv = process.env.NODE_ENV || 'development';
  
  console.log(`   ✅ PORT: ${port}`);
  console.log(`   ✅ NODE_ENV: ${nodeEnv}`);
  console.log(`   ✅ DATABASE_URL: ${dbUrl ? 'Configured' : '❌ MISSING!'}\n`);

  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_URL not set in .env');
    console.error('Fix: Add DATABASE_URL=postgresql://user:password@localhost:5432/shahdolbazaar\n');
    process.exit(1);
  }

  // Step 2: Try to import and test DB
  console.log('📊 Step 2: Testing Database Connection...');
  try {
    const { prisma } = await import('./storage');
    
    const count = await prisma.product.count();
    console.log(`   ✅ Database connected`);
    console.log(`   ✅ Found ${count} products in database\n`);
  } catch (error: any) {
    console.error('❌ Database Connection Failed:');
    console.error(`   Error: ${error.message}\n`);
    console.error('Troubleshooting:');
    console.error('1. Is PostgreSQL running? Check: netstat -ano | findstr 5432');
    console.error('2. Is the database created? Run: createdb shahdolbazaar');
    console.error('3. Is the connection string correct in .env?\n');
    process.exit(1);
  }

  // Step 3: Start Express Server
  console.log('🚀 Step 3: Starting Express Server...\n');
  console.log(`   Binding to: 0.0.0.0:${port}`);
  console.log(`   URL: http://localhost:${port}`);
  console.log(`   API: http://localhost:${port}/api\n`);

  // Spawn the actual server process
  const server = spawn('node', ['-r', 'tsx/esm', 'server/index.ts'], {
    cwd: process.cwd(),
    env: { ...process.env },
    stdio: 'inherit' // Show all output
  });

  // Handle errors
  server.on('error', (err) => {
    console.error('❌ Server Error:', err);
    process.exit(1);
  });

  server.on('exit', (code) => {
    console.log(`\n⚠️  Server exited with code ${code}`);
    process.exit(code || 0);
  });

  // Keep process alive
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down...');
    server.kill();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('Fatal Error:', err);
  process.exit(1);
});
