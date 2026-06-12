/**
 * Design system barrel.
 *
 * Import surface for the consolidated UI primitives. Pages should prefer
 * importing from here rather than reaching into `components/UI` directly.
 *
 *   import { DataTable, Pagination, TextField, useDebouncedValue, useTableQueryState } from '@/design-system';
 */
export * from './hooks/useDebouncedValue';
export * from './hooks/useToken';
export * from './hooks/useAuthedQuery';
export * from './hooks/useMonthRoute';
export * from './hooks/useTableQueryState';
export * from './hooks/useSalaryPeriod';
export * from './hooks/useMonthlyQuery';

export { Pagination } from './Pagination';
export type { PaginationProps } from './Pagination';
export { DataTable } from './DataTable';
export type { DataTableProps, DataTableColumn } from './DataTable';
export { EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { TextField } from './forms/TextField';
export type { TextFieldProps, BaseFieldProps } from './forms/TextField';
export { SelectField } from './forms/SelectField';
export type { SelectFieldProps } from './forms/SelectField';
export { NumberField } from './forms/NumberField';
export type { NumberFieldProps } from './forms/NumberField';
export { CrudFormModal } from './forms/CrudFormModal';
export type { CrudFormModalProps } from './forms/CrudFormModal';
