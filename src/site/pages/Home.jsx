import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useInView, useMotionValue, useScroll, useSpring, useTransform } from 'framer-motion';
import { CATALOG, CATEGORIES, FREE_SHIPPING_AT, HERO_PRODUCT } from '../catalog.js';
import { fmtPrice } from '../../lib/format.js';
import { CountUp, EASE, FINE, Icon, Magnetic, Marquee, Reveal, Rise, useBooted, useMedia } from '../ui.jsx';
import Visual, { Stage } from '../components/Visual.jsx';
import ProductCard from '../components/ProductCard.jsx';

const MODELLED = CATALOG.filter((p) => p.model);

/* ---------- hero: the wordmark, with the hero piece turning in front of it ---------- */
function Hero() {
  const booted = useBooted();
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const wordY = useTransform(scrollYProgress, [0, 1], ['0%', '-22%']);
  const spread = useTransform(scrollYProgress, [0, 1], ['0em', '0.09em']);
  const stageY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const stageScale = useTransform(scrollYProgress, [0, 1], [1, 0.9]);
  const fade = useTransform(scrollYProgress, [0, 0.55], [1, 0]);
  const yaw = () => scrollYProgress.get() * Math.PI * 1.5;
  const show = booted && ready;

  return (
    <section className="hero" ref={ref}>
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-grid" aria-hidden="true" />

      <motion.h1 className="hero-word" style={{ y: wordY, letterSpacing: spread }} aria-label="Berserk">
        {'BERSERK'.split('').map((c, i) => (
          <span className="hero-l" key={i} aria-hidden="true">
            <motion.span initial={{ y: '104%' }} animate={booted ? { y: '0%' } : undefined} transition={{ duration: 1.3, ease: EASE, delay: 0.25 + i * 0.06 }}>{c}</motion.span>
          </span>
        ))}
      </motion.h1>

      <motion.div
        className="hero-stage" style={{ y: stageY, scale: stageScale }}
        initial={{ opacity: 0 }} animate={{ opacity: show ? 1 : 0 }} transition={{ duration: 1.2, delay: 0.5 }}
      >
        {HERO_PRODUCT.model
          ? <Stage product={HERO_PRODUCT} fill={0.8} spin={0.32} yaw={yaw} onReady={() => setReady(true)} />
          : <Visual product={HERO_PRODUCT} />}
      </motion.div>

      <motion.div className="hero-copy wrap" style={{ opacity: fade }}>
        <div className="hero-left">
          <Reveal as="p" className="kicker mono" when={booted} delay={0.9}><i className="pulse" />Drop 01 · Winter 26 · Live now</Reveal>
          <Rise as="p" className="hero-lede" text="Heavyweight streetwear. Cut in black, finished in *ember.*" when={booted} delay={1} stagger={0.05} />
          <Reveal className="hero-cta" when={booted} delay={1.25}>
            <Magnetic>
              <Link className="btn btn-ember" to="/shop"><span>Shop the drop</span><Icon name="arrow" size={18} /></Link>
            </Magnetic>
            <Magnetic>
              <Link className="btn btn-line" to="/showroom"><Icon name="cube" size={17} /><span>Walk the 3D showroom</span></Link>
            </Magnetic>
          </Reveal>
        </div>

        <Reveal className="hero-right" when={booted} delay={1.35}>
          <Link className="now" to={`/product/${HERO_PRODUCT.id}`} data-cursor="View">
            <span className="mono dim">Now turning · {HERO_PRODUCT.code}</span>
            <strong>{HERO_PRODUCT.name}</strong>
            <span className="now-row mono"><span>{fmtPrice(HERO_PRODUCT.price)}</span><Icon name="arrowUpRight" size={16} /></span>
          </Link>
          {HERO_PRODUCT.model && <p className="hint mono dim"><Icon name="rotate" size={14} />Drag the piece to turn it</p>}
        </Reveal>
      </motion.div>
    </section>
  );
}

