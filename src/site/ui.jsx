/* Small motion primitives shared by every page. */
import { Fragment, createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  animate, motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion,
  useScroll, useSpring, useTransform, useVelocity,
} from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1];
export const EASE_IO = [0.77, 0, 0.18, 1];
export const FINE = typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;

/* true once the preloader has lifted: entrance animations wait for it */
export const BootCtx = createContext(true);
export const useBooted = () => useContext(BootCtx);

export function useMedia(query) {
  const [on, setOn] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const fn = () => setOn(m.matches);
    m.addEventListener('change', fn);
    return () => m.removeEventListener('change', fn);
  }, [query]);
  return on;
}

/* ---------- icons ---------- */
const paths = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>,
  bag: <><path d="M5 8h14l-1 12H6L5 8z" /><path d="M9 8V6.5a3 3 0 016 0V8" /></>,
  heart: <path d="M12 20s-7-4.4-7-9.6A3.9 3.9 0 0112 8a3.9 3.9 0 017 2.4C19 15.600 12 20 12 20z" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17L17 7M8 7h9v9" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.500l4.500 4.500L19 7.500" />,
  cube: <><path d="M12 3l8 4.500v9L12 21l-8-4.500v-9L12 3z" /><path d="M4 7.500l8 4.500 8-4.500M12 12v9" /></>,
  truck: <><path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" /><circle cx="7.500" cy="17.500" r="1.800" /><circle cx="17.500" cy="17.500" r="1.800" /></>,
  rotate: <><path d="M4 12a8 8 0 0114-5.300L20 9" /><path d="M20 4v5h-5" /><path d="M20 12a8 8 0 01-14 5.300L4 15" /><path d="M4 20v-5h5" /></>,
  grid2: <><rect x="4" y="4" width="7" height="16" /><rect x="13" y="4" width="7" height="16" /></>,
  grid3: <><rect x="3.500" y="4" width="4.500" height="16" /><rect x="9.750" y="4" width="4.500" height="16" /><rect x="16" y="4" width="4.500" height="16" /></>,
};
export function Icon({ name, size = 20, ...rest }) {
  return (
    <svg className="ico" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {paths[name]}
    </svg>
  );
}

/* The mark: three claw slashes. */
export function Mark({ size = 22 }) {
  return (
    <svg className="mark" viewBox="0 0 36 22" width={(size * 36) / 22} height={size} aria-hidden="true">
      <path d="M0 22L9 0h5L5 22zM11 22L20 0h5l-9 22zM22 22L31 0h5l-9 22z" fill="currentColor" />
    </svg>
  );
}

