import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { CATALOG, CATEGORIES } from '../catalog.js';
import { useStore } from '../store.jsx';
import { EASE, Icon, Reveal, Rise, useMedia } from '../ui.jsx';
import ProductCard from '../components/ProductCard.jsx';

const SORTS = [
  { id: 'featured', label: 'Featured' },
  { id: 'low', label: 'Price, low to high' },
  { id: 'high', label: 'Price, high to low' },
  { id: 'name', label: 'Name, A to Z' },
];
const TITLES = { All: 'Every *piece.*', Saved: 'Saved for *later.*' };

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const { wish } = useStore();
  const wide = useMedia('(min-width: 900px)');
  const [cols, setCols] = useState(() => Number(localStorage.getItem('berserk-cols')) || 3);
  const tabs = ['All', ...CATEGORIES, 'Saved'];
  const cat = tabs.includes(params.get('c')) ? params.get('c') : 'All';
  const sort = SORTS.some((s) => s.id === params.get('sort')) ? params.get('sort') : 'featured';

  const set = (key, value, fallback) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  };
  const pickCols = (n) => { setCols(n); try { localStorage.setItem('berserk-cols', n); } catch (_) { /* private mode */ } };

  const count = (t) => (t === 'All' ? CATALOG.length : t === 'Saved' ? wish.length : CATALOG.filter((p) => p.category === t).length);
  const list = useMemo(() => {
    const base = CATALOG.filter((p) => (cat === 'All' ? true : cat === 'Saved' ? wish.includes(p.id) : p.category === cat));
    if (sort === 'low') return [...base].sort((a, b) => a.price - b.price);
    if (sort === 'high') return [...base].sort((a, b) => b.price - a.price);
    if (sort === 'name') return [...base].sort((a, b) => a.name.localeCompare(b.name));
    return base;
  }, [cat, sort, wish]);

  useEffect(() => { document.title = `${cat === 'All' ? 'Shop all' : cat} | BERSERK`; }, [cat]);

  return (
    <div className="shop wrap">
      <header className="shop-head">
        <Reveal as="p" className="kicker mono" y={10}>Drop 01 · {list.length} {list.length === 1 ? 'piece' : 'pieces'}</Reveal>
        <Rise key={cat} as="h1" className="display" text={TITLES[cat] || `${cat}*.*`} delay={0.1} />
      </header>

      <div className="shop-bar">
        <LayoutGroup id="tabs">
          <div className="tabs" role="group" aria-label="Filter by kind">
            {tabs.map((t) => (
              <button key={t} type="button" className={`tab${t === cat ? ' is-on' : ''}`} aria-pressed={t === cat} onClick={() => set('c', t, 'All')}>
                {t === cat && <motion.i layoutId="tab-pill" className="tab-pill" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                <span>{t === 'Saved' && <Icon name="heart" size={14} />}{t}</span>
                <sup className="mono tnum">{count(t)}</sup>
              </button>
            ))}
          </div>
        </LayoutGroup>

        <div className="shop-tools">
          <label className="sort mono">
            <span className="dim">Sort</span>
            <select value={sort} onChange={(e) => set('sort', e.target.value, 'featured')}>
              {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
          {wide && (
            <div className="cols" role="group" aria-label="Grid density">
              {[2, 3, 4].map((n) => (
                <button key={n} type="button" className={n === cols ? 'is-on' : ''} aria-pressed={n === cols} aria-label={`${n} columns`} onClick={() => pickCols(n)}>
                  {Array.from({ length: n }, (_, i) => <i key={i} />)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid" style={{ '--cols': cols }}>
        <AnimatePresence mode="popLayout">
          {list.map((p, i) => (
            <motion.div
              key={p.id} layout
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.7, ease: EASE, delay: 0.1 + Math.min(i, 8) * 0.05 } }}
              exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.25 } }}
              transition={{ layout: { duration: 0.6, ease: EASE } }}
            >
              <ProductCard product={p} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {list.length === 0 && (
        <motion.div className="shop-empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.2 }}>
          <Icon name="heart" size={30} />
          <p className="h3">Nothing saved yet.</p>
          <p className="dim">Tap the heart on any piece and it will wait for you here.</p>
          <Link className="btn btn-line" to="/shop">Browse everything <Icon name="arrow" size={16} /></Link>
        </motion.div>
      )}
    </div>
  );
}
