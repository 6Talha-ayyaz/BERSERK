/* Page furniture: the trailing cursor, the preloader and the footer. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { CATEGORIES, FREE_SHIPPING_AT, HERO_PRODUCT } from '../catalog.js';
import { fmtPrice } from '../../lib/format.js';
import { loadModel } from '../three/models.js';
import { EASE, EASE_IO, FINE, Icon, Magnetic, Mark, Reveal } from '../ui.jsx';

/* ---------- cursor ----------
   A ring that trails the real pointer. Over anything with data-cursor="…"
   it opens into a disc carrying that word (View, Drag, Turn). */
export function Cursor() {
  const x = useMotionValue(-100), y = useMotionValue(-100);
  const cfg = { stiffness: 520, damping: 38, mass: 0.35 };
  const sx = useSpring(x, cfg), sy = useSpring(y, cfg);
  const [label, setLabel] = useState('');
  const [hot, setHot] = useState(false);
  const [down, setDown] = useState(false);

  useEffect(() => {
    if (!FINE) return undefined;
    const move = (e) => {
      x.set(e.clientX); y.set(e.clientY);
      const t = e.target instanceof Element ? e.target : null;
      setLabel(t?.closest('[data-cursor]')?.dataset.cursor || '');
      setHot(!!t?.closest('a,button,input,select,label,[role="option"]'));
    };
    const press = () => setDown(true), release = () => setDown(false);
    const out = () => { x.set(-100); y.set(-100); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', press);
    window.addEventListener('pointerup', release);
    document.documentElement.addEventListener('pointerleave', out);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('pointerup', release);
      document.documentElement.removeEventListener('pointerleave', out);
    };
  }, [x, y]);

  if (!FINE) return null;
  return (
    <motion.div className={`cur${label ? ' has-label' : ''}${hot ? ' is-hot' : ''}${down ? ' is-down' : ''}`} style={{ x: sx, y: sy }} aria-hidden="true">
      <span className="mono">{label}</span>
    </motion.div>
  );
}

/* ---------- preloader ----------
   Counts up while the hero's 3D model downloads (home only), then lifts. */
const WORD = 'BERSERK'.split('');
export function Preloader({ waitForModel, onDone }) {
  const [pct, setPct] = useState(0);
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    let raf = 0, shown = 0, load = waitForModel ? 0 : 1, finished = false;
    const start = performance.now();
    if (waitForModel) loadModel(HERO_PRODUCT.model, (f) => { load = f; }).catch(() => { load = 1; });
    const tick = (now) => {
      const t = Math.min(1, (now - start) / 1500);
      const gaveUp = now - start > 8000;
      const target = Math.min(t, gaveUp ? 1 : 0.12 + load * 0.88);
      shown += (target - shown) * 0.14;
      if (target === 1 && shown > 0.992) shown = 1;
      setPct(Math.round(shown * 100));
      if (shown < 1) raf = requestAnimationFrame(tick);
      else if (!finished) { finished = true; setTimeout(() => done.current(), 380); }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [waitForModel]);

  return (
    <motion.div
      className="pre"
      exit={{ clipPath: 'inset(0 0 100% 0)' }}
      initial={{ clipPath: 'inset(0 0 0% 0)' }}
      transition={{ duration: 0.95, ease: EASE_IO }}
      role="status" aria-label={`Loading, ${pct}%`}
    >
      <motion.div className="pre-word" aria-hidden="true" exit={{ y: -60, opacity: 0 }} transition={{ duration: 0.7, ease: EASE_IO }}>
        {WORD.map((c, i) => (
          <span key={i}><motion.span initial={{ y: '105%' }} animate={{ y: '0%' }} transition={{ duration: 0.9, ease: EASE, delay: 0.05 + i * 0.05 }}>{c}</motion.span></span>
        ))}
      </motion.div>
      <div className="pre-foot mono" aria-hidden="true">
        <span>Drop 01</span>
        <div className="pre-bar"><i style={{ transform: `scaleX(${pct / 100})` }} /></div>
        <span className="tnum">{String(pct).padStart(3, '0')}</span>
      </div>
    </motion.div>
  );
}

/* ---------- footer ---------- */
function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  return <span className="tnum">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>;
}

export function Footer() {
  const ref = useRef(null);
  const [email, setEmail] = useState('');
  const [joined, setJoined] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end end'] });
  const wordY = useTransform(scrollYProgress, [0, 1], ['45%', '0%']);
  const submit = (e) => { e.preventDefault(); if (email.trim()) setJoined(true); };

  return (
    <footer className="ft" ref={ref}>
      <div className="ft-top wrap">
        <Reveal className="ft-news">
          <p className="kicker mono">The list</p>
          <h2 className="h2">Hear about the next drop <em className="serif">first.</em></h2>
          <AnimatePresence mode="wait" initial={false}>
            {joined ? (
              <motion.p key="ok" className="ft-ok" role="status" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
                <Icon name="check" size={18} /> Noted. Sign-ups are not wired to a mailing service yet, so nothing was sent.
              </motion.p>
            ) : (
              <motion.form key="form" className="ft-form" onSubmit={submit} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email address" autoComplete="email" />
                <button type="submit" aria-label="Join the list"><Icon name="arrow" size={20} /></button>
              </motion.form>
            )}
          </AnimatePresence>
        </Reveal>

        <Reveal className="ft-cols" delay={0.1}>
          <nav aria-label="Shop">
            <p className="mono dim">Shop</p>
            <Link to="/shop">All pieces</Link>
            {CATEGORIES.map((c) => <Link key={c} to={`/shop?c=${c}`}>{c}</Link>)}
          </nav>
          <nav aria-label="Explore">
            <p className="mono dim">Explore</p>
            <Link to="/showroom">3D showroom</Link>
            <Link to="/shop?c=Saved">Saved pieces</Link>
            <Link to="/">Drop 01</Link>
          </nav>
          <div>
            <p className="mono dim">Good to know</p>
            <span>Free shipping over {fmtPrice(FREE_SHIPPING_AT)}</span>
            <span>30-day returns</span>
            <span>Wash cold, hang dry</span>
          </div>
        </Reveal>
      </div>

      <div className="ft-word" aria-hidden="true">
        <motion.span style={{ y: wordY }}>BERSERK</motion.span>
      </div>

      <div className="ft-base wrap mono">
        <span><Mark size={10} /> © {new Date().getFullYear()} Berserk</span>
        <span className="dim">Your time <Clock /></span>
        <Magnetic>
          <button type="button" className="ft-up" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            Back to top <Icon name="arrow" size={14} style={{ transform: 'rotate(-90deg)' }} />
          </button>
        </Magnetic>
      </div>
    </footer>
  );
}