/* ---------- magnetic wrapper: the child leans toward the pointer ---------- */
export function Magnetic({ children, strength = 0.3, className = '' }) {
  const ref = useRef(null);
  const x = useMotionValue(0), y = useMotionValue(0);
  const cfg = { stiffness: 260, damping: 18, mass: 0.5 };
  const sx = useSpring(x, cfg), sy = useSpring(y, cfg);
  const move = (e) => {
    if (!FINE) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const leave = () => { x.set(0); y.set(0); };
  return (
    <motion.span ref={ref} className={`magnetic ${className}`} style={{ x: sx, y: sy }} onPointerMove={move} onPointerLeave={leave}>
      {children}
    </motion.span>
  );
}

/* ---------- headline that rises word by word out of a mask ----------
   Wrap a word in *asterisks* to set it in the italic serif. */
export function Rise({ text, as = 'h2', className = '', delay = 0, stagger = 0.07, when = true }) {
  const Tag = motion[as];
  const words = text.split(' ');
  let inEm = false;
  return (
    <Tag
      className={`rise ${className}`}
      initial="hide"
      whileInView={when ? 'show' : 'hide'}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      aria-label={text.replace(/\*/g, '')}
    >
      {words.map((w, i) => {
        if (w.startsWith('*')) inEm = true;
        const em = inEm;
        if (/\*[.,!?]?$/.test(w)) inEm = false;
        const clean = w.replace(/\*/g, '');
        return (
          <Fragment key={i}><span className="rise-w" aria-hidden="true">
            <motion.span
              className={em ? 'serif' : undefined}
              variants={{ hide: { y: '112%' }, show: { y: '0%', transition: { duration: 1, ease: EASE } } }}
            >
              {clean}
            </motion.span>
          </span>{i < words.length - 1 ? ' ' : ''}</Fragment>
        );
      })}
    </Tag>
  );
}

/* ---------- fade-and-lift on scroll ---------- */
export function Reveal({ children, className = '', delay = 0, y = 28, as = 'div', when = true, ...rest }) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={when ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      viewport={{ once: true, margin: '0px 0px -8% 0px' }}
      transition={{ duration: 0.9, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* ---------- marquee that speeds up and leans with scroll velocity ---------- */
const wrap = (min, max, v) => { const r = max - min; return ((((v - min) % r) + r) % r) + min; };
export function Marquee({ children, speed = 3, className = '', reverse = false }) {
  const reduced = useReducedMotion();
  const base = useMotionValue(0);
  const { scrollY } = useScroll();
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 });
  const boost = useTransform(vel, [-1500, 0, 1500], [-5, 0, 5], { clamp: false });
  const skew = useTransform(vel, [-2500, 2500], [6, -6]);
  const x = useTransform(base, (v) => `${wrap(-50, 0, v)}%`);
  const dir = useRef(reverse ? -1 : 1);
  useAnimationFrame((_, delta) => {
    if (reduced) return;
    const b = boost.get();
    if (b < -0.2) dir.current = reverse ? 1 : -1; else if (b > 0.2) dir.current = reverse ? -1 : 1;
    base.set(base.get() - dir.current * speed * (1 + Math.abs(b)) * (delta / 1000));
  });
  const half = <div className="marquee-half">{children}{children}{children}{children}</div>;
  return (
    <div className={`marquee ${className}`} aria-hidden="true">
      <motion.div className="marquee-track" style={{ x, skewX: reduced ? 0 : skew }}>{half}{half}</motion.div>
    </div>
  );
}

/* ---------- numbers ---------- */
export function CountUp({ to, prefix = '', suffix = '', duration = 1.8 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '0px 0px -10% 0px' });
  useEffect(() => {
    if (!inView) return undefined;
    const c = animate(0, to, {
      duration, ease: EASE,
      onUpdate: (v) => { if (ref.current) ref.current.textContent = prefix + Math.round(v) + suffix; },
    });
    return () => c.stop();
  }, [inView, to, prefix, suffix, duration]);
  return <span ref={ref} className="tnum">{prefix}0{suffix}</span>;
}

/* A value that rolls to its new amount instead of snapping. */
export function Rolling({ value, format }) {
  const ref = useRef(null);
  const prev = useRef(value);
  useEffect(() => {
    const from = prev.current; prev.current = value;
    if (from === value) return undefined;
    const c = animate(from, value, {
      duration: 0.6, ease: EASE,
      onUpdate: (v) => { if (ref.current) ref.current.textContent = format(Math.round(v)); },
    });
    return () => c.stop();
  }, [value, format]);
  return <span ref={ref} className="tnum">{format(value)}</span>;
}

/* ---------- a spark flies from `from` to the bag icon ---------- */
export function flyToBag(from, onLand) {
  const targets = [...document.querySelectorAll('[data-bag]')].filter((el) => el.offsetParent !== null);
  const target = targets[0];
  if (!from || !target || matchMedia('(prefers-reduced-motion: reduce)').matches) { onLand?.(); return; }
  const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
  const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
  const dx = b.left + b.width / 2 - x0, dy = b.top + b.height / 2 - y0;
  const dot = document.createElement('div');
  dot.className = 'fly';
  dot.style.left = `${x0}px`; dot.style.top = `${y0}px`;
  const core = document.createElement('i');
  dot.appendChild(core);
  document.body.appendChild(dot);
  const duration = 720;
  dot.animate([{ transform: 'translateX(0)' }, { transform: `translateX(${dx}px)` }], { duration, easing: 'cubic-bezier(.35,0,.65,1)', fill: 'forwards' });
  const fall = core.animate(
    [{ transform: 'translateY(0) scale(1)' }, { transform: `translateY(${dy}px) scale(.3)` }],
    { duration, easing: 'cubic-bezier(.45,-0.55,.85,.55)', fill: 'forwards' },
  );
  fall.onfinish = () => { dot.remove(); onLand?.(); };
}
