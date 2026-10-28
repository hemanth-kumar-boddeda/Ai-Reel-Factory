import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Discover from './pages/Discover.jsx';
import Library from './pages/Library.jsx';
import CreateReel from './pages/CreateReel.jsx';
import Editor from './pages/Editor.jsx';
import Analytics from './pages/Analytics.jsx';
import Calendar from './pages/Calendar.jsx';
import Jobs from './pages/Jobs.jsx';
import Templates from './pages/Templates.jsx';
import Review from './pages/Review.jsx';
import ErrorBoundaryFallback from './components/ErrorBoundary';
import Layout from './components/Layout';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import './App.css';

export default function App() {
  console.log('App rendering');
  return (
    <ErrorBoundaryFallback>
      <Layout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <PrivateRoute>
                <Discover />
              </PrivateRoute>
            }
          />
          <Route
            path="/library"
            element={
              <PrivateRoute>
                <Library />
              </PrivateRoute>
            }
          />
          <Route
            path="/create"
            element={
              <PrivateRoute>
                <CreateReel />
              </PrivateRoute>
            }
          />
          <Route
            path="/editor/:reelId"
            element={
              <PrivateRoute>
                <Editor />
              </PrivateRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <PrivateRoute>
                <Analytics />
              </PrivateRoute>
            }
          />
          <Route
            path="/calendar"
            element={
              <PrivateRoute>
                <Calendar />
              </PrivateRoute>
            }
          />
          <Route
            path="/jobs"
            element={
              <PrivateRoute>
                <Jobs />
              </PrivateRoute>
            }
          />
          <Route
            path="/templates"
            element={
              <PrivateRoute>
                <Templates />
              </PrivateRoute>
            }
          />
          <Route
            path="/review/:reelId"
            element={
              <PrivateRoute>
                <Review />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Layout>
    </ErrorBoundaryFallback>
  );
}
