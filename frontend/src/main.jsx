import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  // The auth provider has to wrap the app: useAuth() is used by the shell
  // and by every page.
  root.render(
    <AuthProvider>
      <App />
    </AuthProvider>
  );
} else {
  console.error('Root element not found');
}
