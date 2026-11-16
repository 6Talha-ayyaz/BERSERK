import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { STORE, FEATURED } from './data/products.js';
import { createStorefront, FINE } from './three/storefront.js';
import { fmtPrice } from './lib/format.js';
import { useBag, useToast } from './lib/hooks.js';
import Landing from './components/Landing.jsx';
import Header from './components/Header.jsx';
import StoreUI from './components/StoreUI.jsx';
import HoverTag from './components/HoverTag.jsx';
import ProductPage from './components/ProductPage.jsx';
import Cursor from './components/Cursor.jsx';
import Toast from './components/Toast.jsx';

const BASE_TITLE = `${STORE.name} | ${STORE.collection}`;

export default function App() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const match = pathname.match(/^\/product\/([\w-]+)\/?$/);
  const routeId = match ? match[1] : null;

  const hostRef = useRef(null);
  const landingRef = useRef(null);
  const tagRef = useRef(null);
  const cursorRef = useRef(null);
  const titleRef = useRef(null);
  const dockLinks = useRef([]);
  const engine = useRef(null);
  const navRef = useRef(navigate);
  navRef.current = navigate;

  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [live, setLive] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [mode, setMode] = useState('landing');
  const [hoverIndex, setHoverIndex] = useState(null);
  const [activeIndex, setActiveIndex] = useState(null);
  const [current, setCurrent] = useState(-1);
  const { bag, add } = useBag();
  const [toast, showToast] = useToast();

  /* ---------- the 3D scene ---------- */
  useEffect(() => {
    const store = createStorefront({
      host: hostRef.current,
      products: FEATURED,
      tagEl: tagRef.current,
      cursorEl: cursorRef.current,
      landingEl: landingRef.current,
      on: {
        live: () => setLive(true),
        waiting: setWaiting,
        progress: setProgress,
        error: setError,
        ready: () => setLoaded(true),
        mode: setMode,
        hover: setHoverIndex,
        active: setActiveIndex,
        current: setCurrent,
        navigate: (id, replace) => navRef.current(id ? `/product/${id}` : '/', { replace }),
        returned: (i) => {
          const link = dockLinks.current[i];
          if (link && document.activeElement !== link) link.focus({ preventScroll: true });
        },
      },
    });
    engine.current = store;
    return () => { store.dispose(); engine.current = null; };
  }, []);

  /* ---------- URL -> scene ---------- */
  useEffect(() => { engine.current?.setRoute(routeId); }, [routeId]);
  const knownPath = pathname === '/' || !!match;
  useEffect(() => {
    if (!knownPath) navigate('/', { replace: true });
  }, [knownPath, navigate]);

  /* ---------- focus + title follow the scene ---------- */
  useEffect(() => {
    if (mode === 'product') titleRef.current?.focus({ preventScroll: true });
  }, [mode]);
  useEffect(() => {
    document.title = activeIndex != null ? `${FEATURED[activeIndex].name} | ${STORE.name}` : BASE_TITLE;
  }, [activeIndex]);

  /* ---------- bag ---------- */
  const onAdd = useCallback((product, size, color) => {
    add({ id: product.id, size, color });
    showToast(`Added to bag: ${product.name}${size ? `, ${size}` : ''}`);
  }, [add, showToast]);
  const onBag = useCallback(() => {
    showToast(bag.length ? `${bag.length} piece${bag.length > 1 ? 's' : ''} in your bag. Checkout is coming soon.` : 'Your bag is empty.');
  }, [bag.length, showToast]);

  const dock = useMemo(() => ({
    step: (dir) => engine.current?.step(dir),
    enter: (i) => engine.current?.dockEnter(i),
    leave: (i) => engine.current?.dockLeave(i),
    focus: (i) => engine.current?.dockFocus(i),
    blur: (i) => engine.current?.dockBlur(i),
  }), []);

  const onEnter = useCallback(() => engine.current?.enter(), []);

  const isLanding = mode === 'landing';
  const isPdp = mode === 'toProduct' || mode === 'product';
  const cls = ['app', live && 'is-live', isLanding && 'is-landing', isPdp && 'is-pdp', FINE && 'has-cursor']
    .filter(Boolean).join(' ');
  const hovered = hoverIndex != null ? FEATURED[hoverIndex] : null;
  const opening = isLanding && routeId ? FEATURED.find((p) => p.id === routeId) : null;

  return (
    <div className={cls}>
      <div ref={hostRef} />
      <div className="vignette" aria-hidden="true" />

      {isLanding && (
        <Landing
          ref={landingRef}
          products={FEATURED}
          progress={progress}
          ready={loaded}
          waiting={waiting}
          error={error}
          opening={opening}
          onEnter={onEnter}
        />
      )}
      <Header bagCount={bag.length} onBag={onBag} />
      <StoreUI products={FEATURED} current={current} dock={dock} linkRefs={dockLinks} />
      <HoverTag ref={tagRef} name={hovered?.name} price={hovered ? fmtPrice(hovered.price) : ''} />

      <ProductPage
        products={FEATURED}
        index={activeIndex}
        open={activeIndex != null}
        titleRef={titleRef}
        onAdd={onAdd}
      />
      <div className="pdp-stage-hint" aria-hidden="true">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16M4 12l4-4M4 12l4 4M20 12l-4-4M20 12l-4 4" /></svg>
        Drag to turn
      </div>

      <Cursor ref={cursorRef} />
      <Toast {...toast} />
    </div>
  );
}
