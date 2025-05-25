#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const BACKUP_DIR = path.join(PROJECT_ROOT, '.migration-backup');

function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupPath = path.join(BACKUP_DIR, `backup-${timestamp}`);

  console.log('📦 Creating backup before migration...');

  // Create backup directory if it doesn't exist
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // Copy src directory to backup
  try {
    if (process.platform === 'win32') {
      execSync(`xcopy "${path.join(PROJECT_ROOT, 'src')}" "${backupPath}" /E /I /Q`, {
        stdio: 'inherit',
      });
    } else {
      execSync(`cp -r "${path.join(PROJECT_ROOT, 'src')}" "${backupPath}"`, { stdio: 'inherit' });
    }

    console.log(`✅ Backup created at: ${path.relative(PROJECT_ROOT, backupPath)}`);
    return backupPath;
  } catch (error) {
    console.error('❌ Failed to create backup:', error.message);
    throw error;
  }
}

function restoreBackup(backupPath) {
  console.log('🔄 Restoring from backup...');

  try {
    // Remove current src
    if (fs.existsSync(path.join(PROJECT_ROOT, 'src'))) {
      if (process.platform === 'win32') {
        execSync(`rmdir /S /Q "${path.join(PROJECT_ROOT, 'src')}"`, { stdio: 'inherit' });
      } else {
        execSync(`rm -rf "${path.join(PROJECT_ROOT, 'src')}"`, { stdio: 'inherit' });
      }
    }

    // Restore from backup
    if (process.platform === 'win32') {
      execSync(`xcopy "${backupPath}" "${path.join(PROJECT_ROOT, 'src')}" /E /I /Q`, {
        stdio: 'inherit',
      });
    } else {
      execSync(`cp -r "${backupPath}" "${path.join(PROJECT_ROOT, 'src')}"`, { stdio: 'inherit' });
    }

    console.log('✅ Backup restored successfully');
  } catch (error) {
    console.error('❌ Failed to restore backup:', error.message);
    throw error;
  }
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) {
    console.log('No backups found');
    return [];
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('backup-'))
    .sort()
    .reverse();

  console.log('📋 Available backups:');
  backups.forEach((backup, index) => {
    const backupPath = path.join(BACKUP_DIR, backup);
    const stats = fs.statSync(backupPath);
    console.log(`  ${index + 1}. ${backup} (${stats.mtime.toLocaleString()})`);
  });

  return backups;
}

function cleanupOldBackups(keepCount = 5) {
  if (!fs.existsSync(BACKUP_DIR)) {
    return;
  }

  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter(name => name.startsWith('backup-'))
    .sort();

  if (backups.length > keepCount) {
    const toDelete = backups.slice(0, backups.length - keepCount);

    console.log(`🧹 Cleaning up ${toDelete.length} old backup(s)...`);

    toDelete.forEach(backup => {
      const backupPath = path.join(BACKUP_DIR, backup);
      try {
        if (process.platform === 'win32') {
          execSync(`rmdir /S /Q "${backupPath}"`, { stdio: 'pipe' });
        } else {
          execSync(`rm -rf "${backupPath}"`, { stdio: 'pipe' });
        }
        console.log(`  Deleted: ${backup}`);
      } catch (error) {
        console.error(`  Failed to delete ${backup}:`, error.message);
      }
    });
  }
}

// Main function
function main() {
  const command = process.argv[2];

  switch (command) {
    case 'create':
      createBackup();
      cleanupOldBackups();
      break;

    case 'restore': {
      const backups = listBackups();
      if (backups.length === 0) {
        console.log('❌ No backups available to restore');
        process.exit(1);
      }

      const backupIndex = parseInt(process.argv[3]) || 1;
      if (backupIndex < 1 || backupIndex > backups.length) {
        console.log('❌ Invalid backup index');
        process.exit(1);
      }

      const selectedBackup = backups[backupIndex - 1];
      restoreBackup(path.join(BACKUP_DIR, selectedBackup));
      break;
    }
    case 'list':
      listBackups();
      break;

    case 'clean': {
      const keepCount = parseInt(process.argv[3]) || 5;
      cleanupOldBackups(keepCount);
      break;
    }
    default:
      console.log(`
Migration Backup Tool

Usage: node backup-tool.js <command> [options]

Commands:
  create              Create a backup before migration
  restore [index]     Restore from backup (default: latest)
  list                List available backups
  clean [count]       Keep only the latest N backups (default: 5)

Examples:
  node backup-tool.js create
  node backup-tool.js list
  node backup-tool.js restore 1
  node backup-tool.js clean 3
`);
      break;
  }
}

main();
