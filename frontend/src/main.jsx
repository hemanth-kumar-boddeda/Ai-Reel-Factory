import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'

console.log('Main.jsx is running');

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = createRoot(rootEl);
  root.render(<App />);
} else {
  console.error('Root element not found');
}
