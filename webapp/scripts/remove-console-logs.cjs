const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src');

function removeConsoleLogsFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Remove all console.log statements (single/multi-line, with/without semicolon)
  const newContent = content.replace(/(^|\s*)console\.log\s*\(.*?\);?\s*$/gm, '');
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
