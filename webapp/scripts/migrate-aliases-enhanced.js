#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

// Path aliases configuration - order matters for specificity
const ALIASES = [
  { alias: '@components', dir: 'components' },
  { alias: '@features', dir: 'features' },
  { alias: '@layouts', dir: 'layouts' },
  { alias: '@services', dir: 'services' },
  { alias: '@hooks', dir: 'hooks' },
  { alias: '@utils', dir: 'utils' },
  { alias: '@contexts', dir: 'contexts' },
  { alias: '@routes', dir: 'routes' },
  { alias: '@constants', dir: 'constants' },
  { alias: '@types', dir: 'types' },
  { alias: '@assets', dir: 'assets' },
  { alias: '@shared', dir: 'shared' },
  { alias: '@', dir: '' }, // Root alias - must be last for specificity
];

// Statistics
const stats = {
  filesProcessed: 0,
  filesModified: 0,
  importsUpdated: 0,
  errors: [],
};

// Logging utilities
function log(message, level = 'info') {
  const prefix = {
    info: '📝',
    success: '✅',
    warning: '⚠️',
    error: '❌',
    verbose: '🔍',
  }[level];

  if (level === 'verbose' && !VERBOSE) return;
  console.log(`${prefix} ${message}`);
}

// Get all JS/JSX/TS/TSX files recursively
function getFiles(dir, fileList = [], excludeDirs = ['node_modules', 'build', 'dist', '.git']) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);

      // Skip if file/dir doesn't exist (broken symlinks)
      if (!fs.existsSync(filePath)) return;

      const stat = fs.statSync(filePath);

      // Skip excluded directories
      if (excludeDirs.includes(file)) {
        return;
      }

      if (stat.isDirectory()) {
        getFiles(filePath, fileList, excludeDirs);
      } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
        fileList.push(filePath);
      }
    });
  } catch (error) {
    stats.errors.push(`Error reading directory ${dir}: ${error.message}`);
  }

  return fileList;
}

// Resolve import path to absolute path
function resolveImportPath(importPath, currentFile) {
  const dir = path.dirname(currentFile);
  let resolvedPath = path.resolve(dir, importPath);

  // Try different extensions if file doesn't exist
  const extensions = [
    '',
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '/index.js',
    '/index.jsx',
    '/index.ts',
    '/index.tsx',
  ];

  for (const ext of extensions) {
    const testPath = resolvedPath + ext;
    if (fs.existsSync(testPath)) {
      return fs.statSync(testPath).isDirectory() ? testPath : testPath;
    }
  }

  return null;
}

