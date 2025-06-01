import logger from '@services/logger';

/**
 * Mock Database Service
 * Centralized in-memory database that bootstraps with hard-coded data
 * and manages all subsequent CRUD operations
 */
class MockDB {
  constructor() {
    this.tables = new Map();
    this.initialized = false;
    this.listeners = new Map(); // For data change notifications
  }
  /**
   * Initialize the database with bootstrap data
   */
  async initialize() {
    if (this.initialized) return;
    try {
      // Import all mock data
      const { default: baoDuongData } = await import('@services/mockData/baoDuong');
      const { default: userData } = await import('@services/mockData/users');

      // Initialize tables with bootstrap data
      this.tables.set('baoDuong', [...baoDuongData]);
      this.tables.set('users', [...userData]);

      // Try to load persisted data from localStorage if available
      this.loadPersistedData();
      this.initialized = true;
    } catch (error) {
      logger.error('Error initializing mock database', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }
  /**
   * Load persisted data from localStorage
   */
  loadPersistedData() {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const persistedData = window.localStorage.getItem('mockDB');
      if (persistedData) {
        const parsedData = JSON.parse(persistedData);
        Object.entries(parsedData).forEach(([tableName, data]) => {
          if (this.tables.has(tableName)) {
            this.tables.set(tableName, data);
          }
        });
      }
    } catch (error) {
      logger.warn('Failed to load persisted data from localStorage', {
        error: error.message,
      });
    }
  }
  /**
   * Persist data to localStorage
   */
  persistData(tableName) {
    if (typeof window === 'undefined' || !window.localStorage) return;

    try {
      const data = this.tables.get(tableName);
      if (data) {
        const allData = {};
        this.tables.forEach((tableData, table) => {
          allData[table] = tableData;
        });
        window.localStorage.setItem('mockDB', JSON.stringify(allData));
      }
    } catch (error) {
      logger.error(`Error persisting data for table ${tableName}`, { error });
    }
  }
  /**
   * Subscribe to data changes for a specific table
   */
  subscribe(tableName, callback) {
    if (!this.listeners.has(tableName)) {
      this.listeners.set(tableName, new Set());
    }
    this.listeners.get(tableName).add(callback);
    // Return unsubscribe function
    return () => {
      const tableListeners = this.listeners.get(tableName);
      if (tableListeners) {
        tableListeners.delete(callback);
      }
    };
  }
  /**
   * Notify listeners of data changes
   */
  notifyListeners(tableName, operation, data) {
    const tableListeners = this.listeners.get(tableName);
    if (tableListeners) {
      tableListeners.forEach(callback => {
        try {
          callback({ operation, data, tableName });
        } catch (error) {
          logger.error('Error in listener callback', {
            error: error.message,
            tableName,
            operation,
          });
        }
      });
    }
  }
  /**
   * Get all records from a table
   */
  getAll(tableName) {
    this.ensureInitialized();
    const data = this.tables.get(tableName);
    if (!data) {
      throw new Error(`Table '${tableName}' not found`);
    }
    return [...data]; // Return a copy to prevent external mutations
  }
  /**
   * Get a single record by ID
   */
  getById(tableName, id) {
    this.ensureInitialized();
    const data = this.tables.get(tableName);
    if (!data) {
      throw new Error(`Table '${tableName}' not found`);
    }
    return data.find(record => record.id === id);
  }
  /**
   * Create a new record
   */
  create(tableName, record) {
    this.ensureInitialized();
    const data = this.tables.get(tableName);
    if (!data) {
      throw new Error(`Table '${tableName}' not found`);
    }
    // Generate new ID
    const maxId = data.length > 0 ? Math.max(...data.map(r => r.id || 0)) : 0;
    const newId = maxId + 1;
    // Add timestamps
    const now = new Date().toISOString();
    const newRecord = {
      ...record,
      id: newId,
      created_at: now,
      updated_at: now,
    };
    // Add to table
    data.push(newRecord);
    // Persist and notify
    this.persistData(tableName);
    this.notifyListeners(tableName, 'CREATE', newRecord);
    return { ...newRecord };
  }
  /**
   * Update an existing record
   */
  update(tableName, id, updates) {
    this.ensureInitialized();
    const data = this.tables.get(tableName);
    if (!data) {
      throw new Error(`Table '${tableName}' not found`);
    }
    const index = data.findIndex(record => record.id === id);
    if (index === -1) {
      throw new Error(`Record with id ${id} not found in table '${tableName}'`);
    }
    // Update record
    const updatedRecord = {
      ...data[index],
      ...updates,
      id, // Ensure ID doesn't change
      updated_at: new Date().toISOString(),
    };
    data[index] = updatedRecord;
    // Persist and notify
    this.persistData(tableName);
    this.notifyListeners(tableName, 'UPDATE', updatedRecord);
    return { ...updatedRecord };
  }
  /**
   * Delete a record
   */
  delete(tableName, id) {
    this.ensureInitialized();
    const data = this.tables.get(tableName);
    if (!data) {
      throw new Error(`Table '${tableName}' not found`);
    }
    const index = data.findIndex(record => record.id === id);
    if (index === -1) {
      return false; // Record not found
    }
    const deletedRecord = data[index];
    data.splice(index, 1);
    // Persist and notify
    this.persistData(tableName);
    this.notifyListeners(tableName, 'DELETE', deletedRecord);
    return true;
  }
  /**
   * Count records in a table
   */
  count(tableName) {
    this.ensureInitialized();
    const data = this.tables.get(tableName);
    if (!data) {
      throw new Error(`Table '${tableName}' not found`);
    }
    return data.length;
  }
  /**
   * Query records with filtering
   */
  query(tableName, filterFn) {
    this.ensureInitialized();
    const data = this.tables.get(tableName);
    if (!data) {
      throw new Error(`Table '${tableName}' not found`);
    }
    return data.filter(filterFn);
  }
  /**
   * Reset a table to its bootstrap data
   */
  async resetTable(tableName) {
    this.ensureInitialized();
    let bootstrapData;
    switch (tableName) {
      case 'baoDuong': {
        const { default: baoDuongData } = await import('@services/mockData/baoDuong');
        bootstrapData = [...baoDuongData];
        break;
      }
      case 'users': {
        const { default: userData } = await import('@services/mockData/users');
        bootstrapData = [...userData];
        break;
      }
      default:
        throw new Error(`Unknown table: ${tableName}`);
    }
    this.tables.set(tableName, bootstrapData);
    this.persistData(tableName);
    this.notifyListeners(tableName, 'RESET', bootstrapData);
    return true;
  }
  /**
   * Clear all data and reset to bootstrap state
   */
  async reset() {
    // Clear localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      for (const tableName of this.tables.keys()) {
        window.localStorage.removeItem(`mockDB_${tableName}`);
      }
    }
    // Reinitialize
    this.initialized = false;
    await this.initialize();
  }
  /**
   * Ensure the database is initialized
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('MockDB not initialized. Call initialize() first.');
    }
  }
  /**
   * Get current state for debugging
   */
  getState() {
    const state = {};
    for (const [tableName, data] of this.tables) {
      state[tableName] = {
        count: data.length,
        data: [...data],
      };
    }
    return state;
  }
}
// Create singleton instance
const mockDB = new MockDB();
export default mockDB;
// Export utility functions for easier access
export const initializeMockDB = () => mockDB.initialize();
export const getMockDBState = () => mockDB.getState();
