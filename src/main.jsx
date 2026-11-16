import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import Site from './site/Site.jsx';

// HashRouter keeps every URL as #/…: the built site works on any static host
// with no server rewrites, and product links (#/product/<id>) stay shareable.
// (No StrictMode: its double-mounted effects in development would start every
// WebGL scene twice.)
createRoot(document.getElementById('root')).render(
  <HashRouter future={{ v7_relativeSplatPath: true }}>
    <Site />
  </HashRouter>,
);
