import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import CommandPalette from './CommandPalette';
import './shell.css';

const NAV_SECTIONS = [
  {
    label: 'Workspace',
    items: [
      { to: '/', label: 'Overview', icon: 'grid', end: true },
      { to: '/discover', label: 'Discover', icon: 'radar' },
      { to: '/creator', label: 'Creator Studio', icon: 'film' },
    ],
  },
  {
    label: 'Production',
    items: [
      { to: '/library', label: 'Library', icon: 'stack' },
      { to: '/jobs', label: 'Jobs', icon: 'pulse' },
      { to: '/publishing', label: 'Publishing', icon: 'send' },
      { to: '/analytics', label: 'Analytics', icon: 'chart' },
    ],
  },
  {
    label: 'Configuration',
    items: [
      { to: '/calendar', label: 'Schedule', icon: 'calendar' },
      { to: '/settings', label: 'Settings', icon: 'sliders' },
    ],
  },
];

const TITLES = {
  '/': ['Overview', 'The state of the pipeline right now.'],
  '/discover': ['Discover', 'Verified stories, scored and checked.'],
  '/creator': ['Creator Studio', 'Upload, edit, preview and approve.'],
  '/library': ['Library', 'Every Reel the workspace has produced.'],
  '/jobs': ['Pipeline jobs', 'Queued, running, finished and failed work.'],
  '/publishing': ['Publishing', 'Instagram readiness and confirmed posts.'],
  '/analytics': ['Analytics', 'What the published Reels actually did.'],
  '/calendar': ['Schedule', 'When the factory runs on its own.'],
  '/settings': ['Settings', 'Providers, budgets and the workspace.'],
  '/create': ['Create Reel', 'Run the research pipeline end to end.'],
  '/editor': ['Editor', 'Adjust a Reel before it goes out.'],
  '/templates': ['Templates', 'Reusable looks for the creator.'],
};

function Icon({ name }) {
  const paths = {
    grid: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    radar: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z',
    film: 'M3 4h18v16H3zM7 4v16M14 4v16M3 9h4M3 15h4M14 9h4M14 15h4',
    stack: 'M12 2l9 5-9 5-9-5zM12 11l9 5-9 5-9-5z',
    pulse: 'M2 12h4l3-8 6 16 3-8h4',
    send: 'M22 2L11 13M22 2l-7 20-4-9-9-4z',
    chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    calendar: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4',
    sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M18 18h2M16 4v4M10 10v4M18 16v4',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35',
    menu: 'M3 6h18M3 12h18M3 18h18',
  };
  return (
    <svg
      className="shell-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const mainRef = useRef(null);

  const [title, subtitle] = useMemo(() => {
    const key = `/${location.pathname.split('/')[1] || ''}`;
    return TITLES[key] || TITLES[`/editor`] || ['AI Reel Factory', ''];
  }, [location.pathname]);

  // The command palette: Cmd/Ctrl+K.
  useEffect(() => {
    const onKey = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if (event.key === 'Escape') {
        setPaletteOpen(false);
        setMobileNav(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onNavigate = useCallback(
    (to) => {
      setPaletteOpen(false);
      setMobileNav(false);
      navigate(to);
      if (mainRef.current) mainRef.current.scrollTo({ top: 0 });
    },
    [navigate]
  );

  return (
    <div className={`shell${collapsed ? ' shell-collapsed' : ''}`}>
      <a className="shell-skip" href="#shell-main">
        Skip to content
      </a>

      <aside className={`shell-sidebar${mobileNav ? ' shell-sidebar-open' : ''}`}>
        <div className="shell-brand">
          <span className="shell-brand-mark" aria-hidden="true" />
          <span className="shell-brand-text">
            <span className="shell-brand-name">Reel Factory</span>
            <span className="shell-brand-sub">research to publish</span>
          </span>
        </div>

        <nav className="shell-nav" aria-label="Primary">
          {NAV_SECTIONS.map((section) => (
            <div className="shell-nav-section" key={section.label}>
              <p className="shell-nav-label">{section.label}</p>
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `shell-nav-link${isActive ? ' is-active' : ''}`
                  }
                  onClick={() => setMobileNav(false)}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon name={item.icon} />
                  <span className="shell-nav-text">{item.label}</span>
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="shell-sidebar-foot">
          <div className="shell-user">
            <span className="shell-avatar" aria-hidden="true">
              {(user?.email || '?').slice(0, 2).toUpperCase()}
            </span>
            <span className="shell-user-text">
              <span className="shell-user-email">{user?.email}</span>
              <button
                type="button"
                className="shell-user-signout"
                onClick={logout}
              >
                Sign out
              </button>
            </span>
          </div>
        </div>
      </aside>

      <div className="shell-body">
        <header className="shell-header">
          <button
            type="button"
            className="shell-icon-button shell-menu"
            onClick={() => setMobileNav((open) => !open)}
            aria-label="Toggle the navigation"
            aria-expanded={mobileNav}
          >
            <Icon name="menu" />
          </button>

          <div className="shell-heading">
            <h1 className="shell-title">{title}</h1>
            {subtitle && <p className="shell-subtitle">{subtitle}</p>}
          </div>

          <div className="shell-header-actions">
            <button
              type="button"
              className="shell-search"
              onClick={() => setPaletteOpen(true)}
              aria-label="Open the command palette"
            >
              <Icon name="search" />
              <span className="shell-search-text">Search</span>
              <kbd className="shell-kbd">Ctrl K</kbd>
            </button>
            <button
              type="button"
              className="shell-icon-button shell-collapse"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expand the navigation' : 'Collapse the navigation'}
              aria-pressed={collapsed}
            >
              <Icon name="menu" />
            </button>
          </div>
        </header>

        <main className="shell-main" id="shell-main" ref={mainRef} tabIndex={-1}>
          {children}
        </main>
      </div>

      {mobileNav && (
        <button
          type="button"
          className="shell-scrim"
          aria-label="Close the navigation"
          onClick={() => setMobileNav(false)}
        />
      )}

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onNavigate={onNavigate}
        sections={NAV_SECTIONS}
      />
    </div>
  );
}