/* ---------- the drop: scrolling down moves a row of cards sideways ---------- */
function Drop() {
  const ref = useRef(null), track = useRef(null);
  const pinned = useMedia('(min-width: 900px) and (prefers-reduced-motion: no-preference)');
  const [max, setMax] = useState(0);
  const picks = CATALOG.slice(0, 6);

  useEffect(() => {
    if (!pinned) { setMax(0); return undefined; }
    const measure = () => { if (track.current) setMax(Math.max(0, track.current.scrollWidth - window.innerWidth)); };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, [pinned]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.35 });
  const x = useTransform(smooth, (v) => -v * max);

  return (
    <section className={`drop${pinned ? ' is-pinned' : ''}`} ref={ref} style={pinned ? { height: `calc(100vh + ${max}px)` } : undefined}>
      <div className="drop-sticky">
        <motion.div className="drop-track" ref={track} style={pinned ? { x } : undefined}>
          <div className="drop-intro">
            <p className="kicker mono">Drop 01</p>
            <Rise className="h1" text="Forged in *black.*" />
            <Reveal as="p" className="lede" delay={0.2}>
              {CATALOG.length} pieces, made heavy and cut wide. Hover a card to turn it, pick a size to add it without leaving the page.
            </Reveal>
            <Reveal delay={0.3}><Link className="text-link" to="/shop">See everything <Icon name="arrow" size={16} /></Link></Reveal>
          </div>
          {picks.map((p, i) => (
            <div className="drop-item" key={p.id}>
              <span className="drop-n mono dim">{String(i + 1).padStart(2, '0')}</span>
              <ProductCard product={p} />
            </div>
          ))}
          <Link className="drop-all" to="/shop" data-cursor="Go">
            <span className="mono dim">{CATALOG.length - picks.length} more inside</span>
            <strong>All<br />pieces</strong>
            <Icon name="arrow" size={44} />
          </Link>
        </motion.div>
        {pinned && <div className="drop-bar" aria-hidden="true"><motion.i style={{ scaleX: smooth }} /></div>}
      </div>
    </section>
  );
}

/* ---------- manifesto: the words light up as you read down ---------- */
const CREED = 'Berserk is clothing for people who do not calm down. Heavy cotton. Real leather. Black, mostly. Cut wide, built slow and made to be worn hard for years, not seasons.';
function Word({ children, progress, range }) {
  const opacity = useTransform(progress, range, [0.13, 1]);
  return <motion.span style={{ opacity }}>{children} </motion.span>;
}
function Manifesto() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start 0.85', 'end 0.5'] });
  const words = CREED.split(' ');
  return (
    <section className="creed">
      <div className="wrap">
        <p className="kicker mono">The creed</p>
        <p className="creed-text" ref={ref}>
          {words.map((w, i) => <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>{w}</Word>)}
        </p>
        <dl className="stats">
          <Reveal><dt><CountUp to={319} /><small>gsm</small></dt><dd className="mono">Loopback fleece in the hoodie</dd></Reveal>
          <Reveal delay={0.08}><dt><CountUp to={CATALOG.length} /></dt><dd className="mono">Pieces in Drop 01</dd></Reveal>
          <Reveal delay={0.16}><dt><CountUp to={MODELLED.length} /></dt><dd className="mono">Pieces you can turn in 3D</dd></Reveal>
          <Reveal delay={0.24}><dt><CountUp to={30} /></dt><dd className="mono">Days to send it back</dd></Reveal>
        </dl>
      </div>
    </section>
  );
}

