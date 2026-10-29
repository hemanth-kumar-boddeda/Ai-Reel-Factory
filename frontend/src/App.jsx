import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard.jsx';
import Discover from './pages/Discover.jsx';
import Creator from './pages/Creator.jsx';
import Library from './pages/Library.jsx';
import CreateReel from './pages/CreateReel.jsx';
import Editor from './pages/Editor.jsx';
import Analytics from './pages/Analytics.jsx';
import Calendar from './pages/Calendar.jsx';
import Jobs from './pages/Jobs.jsx';
import Publishing from './pages/Publishing.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ErrorBoundaryFallback from './components/ErrorBoundary';
import AppShell from './components/shell/AppShell';
import AppBackground from './components/motion/AppBackground';
import MotionExtras from './components/motion/MotionExtras';
import Seo from './lib/seo';
import { useAuth } from './context/AuthContext';
import './App.css';

/** The theme the workspace asked for. */
function useTheme(user) {
  useEffect(() => {
    const theme = user?.theme_preference ?? 'system';
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [user]);
}

/** A full-page state that is not the shell. */
function Splash({ label }) {
  return (
    <div className="splash" role="status" aria-live="polite">
      <span className="splash-mark" aria-hidden="true" />
      <p className="splash-label">{label}</p>
    </div>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Splash label="Opening the workspace…" />;
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

export default function App() {
  const { user, loading: authLoading } = useAuth();
  useTheme(user);

  return (
    <BrowserRouter>
      <ErrorBoundaryFallback>
        <AppBackground />
        <MotionExtras />
        <Seo />
        {authLoading ? (
          <Splash label="Opening the workspace…" />
        ) : (
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <AppShell>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/discover" element={<Discover />} />
                      <Route path="/creator" element={<Creator />} />
                      <Route path="/library" element={<Library />} />
                      <Route path="/create" element={<CreateReel />} />
                      <Route path="/editor/:reelId" element={<Editor />} />
                      <Route path="/analytics" element={<Analytics />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/jobs" element={<Jobs />} />
                      <Route path="/publishing" element={<Publishing />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </AppShell>
                </RequireAuth>
              }
            />
          </Routes>
        )}
      </ErrorBoundaryFallback>
    </BrowserRouter>
  );
}
