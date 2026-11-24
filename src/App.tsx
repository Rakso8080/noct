import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Home } from './screens/Home';
import { Play } from './screens/Play';
import { Results } from './screens/Results';
import { Archive } from './screens/Archive';
import { Stats } from './screens/Stats';
import { Leaderboard } from './screens/Leaderboard';
import { Settings } from './screens/Settings';
import { HowTo } from './screens/HowTo';
import { Survey } from './screens/Survey';
import { Chess } from './screens/Chess';
import { Mines } from './screens/Mines';
import { Pairs } from './screens/Pairs';
import { Lights } from './screens/Lights';
import { Logo } from './components/ui';
import { getSummary, setSummary } from './lib/results';
import { BRAND } from './brand';

/** The site can be served from a subpath (GitHub Pages: /noct/), so routes carry the base. */
const BASE = import.meta.env.BASE_URL.replace(/\/+$/, '');

function stripBase(pathname: string): string {
  if (!BASE) return pathname;
  if (pathname === BASE) return '/';
  if (pathname.startsWith(`${BASE}/`)) return pathname.slice(BASE.length);
  return pathname;
}

function useRoute(): [string, (to: string) => void] {
  const [path, setPath] = useState(() => stripBase(window.location.pathname) + window.location.search);

  useEffect(() => {
    const onPop = () => setPath(stripBase(window.location.pathname) + window.location.search);
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = useCallback((to: string) => {
    const next = to === '/' ? '/' : to;
    window.history.pushState({}, '', `${BASE}${next}`);
    setPath(next);
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  return [path, navigate];
}

const NAV = [
  { path: '/', label: 'Menu', match: (s: string[]) => s.length === 0 },
  { path: '/common', label: 'Common', match: (s: string[]) => s[0] === 'common' },
  { path: '/rare', label: 'Rare', match: (s: string[]) => s[0] === 'rare' },
  {
    path: '/play',
    label: 'Noct',
    match: (s: string[]) => s[0] === 'play' || s[0] === 'practice' || s[0] === 'archive',
  },
  { path: '/chess', label: 'Chess', match: (s: string[]) => s[0] === 'chess' },
  { path: '/stats', label: 'Stats', match: (s: string[]) => s[0] === 'stats' },
];

export function App() {
  const [path, navigate] = useRoute();

  const url = new URL(path, window.location.origin);
  const segments = url.pathname.split('/').filter(Boolean);
  const section = segments[0] ?? '';

  const finish = useCallback(
    (summary: Parameters<typeof setSummary>[0]) => {
      setSummary(summary);
      navigate('/results');
    },
    [navigate],
  );

  let page: ReactNode;

  if (segments.length === 0) {
    page = <Home key="home" navigate={navigate} onTutorial={() => navigate('/how-to')} />;
  } else if (section === 'play') {
    page = (
      <Play
        key="daily"
        mode="daily"
        onFinish={finish}
        onExit={() => navigate('/')}
        onTutorial={() => navigate('/how-to')}
      />
    );
  } else if (section === 'common') {
    page = <Survey key="common" mode="common" navigate={navigate} />;
  } else if (section === 'rare') {
    page = <Survey key="rare" mode="rare" navigate={navigate} />;
  } else if (section === 'practice') {
    const level = Math.max(1, Math.min(5, Number(url.searchParams.get('level') ?? 2) || 2));
    page = (
      <Play
        key={`practice-${level}`}
        mode="practice"
        level={level}
        onFinish={finish}
        onExit={() => navigate('/')}
        onTutorial={() => navigate('/how-to')}
      />
    );
  } else if (section === 'archive' && segments[1]) {
    const day = Number(segments[1]);
    page = (
      <Play
        key={`archive-${day}`}
        mode="archive"
        day={Number.isFinite(day) ? day : 1}
        onFinish={finish}
        onExit={() => navigate('/archive')}
        onTutorial={() => navigate('/how-to')}
      />
    );
  } else if (section === 'archive') {
    page = <Archive key="archive" navigate={navigate} />;
  } else if (section === 'results') {
    page = <Results key="results" summary={getSummary()} navigate={navigate} />;
  } else if (section === 'chess') {
    page = <Chess key="chess" navigate={navigate} />;
  } else if (section === 'mines') {
    page = <Mines key="mines" navigate={navigate} />;
  } else if (section === 'pairs') {
    page = <Pairs key="pairs" navigate={navigate} />;
  } else if (section === 'lights') {
    page = <Lights key="lights" navigate={navigate} />;
  } else if (section === 'stats') {
    page = <Stats key="stats" navigate={navigate} />;
  } else if (section === 'leaderboard') {
    page = <Leaderboard key="leaderboard" navigate={navigate} />;
  } else if (section === 'settings') {
    page = <Settings key="settings" navigate={navigate} />;
  } else if (section === 'how-to') {
    page = <HowTo key="how-to" navigate={navigate} />;
  } else {
    page = (
      <main className="main">
        <div className="wrap" style={{ maxWidth: 480 }}>
          <div className="card stack gap-14">
            <h1 style={{ fontSize: 'var(--step-2)' }}>Nothing here</h1>
            <p className="par-note">That address does not match a board. The daily is at the front.</p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              Back to today
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="shell">
      <header className="site-head">
        <div className="wrap">
          <a
            className="brand"
            href={`${BASE}/`}
            onClick={(e) => {
              e.preventDefault();
              navigate('/');
            }}
            aria-label={`${BRAND.name} home`}
          >
            <Logo />
            <span className="brand-word">{BRAND.name}</span>
          </a>

          <nav className="nav" aria-label="Main">
            {NAV.map((item, i) => (
              <a
                key={item.path}
                href={`${BASE}${item.path}`}
                className={`nav-link${i >= 3 ? ' nav-hide-sm' : ''}`}
                aria-current={item.match(segments) ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                {item.label}
              </a>
            ))}
            <button className="icon-btn" onClick={() => navigate('/settings')} aria-label="Settings">
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true" fill="none">
                <circle cx="8" cy="8" r="2.4" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d="M8 1.4v1.7M8 12.9v1.7M1.4 8h1.7M12.9 8h1.7M3.3 3.3l1.2 1.2M11.5 11.5l1.2 1.2M12.7 3.3l-1.2 1.2M4.5 11.5l-1.2 1.2"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </nav>
        </div>
      </header>

      <div key={path} className="page-enter">
        {page}
      </div>

      <footer className="site-foot">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {BRAND.name} — a new board every day at 00:00 UTC.</span>
          <span className="row gap-14" style={{ flexWrap: 'wrap' }}>
            <a
              href={`${BASE}/how-to`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/how-to');
              }}
            >
              How to play
            </a>
            <a
              href={`${BASE}/stats`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/stats');
              }}
            >
              Your data
            </a>
            <a
              href={`${BASE}/settings`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/settings');
              }}
            >
              Privacy
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
