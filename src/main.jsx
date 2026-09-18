import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

console.log('Main.jsx is running');

// Immediately signal to backend via fetch
fetch('http://localhost:8000/api/debug', { method: 'POST', body: JSON.stringify({ ts: Date.now() }) })
  .then(r => console.log('Debug fetch succeeded', r))
  .catch(err => console.error('Debug fetch failed', err));

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
} else {
  console.error('Root element not found');
}
