import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { initTelegram } from './telegram';
import { App } from './App';
import { LanguageProvider } from './i18n';
import { applyTheme, getStoredTheme } from './theme';
import { wakeApi } from './api';

// Before the first paint, so the page never flashes the default theme and then
// swaps to the stored one.
applyTheme(getStoredTheme());
initTelegram();
wakeApi();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <LanguageProvider>
      <App />
    </LanguageProvider>
  </React.StrictMode>
);
