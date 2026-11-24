import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import App from './auth/AuthApp';
import './index.css';
import { reloadForNewRelease } from './utils/lazyPage';
import { watchClientErrors } from './utils/reportClientError';

watchClientErrors();

// A file of an older release is gone (a tab left open across a deploy): load the new release once.
window.addEventListener('vite:preloadError', (event) => { if (reloadForNewRelease()) event.preventDefault(); });

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 15_000 },
    mutations: { retry: false },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