// Convert relative path to alias path
function getAliasPath(importPath, currentFile) {
  // Skip non-relative imports
  if (!importPath.startsWith('./') && !importPath.startsWith('../')) {
    return null;
  }

  // Resolve the import to absolute path
  const resolvedPath = resolveImportPath(importPath, currentFile);
  if (!resolvedPath) {
    log(
      `Could not resolve import: ${importPath} in ${path.relative(PROJECT_ROOT, currentFile)}`,
      'verbose'
    );
    return null;
  }

  // Check if the path is within src directory
  if (!resolvedPath.startsWith(SRC_DIR)) {
    return null;
  }

  // Get relative path from src
  let relFromSrc = path.relative(SRC_DIR, resolvedPath);

  // Remove file extension for the alias
  relFromSrc = relFromSrc.replace(/\.(js|jsx|ts|tsx)$/, '');

  // Remove /index suffix
  relFromSrc = relFromSrc.replace(/\/index$/, '');

  // Find the best matching alias (most specific first)
  for (const { alias, dir } of ALIASES) {
    if (dir === '') {
      // Root alias - matches everything
      return `${alias}/${relFromSrc}`.replace(/\/+/g, '/');
    } else if (relFromSrc.startsWith(dir + '/') || relFromSrc === dir) {
      const remainingPath = relFromSrc.substring(dir.length).replace(/^\//, '');
      return remainingPath ? `${alias}/${remainingPath}` : alias;
    }
  }

  return null;
}

// Process import/export statements in content
function processImports(content, filePath) {
  let modified = false;
  let importCount = 0;

  // Enhanced regex to match various import/export patterns
  const patterns = [
    // ES6 imports
    /import\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"`]([^'"`]+)['"`]/g,
    // ES6 exports
    /export\s+(?:(?:[\w*\s{},]*)\s+from\s+)?['"`]([^'"`]+)['"`]/g,
    // Dynamic imports
    /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
    // Require statements
    /require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g,
  ];

  let newContent = content;

  patterns.forEach(pattern => {
    newContent = newContent.replace(pattern, (match, importPath) => {
      const aliasPath = getAliasPath(importPath, filePath);

      if (aliasPath) {
        importCount++;
        const newMatch = match.replace(importPath, aliasPath);
        log(`  ${importPath} → ${aliasPath}`, 'verbose');
        return newMatch;
      }

      return match;
    });
  });

  if (newContent !== content) {
    modified = true;
    stats.importsUpdated += importCount;
  }

  return { content: newContent, modified, importCount };
}

// Process a single file
function processFile(filePath) {
  try {
    stats.filesProcessed++;

    const originalContent = fs.readFileSync(filePath, 'utf8');
    const { content, modified, importCount } = processImports(originalContent, filePath);

    if (modified) {
      if (!DRY_RUN) {
        fs.writeFileSync(filePath, content, 'utf8');
      }

      stats.filesModified++;
      const relativePath = path.relative(PROJECT_ROOT, filePath);
      log(
        `Updated ${importCount} import${importCount === 1 ? '' : 's'} in ${relativePath}`,
        'success'
      );

      return true;
    }

    return false;
  } catch (error) {
    stats.errors.push(`Error processing ${filePath}: ${error.message}`);
    log(`Error processing ${path.relative(PROJECT_ROOT, filePath)}: ${error.message}`, 'error');
    return false;
  }
}

// Validate configuration
function validateConfig() {
  log('Validating configuration...', 'info');

  // Check if src directory exists
  if (!fs.existsSync(SRC_DIR)) {
    throw new Error(`Source directory not found: ${SRC_DIR}`);
  }

  // Check if alias directories exist
  for (const { alias, dir } of ALIASES) {
    if (dir && !fs.existsSync(path.join(SRC_DIR, dir))) {
      log(`Warning: Alias directory does not exist: ${alias} -> ${dir}`, 'warning');
    }
  }

  log('Configuration valid', 'success');
}

// Generate report
function generateReport() {
  console.log('\n📊 Migration Report');
  console.log('='.repeat(50));
  console.log(`Files processed: ${stats.filesProcessed}`);
  console.log(`Files modified: ${stats.filesModified}`);
  console.log(`Total imports updated: ${stats.importsUpdated}`);

  if (stats.errors.length > 0) {
    console.log(`\n❌ Errors encountered: ${stats.errors.length}`);
    stats.errors.forEach(error => console.log(`  • ${error}`));
  }

  if (DRY_RUN) {
    console.log('\n🔍 This was a dry run - no files were actually modified');
    console.log('Run without --dry-run to apply changes');
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Enhanced Path Alias Migration Tool');
    console.log('=====================================\n');

    if (DRY_RUN) {
      log('Running in DRY RUN mode - no files will be modified', 'warning');
    }

    // Validate configuration
    validateConfig();

    // Get all files
    log('Scanning for files...', 'info');
    const files = getFiles(SRC_DIR);
    log(`Found ${files.length} files to process`, 'info');

    if (files.length === 0) {
      log('No files found to process', 'warning');
      return;
    }

    // Process files
    log('\nProcessing files...', 'info');
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      process.stdout.write(`\r🔄 Progress: ${i + 1}/${files.length} files...`);
      processFile(file);
    }

    console.log('\n');

    // Generate report
    generateReport();

    // Run formatter if files were modified and not in dry-run mode
    if (stats.filesModified > 0 && !DRY_RUN) {
      log('\nRunning code formatter...', 'info');
      try {
        // Try different package managers and formatters
        const formatCommands = [
          'npm run format',
          'yarn format',
          'pnpm format',
          'npx prettier --write src/**/*.{js,jsx,ts,tsx}',
        ];

        let formatted = false;
        for (const cmd of formatCommands) {
          try {
            execSync(cmd, { stdio: 'pipe', cwd: PROJECT_ROOT });
            log('Code formatted successfully', 'success');
            formatted = true;
            break;
          } catch (e) {
            // Try next command
          }
        }

        if (!formatted) {
          log('Could not run formatter - please format manually', 'warning');
        }
      } catch (error) {
        log(`Formatter error: ${error.message}`, 'warning');
      }
    }

    log('\n🎉 Migration completed successfully!', 'success');
  } catch (error) {
    log(`Fatal error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Enhanced Path Alias Migration Tool

Usage: node migrate-aliases-enhanced.js [options]

Options:
  --dry-run    Run without making any changes (preview mode)
  --verbose    Show detailed output
  --help, -h   Show this help message

Examples:
  node migrate-aliases-enhanced.js --dry-run    # Preview changes
  node migrate-aliases-enhanced.js --verbose    # Run with detailed output
  node migrate-aliases-enhanced.js             # Run migration
`);
  process.exit(0);
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

export { getAliasPath, processImports, getFiles };
