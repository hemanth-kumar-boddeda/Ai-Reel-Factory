import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Discover from './pages/Discover.jsx';
import Library from './pages/Library.jsx';
import CreateReel from './pages/CreateReel.jsx';
import Editor from './pages/Editor.jsx';
import Analytics from './pages/Analytics.jsx';
import Calendar from './pages/Calendar.jsx';
import Jobs from './pages/Jobs.jsx';
import Templates from './pages/Templates.jsx';
import ErrorBoundaryFallback from './components/ErrorBoundary';
import Layout from './components/Layout';
import './App.css';

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundaryFallback>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/library" element={<Library />} />
            <Route path="/create" element={<CreateReel />} />
            <Route path="/editor/:reelId" element={<Editor />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </ErrorBoundaryFallback>
    </BrowserRouter>
  );
}