import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from '../store.jsx';
import { CATALOG, CATEGORIES } from '../catalog.js';
import { fmtPrice } from '../../lib/format.js';
import { EASE, Icon } from '../ui.jsx';
import Visual from './Visual.jsx';

const IDEAS = ['Hoodie', 'Leather', 'Cargo', 'Black', 'Cap'];

/* Search as a command palette: Ctrl/⌘ K or "/" opens it, arrows move, Enter goes. */
export default function SearchPalette() {
  const { searchOpen, openSearch, closeSearch } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const list = useRef(null);

  useEffect(() => {
    const key = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
      if ((e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault(); openSearch();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [openSearch]);

  useEffect(() => { closeSearch(); }, [pathname]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!searchOpen) return undefined;
    setQ(''); setActive(0);
    document.documentElement.classList.add('is-locked');
    const t = setTimeout(() => input.current?.focus(), 60);
    return () => { clearTimeout(t); document.documentElement.classList.remove('is-locked'); };
  }, [searchOpen]);

  const results = useMemo(() => {
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (!terms.length) return CATALOG.slice(0, 4);
    return CATALOG.filter((p) => {
      const hay = [p.name, p.category, p.tagline, p.code, ...(p.colors || []).map((c) => c.name)].join(' ').toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [q]);
  useEffect(() => { setActive(0); }, [q]);

  const go = (p) => { closeSearch(); navigate(`/product/${p.id}`); };
  const onKey = (e) => {
    if (e.key === 'Escape') { closeSearch(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const n = results.length;
      if (!n) return;
      const next = (active + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      setActive(next);
      list.current?.children[next]?.scrollIntoView({ block: 'nearest' });
    }
    if (e.key === 'Enter' && results[active]) go(results[active]);
  };

  return (
    <AnimatePresence>
      {searchOpen && (
        <div className="find" role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKey}>
          <motion.div className="find-veil" onClick={closeSearch} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} />
          <motion.div
            className="find-panel"
            initial={{ opacity: 0, y: -24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -16, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <label className="find-field">
              <Icon name="search" size={22} />
              <input
                ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search the drop"
                aria-label="Search products" autoComplete="off" spellCheck="false"
                role="combobox" aria-expanded="true" aria-controls="find-list" aria-activedescendant={results[active] ? `find-${results[active].id}` : undefined}
              />
              <button type="button" className="mono find-esc" onClick={closeSearch}>Esc</button>
            </label>

            <div className="find-ideas mono">
              <span className="dim">Try</span>
              {IDEAS.map((t) => <button type="button" key={t} onClick={() => { setQ(t); input.current?.focus(); }}>{t}</button>)}
              <span className="find-gap" />
              {CATEGORIES.map((c) => <button type="button" key={c} className="is-cat" onClick={() => { closeSearch(); navigate(`/shop?c=${c}`); }}>{c}</button>)}
            </div>

            <p className="find-count mono dim" aria-live="polite">
              {q.trim() ? `${results.length} ${results.length === 1 ? 'result' : 'results'}` : 'Popular right now'}
            </p>
            <ul className="find-list" id="find-list" role="listbox" ref={list}>
              {results.map((p, i) => (
                <motion.li
                  key={p.id} id={`find-${p.id}`} role="option" aria-selected={i === active}
                  className={i === active ? 'is-active' : ''}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE, delay: Math.min(i, 6) * 0.035 }}
                  onPointerMove={() => setActive(i)} onClick={() => go(p)}
                >
                  <span className="find-pic"><Visual product={p} interactive={false} /></span>
                  <span className="find-name">{p.name}<small className="mono dim">{p.category} · {p.code}</small></span>
                  <span className="mono">{fmtPrice(p.price)}</span>
                  <Icon name="arrow" size={16} />
                </motion.li>
              ))}
              {results.length === 0 && (
                <li className="find-none">
                  Nothing matches “{q}”. <button type="button" onClick={() => { closeSearch(); navigate('/shop'); }}>See everything</button>
                </li>
              )}
            </ul>

            <footer className="find-foot mono dim">
              <span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>Enter</kbd> open</span><span><kbd>Esc</kbd> close</span>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
