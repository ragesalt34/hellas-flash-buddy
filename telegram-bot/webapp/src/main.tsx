import React from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import { initTelegram } from './telegram';
import { App } from './App';

initTelegram();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
