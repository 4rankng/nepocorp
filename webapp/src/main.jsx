import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Global } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { theme } from '@/theme';
import router from '@routes/duongDan';
import { mobileInputStyles } from '@/utils/mobileInput';
import MobileInputHandler from '@/components/MobileInputHandler';
import '@/index.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { VehicleDataProvider } from '@contexts/VehicleDataContext';

// Create a React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Global styles={mobileInputStyles} />
        <MobileInputHandler />
        <VehicleDataProvider>
          <ErrorBoundary>
            <RouterProvider router={router} future={{ v7_startTransition: true }} />
          </ErrorBoundary>
        </VehicleDataProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>
);
