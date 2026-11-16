import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { useStore } from '../store.jsx';
import { CATEGORIES, FREE_SHIPPING_AT } from '../catalog.js';
import { fmtPrice } from '../../lib/format.js';
import { EASE, EASE_IO, Icon, Mark } from '../ui.jsx';

const NAV = [
  { to: '/shop', label: 'Shop all' },
  { to: '/shop?c=Outerwear', label: 'Outerwear' },
  { to: '/shop?c=Tops', label: 'Tops' },
  { to: '/shop?c=Accessories', label: 'Accessories' },
  { to: '/showroom', label: 'Showroom', tag: '3D' },
];
const NEWS = [
  `Free shipping on orders over ${fmtPrice(FREE_SHIPPING_AT)}`,
  'Drop 01 is live: two pieces you can turn in full 3D',
  '30-day returns on everything',
];

function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % NEWS.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="hd-ticker mono">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={i}
          initial={{ y: '110%', opacity: 0 }} animate={{ y: '0%', opacity: 1 }} exit={{ y: '-110%', opacity: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          {NEWS[i]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function Header() {
  const { count, wish, openCart, openSearch, bump } = useStore();
  const { pathname, search } = useLocation();
  const [menu, setMenu] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setSolid(y > 24);
    if (Math.abs(y - prev) > 4) setHidden(y > 200 && y > prev);
  });
  useEffect(() => { setMenu(false); }, [pathname, search]);
  useEffect(() => {
    document.documentElement.classList.toggle('is-locked-menu', menu);
    return () => document.documentElement.classList.remove('is-locked-menu');
  }, [menu]);

  const here = pathname + search;
  const mac = /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <>
      <motion.header
        className={`hd${solid || menu ? ' is-solid' : ''}`}
        animate={{ y: hidden && !menu ? '-100%' : '0%' }}
        transition={{ duration: 0.55, ease: EASE }}
      >
        <Ticker />
        <div className="hd-bar">
          <Link className="hd-logo" to="/" aria-label="BERSERK, home">
            <Mark size={15} /><span>BERSERK</span>
          </Link>

          <nav className="hd-nav" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={`hd-link${here === n.to ? ' is-here' : ''}`}>
                <span className="roll" data-text={n.label}>{n.label}</span>
                {n.tag && <sup className="mono">{n.tag}</sup>}
              </NavLink>
            ))}
          </nav>

          <div className="hd-tools">
            <button type="button" className="hd-search" onClick={openSearch} aria-label="Search products">
              <Icon name="search" size={17} /><span>Search</span><kbd className="mono">{mac ? '⌘K' : 'Ctrl K'}</kbd>
            </button>
            <Link className="hd-icon" to="/shop?c=Saved" aria-label={`Saved pieces: ${wish.length}`}>
              <Icon name="heart" size={19} />
              {wish.length > 0 && <i className="hd-pip" />}
            </Link>
            <button type="button" className="hd-bag" data-bag onClick={openCart} aria-label={`Bag: ${count} ${count === 1 ? 'piece' : 'pieces'}`}>
              <span>Bag</span>
              <motion.b
                key={bump}
                className="tnum"
                initial={bump ? { scale: 1.7 } : false}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 420, damping: 13 }}
              >
                {count}
              </motion.b>
            </button>
            <button type="button" className={`hd-burger${menu ? ' is-x' : ''}`} aria-expanded={menu} aria-label={menu ? 'Close menu' : 'Open menu'} onClick={() => setMenu((m) => !m)}>
              <i /><i />
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {menu && (
          <motion.div
            className="menu"
            initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }} exit={{ clipPath: 'inset(0 0 100% 0)' }}
            transition={{ duration: 0.7, ease: EASE_IO }}
          >
            <nav aria-label="Menu">
              {[{ to: '/', label: 'Home' }, { to: '/shop', label: 'Shop all' }, ...CATEGORIES.map((c) => ({ to: `/shop?c=${c}`, label: c })), { to: '/showroom', label: 'Showroom', tag: '3D' }].map((n, i) => (
                <span className="menu-row" key={n.to}>
                  <motion.span
                    initial={{ y: '110%' }} animate={{ y: '0%' }} exit={{ y: '110%', transition: { duration: 0.3 } }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.2 + i * 0.05 }}
                  >
                    <Link to={n.to} className="menu-link">
                      <small className="mono">{String(i + 1).padStart(2, '0')}</small>{n.label}{n.tag && <sup className="mono">{n.tag}</sup>}
                    </Link>
                  </motion.span>
                </span>
              ))}
            </nav>
            <motion.div className="menu-foot mono" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6 } }} exit={{ opacity: 0 }}>
              <button type="button" onClick={() => { setMenu(false); openSearch(); }}><Icon name="search" size={16} />Search</button>
              <Link to="/shop?c=Saved"><Icon name="heart" size={16} />Saved ({wish.length})</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
