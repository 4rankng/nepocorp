#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..');

// Logging utilities
function log(message, level = 'info') {
  const prefix = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    step: '🔄',
  }[level];
  console.log(`${prefix} ${message}`);
}

// Execute a command and return its output
function execCommand(command, options = {}) {
  try {
    return execSync(command, {
      cwd: PROJECT_ROOT,
      stdio: options.quiet ? 'pipe' : 'inherit',
      encoding: 'utf8',
      ...options,
    });
  } catch (error) {
    if (options.throwOnError !== false) {
      throw error;
    }
    return error;
  }
}

// Get the latest backup path
function getLatestBackup() {
  const backupDir = path.join(PROJECT_ROOT, '.migration-backup');
  if (!fs.existsSync(backupDir)) {
    return null;
  }

  const backups = fs
    .readdirSync(backupDir)
    .filter(name => name.startsWith('backup-'))
    .sort()
    .reverse();

  return backups.length > 0 ? path.join(backupDir, backups[0]) : null;
}

// Main migration workflow
async function runMigration() {
  try {
    log('Starting comprehensive migration workflow...', 'info');
    log('Step 1: Creating backup...', 'step');

    // Create backup
    execCommand('npm run migrate:backup');
    const backupPath = getLatestBackup();
    if (!backupPath) {
      throw new Error('Failed to create backup');
    }
    log(`Backup created at: ${backupPath}`, 'success');

    // Run dry-run first
    log('Step 2: Performing dry run...', 'step');
    const dryRunOutput = execCommand('npm run migrate:aliases:dry', { quiet: true });
    if (dryRunOutput.toString().includes('❌')) {
      throw new Error('Dry run failed - found potential issues');
    }
    log('Dry run completed successfully', 'success');

    // Perform actual migration
    log('Step 3: Performing migration...', 'step');
    execCommand('npm run migrate:aliases');
    log('Migration completed', 'success');

    // Validate the results
    log('Step 4: Validating changes...', 'step');
    const validationOutput = execCommand('npm run migrate:validate', {
      quiet: true,
      throwOnError: false,
    });

    // Check validation results
    const validationString = validationOutput.toString();
    const hasBuildError = validationString.includes('Build failed');
    const hasUnmigratedFiles = validationString.includes('Files that need migration');
    const hasLintErrors = validationString.includes('ESLint found critical issues');

    if (hasBuildError || (hasUnmigratedFiles && hasLintErrors)) {
      throw new Error('Validation failed - restoring from backup');
    }

    // If we have only unmigrated files but they are intentional (like package.json imports)
    // or only lint warnings (not errors), we consider it a success with warnings
    if (hasUnmigratedFiles || validationString.includes('ESLint found issues')) {
      log('Migration completed with warnings:', 'warning');
      log(validationString);
    } else {
      log('Validation completed successfully', 'success');
    }

    // Run build as final check
    log('Step 5: Running final build check...', 'step');
    execCommand('npm run build');

    log('🎉 Migration workflow completed successfully!', 'success');
  } catch (error) {
    log('Error during migration:', 'error');
    log(error.message, 'error');

    if (getLatestBackup()) {
      log('Restoring from backup...', 'step');
      execCommand('npm run migrate:restore');
      log('Restored from backup', 'success');
    }

    process.exit(1);
  }
}

// Run the migration
runMigration();
