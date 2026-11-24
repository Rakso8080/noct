import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, watchSystemTheme } from './lib/settings';
import './styles.css';

applyTheme();
watchSystemTheme();

const container = document.getElementById('root');
if (!container) throw new Error('missing root');

createRoot(container).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => undefined);
  });
}
