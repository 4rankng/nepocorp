const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src');

function removeConsoleLogsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // First pass: Remove standard console.log statements (single/multi-line, with/without semicolon)
  let newContent = content.replace(/(^|\s*)console\.log\s*\(.*?\);?\s*$/gm, '');

  // Second pass: Remove JSX-style console.log statements within curly braces
  newContent = newContent.replace(/\{\s*console\.log\s*\([^}]*\)\s*\}/g, '');

  // Third pass: Handle multi-line JSX console.log statements
  newContent = newContent.replace(/\{\s*console\.log\s*\(([\s\S]*?)\)\s*\}/g, '');

  // Fourth pass: Clean up any empty lines that might be left
  newContent = newContent.replace(/^\s*$\n/gm, '');

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Removed console.log from: ${filePath}`);
  }
}

function walkAndClean(dir) {
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkAndClean(fullPath);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      removeConsoleLogsFromFile(fullPath);
    }
  });
}

walkAndClean(TARGET_DIR);
