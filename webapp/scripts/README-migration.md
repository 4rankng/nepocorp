# Path Alias Migration Tools

This directory contains enhanced tools for migrating relative imports to path aliases in the webapp project.

## 🚀 Quick Start

### Comprehensive Migration

Run the complete migration workflow with a single command:

```bash
npm run migrate
```

This will:
1. Create a backup of your codebase
2. Run a dry-run to check for potential issues
3. Perform the actual migration
4. Validate the changes
5. Run a final build check
6. Automatically restore from backup if any step fails

### Step-by-Step Migration

If you prefer more control, you can run each step individually:

1. **Analyze current state**: See what needs to be migrated
   ```bash
   npm run migrate:test
   ```

2. **Create backup**: Always backup before migration

   ```bash
   npm run migrate:backup
   ```

3. **Dry run**: Preview changes without modifying files

   ```bash
   npm run migrate:aliases:dry
   ```

4. **Run migration**: Apply the changes

   ```bash
   npm run migrate:aliases
   ```

5. **Validate**: Ensure everything works
   ```bash
   npm run migrate:validate
   ```

## 📚 Available Scripts

### Migration Scripts

- `npm run migrate:aliases` - Run the migration
- `npm run migrate:aliases:dry` - Preview changes without applying them
- `npm run migrate:aliases:verbose` - Run with detailed output

### Backup & Recovery

- `npm run migrate:backup` - Create a backup of the src directory
- `npm run migrate:restore` - Restore from the latest backup
- `node scripts/backup-tool.js list` - List available backups
- `node scripts/backup-tool.js restore 2` - Restore from backup #2

### Testing & Validation

- `npm run migrate:test` - Analyze current project state
- `npm run migrate:validate` - Run full validation suite
- `node scripts/test-migration.js build` - Test build after migration
- `node scripts/test-migration.js lint` - Run ESLint checks

## 🔧 Path Aliases Configuration

The project supports these path aliases (configured in `jsconfig.json` and `vite.config.js`):

```javascript
{
  '@/*': './src/*',
  '@components/*': './src/components/*',
  '@features/*': './src/features/*',
  '@layouts/*': './src/layouts/*',
  '@services/*': './src/services/*',
  '@hooks/*': './src/hooks/*',
  '@utils/*': './src/utils/*',
  '@contexts/*': './src/contexts/*',
  '@routes/*': './src/routes/*',
  '@constants/*': './src/constants/*',
  '@types/*': './src/types/*',
  '@assets/*': './src/assets/*',
  '@shared/*': './src/shared/*'
}
```

## 📋 Migration Examples

### Before Migration

```javascript
// Relative imports
import Button from '../../../shared/components/Button';
import { CustomerForm } from '../../features/khach-hang';
import { formatDate } from '../utils/format';
import config from './config/app.js';
```

### After Migration

```javascript
// Path alias imports
import Button from '@shared/components/Button';
import { CustomerForm } from '@features/khach-hang';
import { formatDate } from '@utils/format';
import config from '@/config/app.js';
```

## 🛠️ Tool Features

### Enhanced Migration Script (`migrate-aliases-enhanced.js`)

- **Smart Path Resolution**: Handles complex relative paths with multiple `../`
- **Multiple Import Types**: Supports ES6 imports, exports, dynamic imports, and require statements
- **File Extension Handling**: Automatically handles `.js`, `.jsx`, `.ts`, `.tsx` extensions
- **Index File Support**: Recognizes and handles `/index` imports
- **Dry Run Mode**: Preview changes before applying them
- **Verbose Logging**: Detailed output for debugging
- **Error Handling**: Comprehensive error reporting
- **Auto Formatting**: Automatically runs code formatter after migration

### Backup Tool (`backup-tool.js`)

- **Automatic Backups**: Create timestamped backups before migration
- **Easy Restoration**: Restore from any backup with a simple command
- **Cleanup**: Automatically removes old backups (keeps latest 5 by default)
- **Cross-platform**: Works on Windows, macOS, and Linux

### Test & Validation (`test-migration.js`)

- **Project Analysis**: Analyze current state and identify files needing migration
- **Unit Tests**: Test migration logic with predefined test cases
- **Build Validation**: Ensure project builds successfully after migration
- **ESLint Integration**: Check for linting issues related to imports
- **Comprehensive Reports**: Detailed statistics and progress reports

## 📊 Understanding the Output

### Analysis Report

```
📊 Migration Report
==================================================
Files processed: 156
Files modified: 89
Total imports updated: 234

🔍 Files that need migration:
  📄 src/features/lich-van-chuyen/QuanLyLichVanChuyen.jsx (12 relative imports)
    └─ Line 8: ../../services/mockData/shipmentPlans.js
    └─ Line 9: ../../services/mockData/vehicles.js
    └─ Line 10: ../../services/mockData/partners.js
```

### Validation Results

- **Files processed**: Total number of files scanned
- **Files modified**: Number of files that had imports updated
- **Total imports updated**: Number of individual import statements changed
- **Relative imports**: Count of remaining relative imports
- **Alias imports**: Count of already converted alias imports

## 🚨 Troubleshooting

### Common Issues

1. **Build fails after migration**

   ```bash
   # Check specific errors
   npm run build

   # Restore from backup if needed
   npm run migrate:restore
   ```

2. **ESLint errors**

   ```bash
   # Try auto-fixing
   npm run lint:fix

   # Check import-related rules in .eslintrc
   ```

3. **Missing imports after migration**
   - Check if the target file exists at the expected path
   - Verify the path alias configuration in `jsconfig.json` and `vite.config.js`
   - Use verbose mode to debug: `npm run migrate:aliases:verbose`

### Recovery Steps

If something goes wrong:

1. **Stop immediately** and don't make more changes
2. **Check available backups**: `node scripts/backup-tool.js list`
3. **Restore from backup**: `npm run migrate:restore`
4. **Report the issue** with the error output

## 🔍 Advanced Usage

### Custom Configuration

You can modify the aliases in the migration script by editing the `ALIASES` array in `migrate-aliases-enhanced.js`:

```javascript
const ALIASES = [
  { alias: '@custom', dir: 'custom-directory' },
  // ... other aliases
];
```

### Selective Migration

To migrate only specific directories:

```javascript
// Modify getFiles function to filter directories
function getFiles(dir, fileList = [], includeDirs = ['features', 'components']) {
  // ... filtering logic
}
```

### Integration with CI/CD

Add to your CI pipeline:

```yaml
# .github/workflows/migrate.yml
- name: Test Migration
  run: |
    npm run migrate:backup
    npm run migrate:aliases:dry
    npm run migrate:validate
```

## 📝 Best Practices

1. **Always backup** before running migration
2. **Use dry-run first** to preview changes
3. **Run tests** after migration to ensure everything works
4. **Commit changes** in small, logical chunks
5. **Update your IDE** to recognize the new aliases
6. **Document** any custom aliases you add

## 🤝 Contributing

When adding new features to the migration tools:

1. Add unit tests to `test-migration.js`
2. Update this README with new features
3. Test on a variety of import patterns
4. Ensure cross-platform compatibility

## 📄 Files Overview

- `migrate-aliases-enhanced.js` - Main migration script with enhanced features
- `backup-tool.js` - Backup and restore functionality
- `test-migration.js` - Testing and validation tools
- `migrate-aliases.js` - Original migration script (kept for reference)
- `README-migration.md` - This documentation file