/* ---------- categories: big rows, with a preview that follows the pointer ---------- */
function Categories() {
  const [hover, setHover] = useState(null);
  const box = useRef(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const cfg = { stiffness: 180, damping: 20, mass: 0.5 };
  const sx = useSpring(x, cfg), sy = useSpring(y, cfg);
  const rows = CATEGORIES.map((c) => {
    const items = CATALOG.filter((p) => p.category === c);
    return { name: c, count: items.length, sample: items[0] };
  }).filter((r) => r.count);
  const move = (e) => {
    const r = box.current.getBoundingClientRect();
    x.set(e.clientX - r.left); y.set(e.clientY - r.top);
  };

  return (
    <section className="cats wrap">
      <header className="sec-head">
        <p className="kicker mono">Shop by kind</p>
        <Rise className="h1" text="Pick your *armour.*" />
      </header>
      <div className="cats-list" ref={box} onPointerMove={FINE ? move : undefined} onPointerLeave={() => setHover(null)}>
        {rows.map((r, i) => (
          <Reveal key={r.name} delay={i * 0.06} y={18}>
            <Link className="cat" to={`/shop?c=${r.name}`} onPointerEnter={() => setHover(i)} onFocus={() => setHover(i)}>
              <span className="cat-n mono">{String(i + 1).padStart(2, '0')}</span>
              <span className="cat-name">{r.name}</span>
              <span className="cat-count mono">{r.count} {r.count === 1 ? 'piece' : 'pieces'}</span>
              <span className="cat-go"><Icon name="arrow" size={26} /></span>
            </Link>
          </Reveal>
        ))}
        {FINE && (
          <motion.div className="cat-float" style={{ x: sx, y: sy }} animate={{ opacity: hover != null ? 1 : 0, scale: hover != null ? 1 : 0.7, rotate: hover != null ? -4 : 6 }} transition={{ duration: 0.45, ease: EASE }} aria-hidden="true">
            <AnimatePresence mode="popLayout" initial={false}>
              {hover != null && (
                <motion.div key={hover} initial={{ y: '100%' }} animate={{ y: '0%' }} exit={{ y: '-100%' }} transition={{ duration: 0.5, ease: EASE }}>
                  <Visual product={rows[hover].sample} interactive={false} />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ---------- showroom teaser, with a second live model ---------- */
function Room() {
  const ref = useRef(null);
  const near = useInView(ref, { once: true, margin: '400px 0px' });
  const piece = MODELLED[1] || MODELLED[0];
  return (
    <section className="room wrap" ref={ref}>
      <div className="room-copy">
        <p className="kicker mono">3D showroom</p>
        <Rise className="h1" text="Walk the *boutique.*" />
        <Reveal as="p" className="lede" delay={0.15}>
          The drop also hangs in a room you can walk into. Scroll through the doors, pull a piece off the rail and turn it in your hands before you buy.
        </Reveal>
        <Reveal as="ul" className="ticks-list mono" delay={0.25}>
          <li><Icon name="check" size={15} />Every seam and stud, from any angle</li>
          <li><Icon name="check" size={15} />Same bag as the rest of the store</li>
          <li><Icon name="check" size={15} />Runs in the browser, nothing to install</li>
        </Reveal>
        <Reveal delay={0.35}>
          <Magnetic><Link className="btn btn-bone" to="/showroom"><span>Enter the showroom</span><Icon name="arrow" size={18} /></Link></Magnetic>
        </Reveal>
      </div>
      <Reveal className="room-view" y={40}>
        <i className="tick tl" /><i className="tick tr" /><i className="tick bl" /><i className="tick br" />
        <span className="room-tag mono"><i className="pulse" />Live 3D · drag to turn</span>
        {piece && near && <Stage product={piece} fill={0.84} spin={-0.3} />}
        {piece && (
          <Link className="room-name" to={`/product/${piece.id}`}>
            <span>{piece.name}</span><span className="mono">{fmtPrice(piece.price)} <Icon name="arrowUpRight" size={14} /></span>
          </Link>
        )}
      </Reveal>
    </section>
  );
}

const BAND = [`Free shipping over ${fmtPrice(FREE_SHIPPING_AT)}`, 'Drop 01 is live', '30-day returns', 'Built heavy'];

export default function Home() {
  useEffect(() => { document.title = 'BERSERK | Heavyweight streetwear, forged in black'; }, []);
  return (
    <>
      <Hero />
      <Marquee className="band" speed={2.6}>
        {BAND.map((t) => <span key={t}>{t}<i className="band-sep" /></span>)}
      </Marquee>
      <Drop />
      <Manifesto />
      <Categories />
      <Room />
    </>
  );
}
