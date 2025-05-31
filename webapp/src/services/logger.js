/**
 * Simple logging service with 3 essential levels
 * - INFO: General information and normal flow
 * - WARN: Something unexpected but doesn't break functionality  
 * - ERROR: Critical issues that break functionality
 */

import log from 'loglevel';

class LogService {
  constructor() {
    this.logger = log;
    this.setupLogLevel();
    this.setupMethods();
  }

  setupLogLevel() {
    const isDevelopment = this.detectDevelopmentMode();
    
    if (isDevelopment) {
      // Show info and above in development
      this.logger.setLevel('info');
    } else {
      // Only show errors in production
      this.logger.setLevel('error');
    }
  }

  detectDevelopmentMode() {
    // In browser with Vite
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.DEV || import.meta.env.NODE_ENV === 'development';
    }
    
    // In Node.js
    if (typeof process !== 'undefined' && process.env) {
      return process.env.NODE_ENV === 'development';
    }
    
    // Default to development if unable to detect
    return true;
  }

  setupMethods() {
    // Bind the 3 essential logging methods
    this.info = this.logger.info.bind(this.logger);
    this.warn = this.logger.warn.bind(this.logger);
    this.error = this.logger.error.bind(this.logger);
    
    // Utility methods
    this.setLevel = this.logger.setLevel.bind(this.logger);
    this.getLevel = this.logger.getLevel.bind(this.logger);
  }
}

// Create and export a singleton instance
const logger = new LogService();

export default logger;

// Named exports for the 3 essential levels
export const { info, warn, error } = logger;
