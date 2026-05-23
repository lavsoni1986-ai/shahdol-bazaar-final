// scripts/daily-backup.ts
// ============================================
// DAILY BACKUP SYSTEM FOR BHARATOS
// ============================================

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('❌ DATABASE_URL not set');
  process.exit(1);
}

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);

async function backupDatabase() {
  console.log('📦 Backing up PostgreSQL database...');

  const backupFile = path.join(BACKUP_DIR, `bharatos-db-${timestamp}.sql`);

  try {
    // Use pg_dump for PostgreSQL
    const command = `pg_dump "${DB_URL}" > "${backupFile}"`;
    execSync(command, { stdio: 'inherit' });

    console.log(`✅ Database backup saved: ${backupFile}`);

    // Compress if possible (optional)
    // execSync(`gzip "${backupFile}"`);

    return backupFile;
  } catch (error) {
    console.error('❌ Database backup failed:', error);
    throw error;
  }
}

async function backupUploads() {
  console.log('📁 Backing up uploads directory...');

  const uploadsDir = './uploads';
  const backupFile = path.join(BACKUP_DIR, `bharatos-uploads-${timestamp}.tar.gz`);

  if (!fs.existsSync(uploadsDir)) {
    console.log('⚠️ Uploads directory not found, skipping');
    return null;
  }

  try {
    // Create tar.gz of uploads
    execSync(`tar -czf "${backupFile}" "${uploadsDir}"`, { stdio: 'inherit' });

    console.log(`✅ Uploads backup saved: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('❌ Uploads backup failed:', error);
    throw error;
  }
}

async function backupEnvironment() {
  console.log('🔐 Backing up environment (non-secret)...');

  const envBackup = {
    timestamp,
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT,
    // DO NOT backup secrets like JWT_SECRET, OPENAI_API_KEY
    backupDir: BACKUP_DIR,
    version: process.env.npm_package_version || 'unknown'
  };

  const backupFile = path.join(BACKUP_DIR, `bharatos-env-${timestamp}.json`);

  fs.writeFileSync(backupFile, JSON.stringify(envBackup, null, 2));

  console.log(`✅ Environment backup saved: ${backupFile}`);
  return backupFile;
}

async function cleanupOldBackups() {
  console.log('🧹 Cleaning up old backups (keep last 7 days)...');

  const files = fs.readdirSync(BACKUP_DIR);
  const now = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  let deletedCount = 0;

  for (const file of files) {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    if (now - stats.mtime.getTime() > sevenDays) {
      fs.unlinkSync(filePath);
      deletedCount++;
    }
  }

  console.log(`✅ Cleaned up ${deletedCount} old backup files`);
}

async function main() {
  try {
    console.log('🚀 Starting BharatOS daily backup...');

    const backups = await Promise.all([
      backupDatabase(),
      backupUploads(),
      backupEnvironment()
    ]);

    await cleanupOldBackups();

    console.log('✅ Daily backup completed successfully');
    console.log('📋 Backup files:', backups.filter(Boolean));

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

main();