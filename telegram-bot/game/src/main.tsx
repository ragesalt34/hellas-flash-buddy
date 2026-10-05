import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// No StrictMode: its double mount would boot two Phaser games.
createRoot(document.getElementById('root')!).render(<App />);
