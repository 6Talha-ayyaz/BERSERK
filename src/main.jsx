import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles.css';

// HashRouter keeps product URLs as #/product/<id>: they work on any static host
// with no server rewrites, and links shared from the old site still open.
// (No StrictMode: its double-mounted effects in development would load the
// 50 MB+ of 3D models twice.)
createRoot(document.getElementById('root')).render(
  <HashRouter>
    <App />
  </HashRouter>,
);
