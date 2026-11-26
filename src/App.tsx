import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from 'react';
import { Home } from './screens/Home';
import { RouteBoundary } from './components/RouteBoundary';
import { RealmBackdrop } from './components/RealmBackdrop';
import { SceneLayer } from './components/SceneLayer';
import { PLACE_BY_ID, routeWeather, type PlaceId } from './lib/atlas';
import { PlaceScene } from './components/PlaceScene';
import type { SceneKey } from './lib/scenes';

/* Every screen but the menu is its own chunk, so the first paint ships the
   menu, not all nineteen boards. */
const Play = lazy(() => import('./screens/Play').then((m) => ({ default: m.Play })));
const Results = lazy(() => import('./screens/Results').then((m) => ({ default: m.Results })));
const Archive = lazy(() => import('./screens/Archive').then((m) => ({ default: m.Archive })));
const Stats = lazy(() => import('./screens/Stats').then((m) => ({ default: m.Stats })));
const Leaderboard = lazy(() => import('./screens/Leaderboard').then((m) => ({ default: m.Leaderboard })));
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })));
const HowTo = lazy(() => import('./screens/HowTo').then((m) => ({ default: m.HowTo })));
const Survey = lazy(() => import('./screens/Survey').then((m) => ({ default: m.Survey })));
const Chess = lazy(() => import('./screens/Chess').then((m) => ({ default: m.Chess })));
const Mines = lazy(() => import('./screens/Mines').then((m) => ({ default: m.Mines })));
const Pairs = lazy(() => import('./screens/Pairs').then((m) => ({ default: m.Pairs })));
const Lights = lazy(() => import('./screens/Lights').then((m) => ({ default: m.Lights })));
const Snake = lazy(() => import('./screens/Snake').then((m) => ({ default: m.Snake })));
const Numbers = lazy(() => import('./screens/Numbers').then((m) => ({ default: m.Numbers })));
const Reversi = lazy(() => import('./screens/Reversi').then((m) => ({ default: m.Reversi })));
const Checkers = lazy(() => import('./screens/Checkers').then((m) => ({ default: m.Checkers })));
const Connect4 = lazy(() => import('./screens/Connect4').then((m) => ({ default: m.Connect4 })));
const Dominoes = lazy(() => import('./screens/Dominoes').then((m) => ({ default: m.Dominoes })));
const Arcade = lazy(() => import('./screens/Arcade').then((m) => ({ default: m.Arcade })));
const Atlas = lazy(() => import('./screens/Atlas').then((m) => ({ default: m.Atlas })));
const Night = lazy(() => import('./screens/Night').then((m) => ({ default: m.Night })));
const WordWell = lazy(() => import('./screens/WordWell').then((m) => ({ default: m.WordWell })));
const MemoryBell = lazy(() => import('./screens/MemoryBell').then((m) => ({ default: m.MemoryBell })));
const Mancala = lazy(() => import('./screens/Mancala').then((m) => ({ default: m.Mancala })));
const Pegs = lazy(() => import('./screens/Pegs').then((m) => ({ default: m.Pegs })));
const Crates = lazy(() => import('./screens/Crates').then((m) => ({ default: m.Crates })));
const Boxes = lazy(() => import('./screens/Boxes').then((m) => ({ default: m.Boxes })));
import { Logo } from './components/ui';
import { getSummary, setSummary } from './lib/results';
import { dayNumber } from '../shared/dates';
import { parseChallenge, parseTableChallenge } from './lib/challenge';
import { translate, useT } from './lib/i18n';
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

interface NavItem {
  path: string;
  label: string;
  match: (s: string[]) => boolean;
  /** stays in the bar on narrow screens; the rest fold into "More" */
  always?: boolean;
}

const ATLAS_PLACE_BY_SECTION: Record<string, PlaceId> = {
  common: 'common',
  rare: 'rare',
  play: 'noct',
  practice: 'noct',
  chess: 'chess',
  mines: 'mines',
  pairs: 'pairs',
  lights: 'lights',
  snake: 'snake',
  numbers: 'numbers',
  reversi: 'reversi',
  checkers: 'checkers',
  connect4: 'connect4',
  dominoes: 'dominoes',
  wordwell: 'wordwell',
  memorybell: 'memorybell',
  mancala: 'mancala',
  pegs: 'pegs',
  crates: 'crates',
  boxes: 'boxes',
};

