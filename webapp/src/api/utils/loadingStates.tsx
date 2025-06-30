import React from 'react';
import { CircularProgress, Skeleton, Box, Typography } from '@mui/material';

// Loading state utilities
export interface LoadingProps {
  isLoading: boolean;
  error?: unknown;
  children: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  skeleton?: boolean;
  skeletonLines?: number;
}

export const LoadingWrapper: React.FC<LoadingProps> = ({
  isLoading,
  error,
  children,
  loadingComponent,
  errorComponent,
  skeleton = false,
  skeletonLines = 3,
}) => {
  if (isLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }

    if (skeleton) {
      return (
        <Box>
          {Array.from({ length: skeletonLines }).map((_, index) => (
            <Skeleton key={index} variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
          ))}
        </Box>
      );
    }

    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }

    return (
      <Box p={2} textAlign="center">
        <Typography color="error">An error occurred. Please try again.</Typography>
      </Box>
    );
  }

  return <>{children}</>;
};

// Skeleton loaders for different content types
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <Box>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <Box key={rowIndex} display="flex" gap={2} mb={1}>
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} variant="rectangular" height={40} sx={{ flex: 1 }} />
        ))}
      </Box>
    ))}
  </Box>
);

export const CardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <Box key={index} mb={2} p={2} border="1px solid #e0e0e0" borderRadius={1}>
        <Skeleton variant="text" sx={{ fontSize: '1.5rem', mb: 1 }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem', mb: 1 }} />
        <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%' }} />
      </Box>
    ))}
  </Box>
);

export const FormSkeleton: React.FC = () => (
  <Box>
    <Skeleton variant="text" sx={{ fontSize: '1.2rem', mb: 2 }} />
    <Skeleton variant="rectangular" height={56} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" height={56} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" height={100} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" height={40} sx={{ width: 120 }} />
  </Box>
);

// Hook for managing loading states
export const useLoadingState = (initialState = false) => {
  const [isLoading, setIsLoading] = React.useState(initialState);

  const startLoading = React.useCallback(() => setIsLoading(true), []);
  const stopLoading = React.useCallback(() => setIsLoading(false), []);

  return {
    isLoading,
    startLoading,
    stopLoading,
    setIsLoading,
  };
};
