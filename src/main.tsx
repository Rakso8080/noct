import { createRoot } from 'react-dom/client';
import { App } from './App';
import { applyTheme, watchSystemTheme } from './lib/settings';
import './styles.css';
import './survey.css';
import './pixel.css';
import './world.css';
import './journey.css';
import './stage.css';
import './climb.css';
import './start.css';
import './play.css';
import './games.css';
import './realm.css';
import './atlas.css';

applyTheme();
watchSystemTheme();

const container = document.getElementById('root');
if (!container) throw new Error('missing root');

createRoot(container).render(<App />);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const base = import.meta.env.BASE_URL;
  const crowd = import.meta.env.VITE_CROWD_API;
  /* The API origin rides along so the worker can answer for it when it is down. */
  const swUrl = crowd ? `${base}sw.js?api=${encodeURIComponent(crowd)}` : `${base}sw.js`;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(swUrl, { scope: base }).catch(() => undefined);
  });
}