const NAV: NavItem[] = [
  { path: '/', label: 'Menu', match: (s: string[]) => s.length === 0 },
  { path: '/common', label: 'Common', match: (s: string[]) => s[0] === 'common' },
  { path: '/rare', label: 'Rare', match: (s: string[]) => s[0] === 'rare' },
  {
    path: '/play',
    label: 'Noct',
    match: (s: string[]) => s[0] === 'play' || s[0] === 'practice' || s[0] === 'archive',
  },
  { path: '/chess', label: 'Chess', match: (s: string[]) => s[0] === 'chess' },
  { path: '/night', label: 'Night', match: (s: string[]) => s[0] === 'night' },
  { path: '/atlas', label: 'Atlas', match: (s: string[]) => s[0] === 'atlas' },
  { path: '/arcade', label: 'Arcade', match: (s: string[]) => s[0] === 'arcade', always: true },
  { path: '/stats', label: 'Stats', match: (s: string[]) => s[0] === 'stats' },
];

export function App() {
  const [path, navigate] = useRoute();
  const t = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [path]);

  useEffect(() => {
    if (!moreOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMoreOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const url = new URL(path, window.location.origin);
  const segments = url.pathname.split('/').filter(Boolean);
  const section = segments[0] ?? '';
  const atlasPlace = ATLAS_PLACE_BY_SECTION[section];
  const scenePlace: SceneKey | null =
    atlasPlace ??
    (section === ''
      ? 'home'
      : section === 'arcade'
        ? 'arcade'
        : section === 'atlas'
          ? 'atlas'
          : null);
  const weather = routeWeather(dayNumber());
  const atlasQuery = atlasPlace ? `?place=${atlasPlace}` : '';
  const place = atlasPlace ? PLACE_BY_ID[atlasPlace] : null;

  /* Each route names its own tab; the menu keeps the brand alone. */
  useEffect(() => {
    const name = place ? translate(place.name) : null;
    document.title = name ? `${name} · Noct` : 'Noct — a new board every night';
  }, [path, place]);
  const realm =
    !section
      ? 'home'
      : section === 'play' || section === 'practice' || section === 'results'
        ? 'noct'
        : section === 'archive' && segments[1]
          ? 'noct'
          : section;
  const immersive =
    section === 'common' ||
    section === 'rare' ||
    section === 'play' ||
    section === 'practice' ||
    (section === 'archive' && Boolean(segments[1]));

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
        challenge={parseChallenge(url.search)}
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
    const openable = Number.isFinite(day) && day < dayNumber() && day >= Math.max(1, dayNumber() - 365);
    page = openable ? (
      <Play
        key={`archive-${day}`}
        mode="archive"
        day={day}
        onFinish={finish}
        onExit={() => navigate('/archive')}
        onTutorial={() => navigate('/how-to')}
        onToday={() => navigate('/play')}
      />
    ) : (
      <main className="main" key={`archive-miss-${segments[1]}`}>
        <div className="wrap" style={{ maxWidth: 480 }}>
          <div className="card stack gap-14">
            <span className="eyebrow">{t('Archive')}</span>
            <h1 style={{ fontSize: 'var(--step-2)' }}>{t('That board is not in the drawer')}</h1>
            <p className="par-note" style={{ margin: 0 }}>
              {Number.isFinite(day) && day >= dayNumber()
                ? t(
                    'Today’s board is still being played — it lives under Noct, not the archive. It joins the drawer tomorrow.',
                  )
                : t('The archive keeps the last 365 nights. This address is outside it.')}
            </p>
            <div className="row gap-10" style={{ flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => navigate('/play')}>
                {t('Play today’s board')}
              </button>
              <button className="btn btn-ghost" onClick={() => navigate('/archive')}>
                {t('Open the archive')}
              </button>
            </div>
          </div>
        </div>
      </main>
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
  } else if (section === 'snake') {
    page = <Snake key="snake" navigate={navigate} />;
  } else if (section === 'numbers') {
    page = <Numbers key="numbers" navigate={navigate} />;
  } else if (section === 'reversi') {
    page = <Reversi key="reversi" navigate={navigate} />;
  } else if (section === 'checkers') {
    page = <Checkers key="checkers" navigate={navigate} />;
  } else if (section === 'connect4') {
    page = <Connect4 key="connect4" navigate={navigate} />;
  } else if (section === 'dominoes') {
    page = <Dominoes key="dominoes" navigate={navigate} />;
  } else if (section === 'arcade') {
    page = <Arcade key="arcade" navigate={navigate} />;
  } else if (section === 'night') {
    page = <Night key="night" navigate={navigate} />;
  } else if (section === 'wordwell') {
    page = <WordWell key="wordwell" navigate={navigate} />;
  } else if (section === 'memorybell') {
    page = <MemoryBell key="memorybell" navigate={navigate} />;
  } else if (section === 'mancala') {
    const challenge = parseTableChallenge(url.search, 'mancala', dayNumber());
    page = (
      <Mancala
        key={url.search ? `mancala-${url.search}` : 'mancala'}
        navigate={navigate}
        challenge={challenge}
      />
    );
  } else if (section === 'pegs') {
    const challenge = parseTableChallenge(url.search, 'pegs', dayNumber());
    page = (
      <Pegs
        key={url.search ? `pegs-${url.search}` : 'pegs'}
        navigate={navigate}
        challenge={challenge}
      />
    );
  } else if (section === 'crates') {
    page = <Crates key="crates" navigate={navigate} />;
  } else if (section === 'boxes') {
    page = <Boxes key="boxes" navigate={navigate} />;
  } else if (section === 'atlas') {
    page = <Atlas key="atlas" navigate={navigate} />;
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
            <h1 style={{ fontSize: 'var(--step-2)' }}>{t('Nothing here')}</h1>
            <p className="par-note">
              {t('That address does not match a board. The daily is at the front.')}
            </p>
            <button className="btn btn-primary" onClick={() => navigate('/')}>
              {t('Back to today')}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="shell" data-realm={realm} data-weather={weather.id} data-place={scenePlace ?? 'home'}>
      <RealmBackdrop key={realm} hidden={immersive} />
      {scenePlace && !immersive ? <SceneLayer place={scenePlace} weather={weather.id} /> : null}
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

          <nav className="nav" aria-label={t('Main')}>
            {NAV.map((item) => (
              <a
                key={item.path}
                href={`${BASE}${item.path}`}
                className={`nav-link${item.always ? '' : ' nav-hide-sm'}`}
                aria-current={item.match(segments) ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(item.path);
                }}
              >
                {t(item.label)}
              </a>
            ))}
            <button
              type="button"
              className="nav-more-btn"
              aria-expanded={moreOpen}
              aria-controls="nav-more"
              onClick={() => setMoreOpen((open) => !open)}
            >
              {t('More')}
            </button>
            {moreOpen ? (
              <div className="nav-more" id="nav-more" role="group" aria-label={t('All boards')}>
                {NAV.filter((item) => !item.always).map((item) => (
                  <a
                    key={item.path}
                    href={`${BASE}${item.path}`}
                    className="nav-more-link"
                    aria-current={item.match(segments) ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      setMoreOpen(false);
                      navigate(item.path);
                    }}
                  >
                    {t(item.label)}
                  </a>
                ))}
              </div>
            ) : null}
            <button className="icon-btn" onClick={() => navigate('/settings')} aria-label={t('Settings')}>
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

      {place && !immersive ? (
        <div className="place-band" aria-hidden="true">
          <PlaceScene place={place.id} weather={weather.id} variant="band" />
          <span className="place-band-name">{t(place.placeName)}</span>
        </div>
      ) : null}

      <div key={path} className="page-enter">
        <RouteBoundary>
          <Suspense
            fallback={
              <main className="main">
                <div className="wrap" style={{ maxWidth: 640 }}>
                  <span className="eyebrow">{t('Opening the table')}</span>
                  <div className="route-loading" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <p className="par-note">{t('One moment — the board is on its way.')}</p>
                </div>
              </main>
            }
          >
            {page}
          </Suspense>
        </RouteBoundary>
      </div>

      <footer className="site-foot">
        <div className="wrap">
          <span>© {new Date().getFullYear()} {BRAND.name} — {t('A new board every day at 00:00 UTC.')}</span>
          <span className="row gap-14" style={{ flexWrap: 'wrap' }}>
            <a
              href={`${BASE}/how-to`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/how-to');
              }}
            >
              {t('How to play')}
            </a>
            <a
              href={`${BASE}/atlas${atlasQuery}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/atlas${atlasQuery}`);
              }}
            >
              {t('Atlas')}
            </a>
            <a
              href={`${BASE}/stats`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/stats');
              }}
            >
              {t('Your data')}
            </a>
            <a
              href={`${BASE}/settings`}
              onClick={(e) => {
                e.preventDefault();
                navigate('/settings');
              }}
            >
              {t('Privacy')}
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
