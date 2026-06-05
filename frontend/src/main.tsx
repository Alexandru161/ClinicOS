import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getAuthUser } from '@/lib/auth-session';
import { applyUiSettings, getUiSettings } from '@/lib/ui-settings';

const queryClient = new QueryClient();
applyUiSettings(getUiSettings(getAuthUser()));

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);
