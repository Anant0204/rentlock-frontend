import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// One-time complete purge of legacy seed dummy data and mock caches from localStorage
const PURGE_FLAG = 'rentlock_clean_state_v11_pure_db';
if (localStorage.getItem(PURGE_FLAG) !== 'true') {
  const preserveKeys = new Set(['token', 'user', 'theme', 'rentlock_portfolio_groups']);
  Object.keys(localStorage).forEach((k) => {
    if (!preserveKeys.has(k)) {
      localStorage.removeItem(k);
    }
  });
  localStorage.setItem(PURGE_FLAG, 'true');
}

// Globally prevent mouse wheel from changing input[type=number] values anywhere in the app
if (typeof window !== 'undefined') {
  window.addEventListener(
    'wheel',
    () => {
      if (
        document.activeElement &&
        document.activeElement.tagName === 'INPUT' &&
        document.activeElement.type === 'number'
      ) {
        document.activeElement.blur();
      }
    },
    { passive: true }
  );
}

createRoot(document.getElementById('root')).render(
  <App />
)
