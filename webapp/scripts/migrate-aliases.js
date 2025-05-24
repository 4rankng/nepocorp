import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.join(__dirname, '..');
const SRC_DIR = path.join(PROJECT_ROOT, 'src');
const ALIASES = {
  '@components': 'components',
  '@features': 'features',
  '@layouts': 'layouts',
  '@services': 'services',
  '@hooks': 'hooks',
  '@utils': 'utils',
  '@contexts': 'contexts',
  '@routes': 'routes',
  '@constants': 'constants',
  '@types': 'types',
  '@assets': 'assets',
  '@shared': 'shared',
};

// Get all JS/JSX/TS/TSX files recursively
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip node_modules and build directories
    if (file === 'node_modules' || file === 'build' || file === 'dist') {
      return;
    }

    if (stat.isDirectory()) {
      getFiles(filePath, fileList);
    } else if (/\.(js|jsx|ts|tsx)$/.test(file)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Convert relative path to alias path
function getAliasPath(relativePath, currentFile) {
  // Skip node modules and non-relative imports
  if (
    relativePath.startsWith('.') === false ||
    relativePath.startsWith('@') ||
    relativePath.startsWith('~')
  ) {
    return null;
  }

  // Get the absolute path of the imported file
  const dir = path.dirname(currentFile);
  const absPath = path.resolve(dir, relativePath);

  // Skip if the file doesn't exist (could be a package)
  if (
    !fs.existsSync(absPath) &&
    !fs.existsSync(`${absPath}.js`) &&
    !fs.existsSync(`${absPath}.ts`)
  ) {
    return null;
  }

  // Check if the path is in src directory
  if (!absPath.startsWith(SRC_DIR)) {
    return null;
  }

  // Get relative path from src
  const relFromSrc = path.relative(SRC_DIR, absPath);
  const firstDir = relFromSrc.split(path.sep)[0];

  // Find matching alias
  for (const [alias, dir] of Object.entries(ALIASES)) {
    if (firstDir === dir) {
      const newPath = path.join(alias, relFromSrc.substring(dir.length + 1));
      return newPath.split(path.sep).join('/'); // Normalize path separators
    }
  }

  return null;
}

// Process a single file
function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Match import/require statements
  const importRegex =
    /(?:import|export)(?:.*?from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
  let match;
  const replacements = [];

  // First, collect all replacements
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1] || match[2];
    const aliasPath = getAliasPath(importPath, filePath);

    if (aliasPath) {
      const originalImport = match[0];
      const newImport = originalImport.replace(importPath, aliasPath);
      replacements.push({ original: originalImport, replacement: newImport });
    }
  }

  // Apply replacements in reverse order to avoid offset issues
  if (replacements.length > 0) {
    for (let i = replacements.length - 1; i >= 0; i--) {
      const { original, replacement } = replacements[i];
      content = content.replace(original, replacement);
    }
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Updated imports in ${path.relative(PROJECT_ROOT, filePath)}`);
    return true;
  }

  return false;
}

// Main function
function main() {
  console.log('🚀 Starting path alias migration...\n');

  // Get all JS/TS files
  const files = getFiles(SRC_DIR);
  console.log(`🔍 Found ${files.length} files to process\n`);

  let updatedCount = 0;

  // Process each file
  files.forEach((file, index) => {
    process.stdout.write(`\r🔄 Processing ${index + 1}/${files.length} files...`);
    if (processFile(file)) {
      updatedCount++;
    }
  });

  console.log(`\n\n✅ Migration complete!`);
  console.log(`📊 Updated ${updatedCount} out of ${files.length} files\n`);

  // Run formatter
  console.log('🎨 Running code formatter...');
  try {
    execSync('yarn format', { stdio: 'inherit' });
    console.log('✨ Formatting complete!');
  } catch (error) {
    console.error('❌ Error running formatter:', error.message);
  }
}

// Run the script
main();
