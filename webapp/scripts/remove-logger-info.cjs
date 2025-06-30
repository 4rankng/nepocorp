const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '../src');
const DRY_RUN_FILE = path.join(__dirname, '../noinfo.tmp');

function removeLoggerInfoAndConsoleLogFromFile(filePath, dryRun = false) {
  const content = fs.readFileSync(filePath, 'utf8');
  let newContent = content;
  const originalContent = content;

  // Remove logger.info statements - single line with semicolon
  newContent = newContent.replace(/^\s*logger\.info\s*\(.*?\);\s*$/gm, '');

  // Remove logger.info statements - single line without semicolon
  newContent = newContent.replace(/^\s*logger\.info\s*\(.*?\)\s*$/gm, '');

  // Remove logger.info statements within JSX curly braces (single line)
  newContent = newContent.replace(/\{\s*logger\.info\s*\([^}]*\)\s*\}/g, '');

  // Remove multi-line logger.info statements
  newContent = newContent.replace(/^\s*logger\.info\s*\(\s*[\s\S]*?\)\s*;?\s*$/gm, '');

  // Remove logger.info statements that span multiple lines within JSX
  newContent = newContent.replace(/\{\s*logger\.info\s*\(\s*[\s\S]*?\)\s*\}/g, '');

  // Remove console.log statements - single line with semicolon
  newContent = newContent.replace(/^\s*console\.log\s*\(.*?\);\s*$/gm, '');

  // Remove console.log statements - single line without semicolon
  newContent = newContent.replace(/^\s*console\.log\s*\(.*?\)\s*$/gm, '');

  // Remove console.log statements within JSX curly braces (single line)
  newContent = newContent.replace(/\{\s*console\.log\s*\([^}]*\)\s*\}/g, '');

  // Remove multi-line console.log statements
  newContent = newContent.replace(/^\s*console\.log\s*\(\s*[\s\S]*?\)\s*;?\s*$/gm, '');

  // Remove console.log statements that span multiple lines within JSX
  newContent = newContent.replace(/\{\s*console\.log\s*\(\s*[\s\S]*?\)\s*\}/g, '');

  // Remove arrow function console.log statements (e.g., onEdit={customer => console.log('Edit:', customer)})
  newContent = newContent.replace(/=>\s*console\.log\s*\([^)]*\)/g, '=> {}');

  // Remove JSX prop console.log statements (e.g., onEdit={customer => console.log('Edit:', customer)})
  newContent = newContent.replace(/=\{[^}]*=>\s*console\.log\s*\([^}]*\)\}/g, '={() => {}}');

  // Remove console.log statements in arrow functions and inline expressions
  newContent = newContent.replace(/=>\s*console\.log\s*\([^)]*\)/g, '=> {}');

  // Remove console.log statements in JSX prop assignments
  newContent = newContent.replace(/(\w+)=\{[^}]*console\.log\s*\([^}]*\)\s*\}/g, '$1={() => {}}');

  // Clean up multiple consecutive empty lines (replace with single empty line)
  newContent = newContent.replace(/\n\s*\n\s*\n/g, '\n\n');

  // Clean up trailing whitespace on empty lines
  newContent = newContent.replace(/^[ \t]+$/gm, '');

  if (originalContent !== newContent) {
    const relativePath = path.relative(process.cwd(), filePath);

    if (dryRun) {
      return {
        modified: true,
        filePath: relativePath,
        originalContent,
        newContent,
      };
    } else {
      fs.writeFileSync(filePath, newContent, 'utf8');
      console.log(`✓ Removed logger.info and console.log statements from: ${relativePath}`);
      return { modified: true };
    }
  }

  return { modified: false };
}

function walkAndProcess(dir, dryRun = false) {
  let filesProcessed = 0;
  let filesModified = 0;
  const changes = [];

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
      } else if (
        item.endsWith('.js') ||
        item.endsWith('.jsx') ||
        item.endsWith('.ts') ||
        item.endsWith('.tsx')
      ) {
        filesProcessed++;
        const result = removeLoggerInfoAndConsoleLogFromFile(fullPath, dryRun);
        if (result.modified) {
          filesModified++;
          if (dryRun) {
            changes.push(result);
          }
        }
      }
    }
  }

  if (dryRun) {
    console.log('🔍 Running dry run to identify logger.info and console.log statements...');
  } else {
    console.log('🧹 Starting logger.info and console.log cleanup...');
  }

  walk(dir);

  if (dryRun) {
    console.log(`\n📊 Dry Run Summary:`);
    console.log(`   Files processed: ${filesProcessed}`);
    console.log(`   Files with logger.info/console.log: ${filesModified}`);

    if (changes.length > 0) {
      console.log(`\n📝 Changes that would be made:`);
      changes.forEach(change => {
        const statements = extractLogStatements(change.originalContent);
        console.log(`\n📄 File: ${change.filePath}`);
        console.log(`   📊 ${statements.length} statement(s) to remove:`);
        statements.forEach(stmt => {
          console.log(`   🔍 Line ${stmt.line}: ${stmt.type}`);
          console.log(`      ${stmt.content}`);
        });
        console.log('─'.repeat(50));
      });
    }
    return changes;
  } else {
    console.log(`\n📊 Summary:`);
    console.log(`   Files processed: ${filesProcessed}`);
    console.log(`   Files modified: ${filesModified}`);
    console.log(`   Logger.info and console.log statements removed! ✨`);
    return { filesProcessed, filesModified };
  }
}

