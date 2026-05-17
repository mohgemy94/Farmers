import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';

// Define __DEV__ for libraries that require it (e.g. Expo)
if (typeof (globalThis as any).__DEV__ === 'undefined') {
  (globalThis as any).__DEV__ = import.meta.env.DEV;
}

import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
