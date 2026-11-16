import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';
import Flat from '../flats.jsx';
import { createViewer, getTurntable } from '../three/models.js';

/* Pre-rendered 360° of a 3D product. It turns with the pointer while the
   pointer is over the nearest [data-turn] ancestor (the card). */
export function Turntable({ product, interactive = true }) {
  const canvasRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const st = { frames: null, cur: 0, to: 0, raf: 0, shown: -1 };
    let dead = false;

    const draw = () => {
      const n = st.frames.length;
      const i = ((Math.round(st.cur) % n) + n) % n;
      if (i === st.shown) return;
      st.shown = i;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(st.frames[i], 0, 0, canvas.width, canvas.height);
    };
    const tick = () => {
      st.raf = 0;
      st.cur += (st.to - st.cur) * 0.16;
      if (Math.abs(st.to - st.cur) < 0.02) st.cur = st.to;
      draw();
      if (st.cur !== st.to) st.raf = requestAnimationFrame(tick);
    };
    const go = (to) => { st.to = to; if (!st.raf && st.frames) st.raf = requestAnimationFrame(tick); };

    getTurntable(product).then((frames) => {
      if (dead) return;
      st.frames = frames; draw(); setReady(true);
    }).catch(() => {});

    const zone = interactive ? canvas.closest('[data-turn]') : null;
    const move = (e) => {
      if (e.pointerType === 'touch' || !st.frames) return;
      const r = zone.getBoundingClientRect();
      go(((e.clientX - r.left) / r.width - 0.5) * st.frames.length);
    };
    const leave = () => go(0);
    zone?.addEventListener('pointermove', move);
    zone?.addEventListener('pointerleave', leave);
    return () => {
      dead = true;
      cancelAnimationFrame(st.raf);
      zone?.removeEventListener('pointermove', move);
      zone?.removeEventListener('pointerleave', leave);
    };
  }, [product, interactive]);

  return <canvas ref={canvasRef} className={`turn${ready ? ' is-ready' : ''}`} width={512} height={640} aria-hidden="true" />;
}

/* A product's picture: its 3D turntable if it has a model, otherwise its line drawing. */
export default function Visual({ product, tint, interactive = true }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, margin: '0px 0px -5% 0px' });
  return (
    <div ref={ref} className={`visual${seen ? ' is-seen' : ''}${product.model ? ' visual-3d' : ' visual-flat'}`}>
      {product.model
        ? <Turntable product={product} interactive={interactive} />
        : <Flat kind={product.flat} tint={tint || product.colors?.[0]?.hex} />}
    </div>
  );
}

/* Live 3D viewer. Fills its parent. */
export function Stage({ product, fill = 0.8, spin = 0.25, drag = true, yaw, onReady, label }) {
  const canvasRef = useRef(null);
  const yawRef = useRef(yaw);
  yawRef.current = yaw;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const [pct, setPct] = useState(0);
  const [state, setState] = useState('loading');

  useEffect(() => {
    setState('loading');
    const viewer = createViewer(canvasRef.current, product, {
      fill, spin, drag,
      yaw: () => (yawRef.current ? yawRef.current() : 0),
      onProgress: (f) => setPct(Math.round(f * 100)),
      onReady: () => { setState('ready'); onReadyRef.current?.(); },
      onError: () => setState('error'),
    });
    return () => viewer.dispose();
  }, [product, fill, spin, drag]);

  return (
    <div className={`stage is-${state}${drag ? ' can-drag' : ''}`}>
      <canvas ref={canvasRef} aria-label={label || `3D view of ${product.name}. Drag to turn it.`} data-cursor={drag ? 'Drag' : undefined} />
      {state === 'loading' && <p className="stage-note mono" role="status">Loading 3D <span className="tnum">{pct}%</span></p>}
      {state === 'error' && <p className="stage-note mono" role="status">3D view unavailable on this device</p>}
    </div>
  );
}
