// Main entry point for phuong-tien (vehicle/container) management feature

// Container Type Components
export {
  ContainerTypeForm,
  ContainerTypeList,
  ContainerTypeManagement,
  LoaiContainer,
} from '@features/phuong-tien/components';

// Container Type Hooks
export { useContainerTypeManagement } from '@features/phuong-tien/hooks';

// Default export for the main LoaiContainer component
export { default } from '@features/phuong-tien/components/LoaiContainer';