function extractLogStatements(content) {
  const logStatements = [];

  // Find logger.info statements
  const loggerInfoRegex = /^.*logger\.info\s*\(.*?\).*$/gm;
  let match;
  while ((match = loggerInfoRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    logStatements.push({
      type: 'logger.info',
      line: lineNumber,
      content: match[0].trim(),
    });
  }

  // Find console.log statements
  const consoleLogRegex = /^.*console\.log\s*\(.*?\).*$/gm;
  while ((match = consoleLogRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    logStatements.push({
      type: 'console.log',
      line: lineNumber,
      content: match[0].trim(),
    });
  }

  // Find arrow function console.log statements
  const arrowLogRegex = /.*=>\s*console\.log\s*\([^)]*\).*/g;
  while ((match = arrowLogRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    logStatements.push({
      type: 'console.log (arrow function)',
      line: lineNumber,
      content: match[0].trim(),
    });
  }

  // Find JSX prop console.log statements
  const jsxPropLogRegex = /.*\w+=\{[^}]*console\.log\s*\([^}]*\).*/g;
  while ((match = jsxPropLogRegex.exec(content)) !== null) {
    const lineNumber = content.substring(0, match.index).split('\n').length;
    logStatements.push({
      type: 'console.log (JSX prop)',
      line: lineNumber,
      content: match[0].trim(),
    });
  }

  return logStatements.sort((a, b) => a.line - b.line);
}

function getContextLines(content, lineNumber, contextSize = 2) {
  const lines = content.split('\n');
  const start = Math.max(0, lineNumber - contextSize - 1);
  const end = Math.min(lines.length, lineNumber + contextSize);

  return lines
    .slice(start, end)
    .map((line, index) => {
      const actualLineNumber = start + index + 1;
      const marker = actualLineNumber === lineNumber ? '>>>' : '   ';
      return `${marker} ${actualLineNumber.toString().padStart(3, ' ')}: ${line}`;
    })
    .join('\n');
}

function saveDryRunToFile(changes) {
  let dryRunContent = `DRY RUN RESULTS - Logger.info and Console.log Removal\n`;
  dryRunContent += `Generated on: ${new Date().toISOString()}\n`;
  dryRunContent += `Total files with changes: ${changes.length}\n`;
  dryRunContent += `${'='.repeat(80)}\n\n`;

  dryRunContent += `SUMMARY OF STATEMENTS TO BE REMOVED:\n`;
  dryRunContent += `${'─'.repeat(40)}\n`;

  let totalStatements = 0;
  changes.forEach(change => {
    const statements = extractLogStatements(change.originalContent);
    totalStatements += statements.length;
    dryRunContent += `📁 ${change.filePath} (${statements.length} statements)\n`;
    statements.forEach(stmt => {
      dryRunContent += `   • Line ${stmt.line}: ${stmt.type}\n`;
    });
    dryRunContent += `\n`;
  });

  dryRunContent += `Total statements to remove: ${totalStatements}\n`;
  dryRunContent += `${'='.repeat(80)}\n\n`;

  changes.forEach((change, index) => {
    dryRunContent += `${index + 1}. DETAILED VIEW: ${change.filePath}\n`;
    dryRunContent += `${'─'.repeat(50)}\n`;

    const statements = extractLogStatements(change.originalContent);

    dryRunContent += `STATEMENTS TO BE REMOVED:\n`;
    statements.forEach(stmt => {
      dryRunContent += `\n🔍 Line ${stmt.line} - ${stmt.type}:\n`;
      dryRunContent += `${stmt.content}\n`;
      dryRunContent += `\nContext:\n`;
      dryRunContent += `${getContextLines(change.originalContent, stmt.line)}\n`;
      dryRunContent += `${'-'.repeat(30)}\n`;
    });

    dryRunContent += `\n📊 DIFF SUMMARY:\n`;
    const originalLines = change.originalContent.split('\n').length;
    const newLines = change.newContent.split('\n').length;
    const removedLines = originalLines - newLines;
    dryRunContent += `   Original: ${originalLines} lines\n`;
    dryRunContent += `   After:    ${newLines} lines\n`;
    dryRunContent += `   Removed:  ${removedLines} lines\n`;

    dryRunContent += `\n${'='.repeat(80)}\n\n`;
  });

  fs.writeFileSync(DRY_RUN_FILE, dryRunContent, 'utf8');
  console.log(`\n💾 Dry run results saved to: ${path.relative(process.cwd(), DRY_RUN_FILE)}`);
}

function validateDryRunChanges(changes) {
  const issues = [];

  for (const change of changes) {
    const statements = extractLogStatements(change.originalContent);

    // Check for potential issues
    for (const stmt of statements) {
      // Flag if logger/console is part of a string or comment
      if (
        stmt.content.includes('//') &&
        stmt.content.indexOf('//') < stmt.content.indexOf('logger.info')
      ) {
        issues.push(`${change.filePath}:${stmt.line} - Statement appears to be in a comment`);
      }

      if (stmt.content.includes('/*') || stmt.content.includes('*/')) {
        issues.push(`${change.filePath}:${stmt.line} - Statement appears to be in a block comment`);
      }

      // Check if it's inside a string literal
      const beforeLog = stmt.content.substring(
        0,
        stmt.content.indexOf('logger.info') || stmt.content.indexOf('console.log')
      );
      const singleQuotes = (beforeLog.match(/'/g) || []).length;
      const doubleQuotes = (beforeLog.match(/"/g) || []).length;
      const backticks = (beforeLog.match(/`/g) || []).length;

      if (singleQuotes % 2 === 1 || doubleQuotes % 2 === 1 || backticks % 2 === 1) {
        issues.push(`${change.filePath}:${stmt.line} - Statement might be inside a string literal`);
      }

      // Check if it's part of a function name or property
      if (stmt.content.match(/\w+logger\.info/) || stmt.content.match(/\w+console\.log/)) {
        issues.push(
          `${change.filePath}:${stmt.line} - Statement might be part of a larger identifier`
        );
      }

      // Check for critical files that shouldn't be modified
      if (change.filePath.includes('test') || change.filePath.includes('spec')) {
        issues.push(`${change.filePath}:${stmt.line} - Warning: Modifying test file`);
      }
    }

    // Check if removal would break syntax
    const lines = change.originalContent.split('\n');
    for (const stmt of statements) {
      const lineIndex = stmt.line - 1;
      const line = lines[lineIndex];

      // Check if the entire line is just the log statement
      const trimmedLine = line.trim();
      const isStandaloneLine =
        trimmedLine.startsWith('logger.info') ||
        trimmedLine.startsWith('console.log') ||
        trimmedLine.match(/^\s*logger\.info/) ||
        trimmedLine.match(/^\s*console\.log/);

      if (!isStandaloneLine && !line.includes('=>') && !line.includes('=')) {
        // Statement is part of a larger expression
        const logPattern = /(logger\.info|console\.log)\s*\([^)]*\)/;
        const beforeLog = line.substring(0, line.search(logPattern));
        const afterLog = line.substring(line.search(logPattern)).replace(logPattern, '');

        if (beforeLog.trim() && afterLog.trim()) {
          issues.push(
            `${change.filePath}:${stmt.line} - Statement is part of larger expression, removal might break syntax`
          );
        }
      }
    }
  }

  return issues;
}

function checkDryRunFile() {
  if (!fs.existsSync(DRY_RUN_FILE)) {
    console.log('❌ No dry run file found. Please run dry run first.');
    return false;
  }
  return true;
}

function applyChanges() {
  console.log('🚀 Applying logger.info and console.log removal changes...');
  const result = walkAndProcess(TARGET_DIR, false);

  // Delete the dry run file
  if (fs.existsSync(DRY_RUN_FILE)) {
    fs.unlinkSync(DRY_RUN_FILE);
    console.log('🗑️  Cleaned up dry run file');
  }

  return result;
}

function autoValidateAndApply(changes) {
  console.log('🔍 Automatically validating changes...');

  const issues = validateDryRunChanges(changes);

  if (issues.length > 0) {
    console.log('⚠️  Validation found potential issues:');
    issues.forEach(issue => console.log(`   ❌ ${issue}`));
    console.log('\n📄 Please review noinfo.tmp file manually and run with --apply if safe.');
    return false;
  }

  console.log('✅ Validation passed - no issues detected');
  console.log('🚀 Auto-applying changes...');

  // Apply changes immediately
  walkAndProcess(TARGET_DIR, false);

  // Delete the dry run file
  if (fs.existsSync(DRY_RUN_FILE)) {
    fs.unlinkSync(DRY_RUN_FILE);
    console.log('🗑️  Cleaned up dry run file');
  }

  return true;
}

// Main execution
const args = process.argv.slice(2);
const isForceApply = args.includes('--apply');

if (isForceApply) {
  // Step 2: Force apply changes from existing dry run
  if (checkDryRunFile()) {
    console.log('⚠️  Force applying changes from existing dry run...');
    applyChanges();
  }
} else {
  // Step 1: Create dry run, validate, and auto-apply if safe
  const changes = walkAndProcess(TARGET_DIR, true);
  if (changes.length > 0) {
    saveDryRunToFile(changes);
    console.log('\n🔍 Dry run completed. Validating changes...');

    // Auto-validate and apply if safe
    const applied = autoValidateAndApply(changes);

    if (!applied) {
      console.log('💡 To force apply after manual review: yarn run noinfo --apply');
    }
  } else {
    console.log('\n✅ No logger.info or console.log statements found to remove.');
  }
}
