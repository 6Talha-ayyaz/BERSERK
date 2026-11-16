import { Suspense, lazy, useCallback, useState } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { StoreProvider } from './store.jsx';
import { BootCtx, EASE, EASE_IO, Mark } from './ui.jsx';
import Header from './components/Header.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import SearchPalette from './components/SearchPalette.jsx';
import { Cursor, Footer, Preloader } from './components/Chrome.jsx';
import Home from './pages/Home.jsx';
import Shop from './pages/Shop.jsx';
import Product, { NotFound } from './pages/Product.jsx';
import './site.css';

/* The 3D showroom (and three.js's room scene) only downloads when it is opened. */
const Showroom = lazy(() => import('../showroom/Showroom.jsx'));

const SEEN = 'berserk-seen';
const curtain = {
  in: { y: '0%' },
  on: { y: '-100%', transition: { duration: 0.8, ease: EASE_IO } },
  out: { y: ['100%', '0%'], transition: { duration: 0.55, ease: EASE_IO } },
};
const page = {
  in: { opacity: 0, y: 48 },
  on: { opacity: 1, y: 0, transition: { duration: 0.9, ease: EASE, delay: 0.3 } },
  out: { opacity: 0.35, y: -36, transition: { duration: 0.55, ease: EASE_IO } },
};

export default function Site() {
  const location = useLocation();
  const inShowroom = location.pathname.startsWith('/showroom');
  // the preloader plays once per visit, and never over the showroom (it has its own)
  const [booted, setBooted] = useState(() => {
    try { return inShowroom || sessionStorage.getItem(SEEN) === '1'; } catch (_) { return true; }
  });
  const [onHome] = useState(() => location.pathname === '/');
  const boot = useCallback(() => {
    setBooted(true);
    try { sessionStorage.setItem(SEEN, '1'); } catch (_) { /* private mode */ }
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <BootCtx.Provider value={booted}>
          {inShowroom ? (
            <Suspense fallback={<div className="room-wait mono">Opening the showroom…</div>}>
              <Showroom />
            </Suspense>
          ) : (
            <>
              <a className="skip" href="#main">Skip to content</a>
              <Header />
              <AnimatePresence mode="wait" initial={false} onExitComplete={() => window.scrollTo(0, 0)}>
                <motion.div key={location.pathname} className="route" initial="in" animate="on" exit="out">
                  <motion.div className="curtain" variants={curtain} aria-hidden="true"><Mark size={46} /></motion.div>
                  <motion.main id="main" className="page" variants={page}>
                    <Routes location={location}>
                      <Route path="/" element={<Home />} />
                      <Route path="/shop" element={<Shop />} />
                      <Route path="/product/:id" element={<Product />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                    <Footer />
                  </motion.main>
                </motion.div>
              </AnimatePresence>
              <SearchPalette />
              <Cursor />
            </>
          )}
          <CartDrawer />
          <AnimatePresence>
            {!booted && <Preloader key="pre" waitForModel={onHome} onDone={boot} />}
          </AnimatePresence>
        </BootCtx.Provider>
      </StoreProvider>
    </MotionConfig>
  );
}
