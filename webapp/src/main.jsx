import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Global } from '@emotion/react';
import { theme } from '@/theme';
import router from '@routes/duongDan';
import { mobileInputStyles } from '@/utils/mobileInput';
import MobileInputHandler from '@/components/MobileInputHandler';
import '@/index.css';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { VehicleDataProvider } from '@contexts/VehicleDataContext';
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
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
  </React.StrictMode>
);
