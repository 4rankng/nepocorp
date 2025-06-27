// Export all services from a central location
export { authService } from './auth.service';
export { expenseService, expenseCategoryService } from './expense.service';
export { maintenanceService } from './maintenance.service';
export { tractorService, trailerService, containerService } from './vehicle.service';
export { settingsService } from './settings.service';
export { healthService } from './health.service';

// Also export base service for extensibility
export { BaseService } from './base.service';
export type { CrudService } from './base.service';