#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');

// Test cases for validation
const TEST_CASES = [
  {
    name: 'Relative import to shared components',
    input: "import Button from '../../../shared/components/Button';",
    expected: "import Button from '@shared/components/Button';",
  },
  {
    name: 'Relative import to features',
    input: "import { CustomerForm } from '../../features/khach-hang';",
    expected: "import { CustomerForm } from '@features/khach-hang';",
  },
  {
    name: 'Relative import to utils',
    input: "import { formatDate } from '../utils/format';",
    expected: "import { formatDate } from '@utils/format';",
  },
  {
    name: 'Dynamic import',
    input: "const module = await import('./components/Modal');",
    expected: "const module = await import('@components/Modal');",
  },
  {
    name: 'Require statement',
    input: "const config = require('../config/app.js');",
    expected: "const config = require('@/config/app.js');",
  },
];

// Statistics
const validationStats = {
  totalFiles: 0,
  filesWithRelativeImports: 0,
  totalImports: 0,
  relativeImports: 0,
  aliasImports: 0,
  errors: [],
};

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(PROJECT_ROOT, filePath);

    // Count different types of imports
    const importRegex =
      /(?:import|export)(?:.*?from\s+)?['"`]([^'"`]+)['"`]|require\(['"`]([^'"`]+)['")`]|import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

    let match;
    const imports = [];

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2] || match[3];
      if (importPath) {
        imports.push({
          path: importPath,
          statement: match[0],
          line: content.substring(0, match.index).split('\n').length,
        });
      }
    }

    const relativeImports = imports.filter(
      imp => imp.path.startsWith('./') || imp.path.startsWith('../')
    );

    const aliasImports = imports.filter(imp => imp.path.startsWith('@'));

    validationStats.totalFiles++;
    validationStats.totalImports += imports.length;
    validationStats.relativeImports += relativeImports.length;
    validationStats.aliasImports += aliasImports.length;

    if (relativeImports.length > 0) {
      validationStats.filesWithRelativeImports++;
    }

    return {
      file: relativePath,
      totalImports: imports.length,
      relativeImports,
      aliasImports,
      imports,
    };
  } catch (error) {
    validationStats.errors.push(`Error analyzing ${filePath}: ${error.message}`);
    return null;
  }
}

async function runTestCases() {
  console.log('🧪 Running test cases...\n');

  let passed = 0;
  let failed = 0;

  try {
    // Import the migration functions
    const { processImports } = await import('./migrate-aliases-enhanced.js');

    TEST_CASES.forEach((testCase, index) => {
      try {
        // Create a temporary file path for testing
        const tempFilePath = path.join(SRC_DIR, 'test.js');

        const { content } = processImports(testCase.input, tempFilePath);

        if (content.includes(testCase.expected.split("'")[1]) || content === testCase.expected) {
          console.log(`✅ Test ${index + 1}: ${testCase.name}`);
          passed++;
        } else {
          console.log(`❌ Test ${index + 1}: ${testCase.name}`);
          console.log(`   Input:    ${testCase.input}`);
          console.log(`   Expected: ${testCase.expected}`);
          console.log(`   Got:      ${content}`);
          failed++;
        }
      } catch (error) {
        console.log(`❌ Test ${index + 1}: ${testCase.name} - Error: ${error.message}`);
        failed++;
      }
    });
  } catch (importError) {
    console.log(`❌ Could not import migration functions: ${importError.message}`);
    failed = TEST_CASES.length;
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  return { passed, failed };
}

function validateProject() {
  console.log('🔍 Analyzing project structure...\n');

  // Get all JS/TS files
  const files = [];
  function getFiles(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !['node_modules', 'build', 'dist'].includes(item)) {
        getFiles(fullPath);
      } else if (/\.(js|jsx|ts|tsx)$/.test(item)) {
        files.push(fullPath);
      }
    });
  }

  getFiles(SRC_DIR);

  // Analyze each file
  const analysis = files.map(analyzeFile).filter(Boolean);

  // Generate report
  console.log('📋 Project Analysis Report');
  console.log('='.repeat(50));
  console.log(`Total files: ${validationStats.totalFiles}`);
  console.log(`Files with relative imports: ${validationStats.filesWithRelativeImports}`);
  console.log(`Total imports: ${validationStats.totalImports}`);
  console.log(`Relative imports: ${validationStats.relativeImports}`);
  console.log(`Alias imports: ${validationStats.aliasImports}`);

  if (validationStats.relativeImports > 0) {
    console.log('\n🔧 Files that need migration:');
    analysis
      .filter(a => a.relativeImports.length > 0)
      .slice(0, 10) // Show first 10
      .forEach(a => {
        console.log(`  📄 ${a.file} (${a.relativeImports.length} relative imports)`);
        a.relativeImports.slice(0, 3).forEach(imp => {
          console.log(`    └─ Line ${imp.line}: ${imp.path}`);
        });
        if (a.relativeImports.length > 3) {
          console.log(`    └─ ... and ${a.relativeImports.length - 3} more`);
        }
      });

    if (analysis.filter(a => a.relativeImports.length > 0).length > 10) {
      console.log(
        `  ... and ${analysis.filter(a => a.relativeImports.length > 0).length - 10} more files`
      );
    }
  }

  if (validationStats.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    validationStats.errors.forEach(error => console.log(`  • ${error}`));
  }

  return analysis;
}

function checkBuildAfterMigration() {
  console.log('🔨 Testing build after migration...');

  try {
    // Try to build the project
    execSync('npm run build', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 60000, // 60 seconds timeout
    });

    console.log('✅ Build successful - migration appears to be working');
    return true;
  } catch (error) {
    console.log('❌ Build failed - there may be issues with the migration');
    console.log('Error output:', error.stdout?.toString() || error.stderr?.toString());
    return false;
  }
}

function checkESLint() {
  console.log('🔍 Running ESLint checks...');

  try {
    execSync('npm run lint', {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      timeout: 30000, // 30 seconds timeout
    });

    console.log('✅ ESLint passed - no linting errors');
    return true;
  } catch (error) {
    console.log('⚠️ ESLint found issues (this may be normal)');
    const output = error.stdout?.toString() || error.stderr?.toString();
    if (output.includes('alias') || output.includes('import')) {
      console.log('Import-related ESLint issues detected - review manually');
    }
    return false;
  }
}

async function main() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'test': {
        const { failed } = await runTestCases();
        process.exit(failed > 0 ? 1 : 0);
        break;
      }
      case 'analyze':
        validateProject();
        break;

      case 'build': {
        const buildSuccess = checkBuildAfterMigration();
        process.exit(buildSuccess ? 0 : 1);
        break;
      }
      case 'lint': {
        const lintSuccess = checkESLint();
        process.exit(lintSuccess ? 0 : 1);
        break;
      }
      case 'full':
        console.log('🚀 Running full validation suite...\n');

        // Run all tests
        await runTestCases();
        console.log('');

        validateProject();
        console.log('');

        checkBuildAfterMigration();
        console.log('');

        checkESLint();

        console.log('\n🎉 Full validation complete!');
        break;

      default:
        console.log(`
Migration Test & Validation Tool

Usage: node test-migration.js <command>

Commands:
  test      Run unit tests for migration logic
  analyze   Analyze project for relative imports
  build     Test if project builds after migration
  lint      Run ESLint checks
  full      Run all validation tests

Examples:
  node test-migration.js analyze    # Check current state
  node test-migration.js test       # Test migration logic
  node test-migration.js full       # Full validation suite
`);
        break;
    }
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
