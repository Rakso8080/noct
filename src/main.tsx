import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, watchSystemTheme } from './lib/settings';
import './styles.css';
import './survey.css';
import './pixel.css';
import './world.css';

applyTheme();
watchSystemTheme();

const container = document.getElementById('root');
if (!container) throw new Error('missing root');

createRoot(container).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
  });
}
