# Simple Logger Service

A minimal logging service with just 3 essential levels built on [loglevel](https://github.com/pimterry/loglevel).

## 3 Log Levels

### 📘 INFO
**Purpose**: General information and normal application flow
```javascript
logger.info('User logged in successfully', { userId: 123 });
logger.info('Data loaded', { count: 45 });
logger.info('Component mounted');
```

### ⚠️ WARN  
**Purpose**: Something unexpected happens but doesn't affect page functionality
```javascript
logger.warn('API took longer than expected', { duration: '3.2s' });
logger.warn('Using fallback data due to cache miss');
logger.warn('Deprecated method called', { method: 'oldFunction' });
```

### � ERROR
**Purpose**: Critical issues that break functionality
```javascript
logger.error('Failed to save user data', error);
logger.error('Payment processing failed', { orderId: 123, error });
logger.error('Component crashed during render', error);
```

## Environment Behavior

### Development Mode
- Shows **INFO**, **WARN**, and **ERROR** messages
- All logging output visible in console

### Production Mode  
- Shows only **ERROR** messages
- Clean production console with critical errors only

## Usage

### Default Import
```javascript
import logger from '@services/logger';

logger.info('This is general information');
logger.warn('Something unexpected happened'); 
logger.error('Critical error occurred', error);
```

### Named Imports
```javascript
import { info, warn, error } from '@services/logger';

info('User action completed');
warn('Potential issue detected');
error('Function failed', errorDetails);
```

## Migration from console

### Before
```javascript
console.log('User data loaded');           // ❌
console.warn('Cache miss occurred');       // ❌  
console.error('Save operation failed');    // ❌
```

### After
```javascript
logger.info('User data loaded');           // ✅
logger.warn('Cache miss occurred');        // ✅
logger.error('Save operation failed');     // ✅
```

## Real Examples

```javascript
import logger from '@services/logger';

// Component lifecycle
function UserProfile({ userId }) {
  useEffect(() => {
    logger.info('UserProfile component mounted', { userId });
    
    fetchUserData(userId)
      .then(data => {
        logger.info('User data loaded successfully', { 
          userId, 
          dataSize: data.length 
        });
      })
      .catch(error => {
        logger.error('Failed to load user data', { 
          userId, 
          error: error.message 
        });
      });
  }, [userId]);
}

// API calls
async function saveUserProfile(userData) {
  try {
    logger.info('Saving user profile', { userId: userData.id });
    
    const response = await api.post('/users', userData);
    
    if (response.status === 200) {
      logger.info('Profile saved successfully');
      return response.data;
    } else {
      logger.warn('Unexpected response status', { 
        status: response.status,
        expected: 200 
      });
    }
  } catch (error) {
    logger.error('Profile save operation failed', {
      userId: userData.id,
      error: error.message
    });
    throw error;
  }
}

// Form validation
function validateForm(formData) {
  const errors = [];
  
  if (!formData.email) {
    const error = 'Email is required';
    logger.warn('Form validation failed', { field: 'email', error });
    errors.push(error);
  }
  
  if (errors.length > 0) {
    logger.error('Form submission blocked due to validation errors', { 
      errorCount: errors.length,
      errors 
    });
  } else {
    logger.info('Form validation passed');
  }
  
  return errors;
}
```

## Why Only 3 Levels?

- **Simple**: Easy to understand and use
- **Clear purpose**: Each level has a specific, well-defined role  
- **Production-ready**: Minimal noise in production logs
- **Maintenance-friendly**: Less complexity = fewer bugs
