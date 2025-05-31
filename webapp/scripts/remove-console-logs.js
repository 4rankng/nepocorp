const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src');

function removeConsoleLogsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;

  // Remove standard console.log statements (single line with semicolon)
  newContent = newContent.replace(/^\s*console\.log\s*\(.*?\);\s*$/gm, '');
  
  // Remove standard console.log statements (single line without semicolon)
  newContent = newContent.replace(/^\s*console\.log\s*\(.*?\)\s*$/gm, '');
  
  // Remove console.log statements within JSX curly braces (single line)
  newContent = newContent.replace(/\{\s*console\.log\s*\([^}]*\)\s*\}/g, '');
  
  // Remove multi-line console.log statements
  newContent = newContent.replace(/^\s*console\.log\s*\(\s*[\s\S]*?\)\s*;?\s*$/gm, '');
  
  // Remove console.log statements that span multiple lines within JSX
  newContent = newContent.replace(/\{\s*console\.log\s*\(\s*[\s\S]*?\)\s*\}/g, '');
  
  // Clean up multiple consecutive empty lines (replace with single empty line)
  newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  
  // Clean up trailing whitespace on empty lines
  newContent = newContent.replace(/^[ \t]+$/gm, '');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`✓ Removed console.log from: ${path.relative(process.cwd(), filePath)}`);
    return true;
  }
  return false;
}

function walkAndClean(dir) {
  let filesProcessed = 0;
  let filesModified = 0;

  function walk(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules and other build directories
        if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
          walk(fullPath);
        }
      } else if (item.endsWith('.js') || item.endsWith('.jsx') || item.endsWith('.ts') || item.endsWith('.tsx')) {
        filesProcessed++;
        const modified = removeConsoleLogsFromFile(fullPath);
        if (modified) {
          filesModified++;
        }
      }
    }
  }

  console.log('🧹 Starting console.log cleanup...');
  walk(dir);
  console.log(`\n📊 Summary:`);
  console.log(`   Files processed: ${filesProcessed}`);
  console.log(`   Files modified: ${filesModified}`);
  console.log(`   Console.log statements removed! ✨`);
}

// Run the cleanup
walkAndClean(TARGET_DIR);
