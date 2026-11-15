/* ==========================================================
   3D boutique engine (framework-free three.js).
   React owns the page UI and the URL; this module owns the canvas,
   camera, product physics and lighting, and talks back through `on`:

     on.live()             first frame drawn (the landing can reveal itself)
     on.progress(f)        model loading progress 0..1
     on.error(msg)         loading / WebGL failure
     on.ready()            models loaded
     on.waiting(bool)      the visitor reached the door before the models finished
     on.mode(mode)         landing | store | toProduct | product | toStore
     on.hover(index|null)  product under the pointer (for the floating tag)
     on.active(index|null) product whose page is open
     on.current(index)     product the browsing camera is on (-1 = overview)
     on.navigate(id|null, replace)  the scene wants to change the URL
     on.returned(index)    camera finished flying back from a product page

   - Landing: the camera waits outside the shopfront while the models
     load; scrolling walks it through the doors (scrubbed, reversible).
   - Products hang on the room's rails, side-on like real stock.
   - Hover: the piece slides off the rail and swings round to face you.
   - Click: the camera flies in, the store lights dim, a spotlight
     comes up and the product page unfolds around the piece.
   ========================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildRoom } from './room.js';

/* ---------- small utilities ---------- */
const V3 = THREE.Vector3;
export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
export const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const TAU = Math.PI * 2;
const UP = new V3(0, 1, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const Ease = {
  inOutCubic: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t) => (t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

/* ---------- motion constants ---------- */
const HANG_TOP = -0.08;       // garment top, relative to the rail (metres)
const HOVER_SLIDE = 0.3;      // how far a hovered piece comes off the rail
const HOVER_LIFT = 0.025;
const FOCUS_SLIDE = 0.48;     // ...and when its page is open
const FOCUS_LIFT = 0.05;
const DUR = REDUCED ? 0.35 : 1;

const ENTRY_GATE = 0.3;       // how far the walk-in can go before the models have loaded

const NOOP_API = { setRoute() {}, step() {}, enter() {}, dockEnter() {}, dockLeave() {}, dockFocus() {}, dockBlur() {}, dispose() {} };

export function createStorefront({ host, products, tagEl, cursorEl, landingEl, on = {} }) {
  const emit = (name, ...args) => { if (!disposed && on[name]) on[name](...args); };
  let disposed = false;
  const cleanups = [];
  const listen = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };

  /* ---------- renderer / scene ---------- */
  const canvas = document.createElement('canvas');
  canvas.id = 'scene';
  canvas.setAttribute('aria-label', '3D boutique showing the featured products on clothing rails');
  host.appendChild(canvas);

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  } catch (err) {
    console.error(err);
    if (on.error) on.error('Your browser could not start WebGL, which this 3D boutique needs. Try a recent Chrome, Edge, Safari or Firefox.');
    return { ...NOOP_API, dispose() { canvas.remove(); } };
  }
  // Resolution starts at up to 1.75x and is lowered automatically if frames run slow (see `adapt`).
  const MAX_DPR = Math.min(window.devicePixelRatio || 1, 1.75);
  const MIN_DPR = Math.min(1, MAX_DPR);
  let dpr = MAX_DPR;
  renderer.setPixelRatio(dpr);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  // Only the room casts shadows and it is static (apart from the doors), so the
  // three shadow maps are drawn once instead of every frame.
  renderer.shadowMap.autoUpdate = false;
  renderer.shadowMap.needsUpdate = true;

  const scene = new THREE.Scene();
  const builtRoom = buildRoom(renderer, scene);
  const room = {
    ...builtRoom,
    doors: -1,
    setDoors(a) {
      if (Math.abs(a - this.doors) < 1e-4) return;
      this.doors = a;
      builtRoom.setDoors(a);
      renderer.shadowMap.needsUpdate = true;
    },
  };
  room.setDoors(0);
  scene.background = new THREE.Color(0x2b2520);   // dusk outside, so the lit shop glows
  const camera = new THREE.PerspectiveCamera(50, 1, 0.05, 120);

  // Showcase lights. Created up front at zero intensity so materials never recompile.
  const keyLight = new THREE.SpotLight(0xffe4bd, 0, 7, 0.4, 0.75, 1.2);
  const rimLight = new THREE.SpotLight(0xffc27a, 0, 5, 0.55, 0.85, 1.4);
  const fillLight = new THREE.PointLight(0xfff1de, 0, 3.5, 2);
  scene.add(keyLight, keyLight.target, rimLight, rimLight.target, fillLight);

  /* ---------- hanger ---------- */
  const hangerWood = new THREE.MeshStandardMaterial({ color: 0x5a3c25, roughness: 0.45, envMapIntensity: 0.7 });
  const hangerMetal = room.materials.brass;
  const hookGeo = new THREE.TorusGeometry(0.024, 0.0028, 8, 28, Math.PI * 1.7);
  const neckGeo = new THREE.CylinderGeometry(0.0028, 0.0028, 0.096, 8);
  // the bar sits inside the shoulders, so only the hook and neck show above the collar
  const barGeo = new THREE.TubeGeometry(
    new THREE.QuadraticBezierCurve3(new V3(-0.13, -0.16, -0.01), new V3(0, -0.075, -0.01), new V3(0.13, -0.16, -0.01)), 24, 0.006, 8);
  function makeHanger() {
    const g = new THREE.Group();
    const hook = new THREE.Mesh(hookGeo, hangerMetal);   // curls over the rail, which runs through the origin
    hook.rotation.z = -Math.PI / 2;
    const neck = new THREE.Mesh(neckGeo, hangerMetal); neck.position.y = -0.072;
    const bar = new THREE.Mesh(barGeo, hangerWood);
    g.add(hook, neck, bar);
    return g;
  }

  /* ---------- products on the rails ---------- */
  const items = products.slice(0, room.slots.length).map((data, index) => {
    const slot = room.slots[index];
    const anchor = new THREE.Group(); anchor.position.copy(slot.pos); scene.add(anchor);
    const mover = new THREE.Group(); anchor.add(mover);
    const pivot = new THREE.Group(); mover.add(pivot);
    const holder = new THREE.Group(); pivot.add(holder);
    pivot.add(makeHanger());
    const sideYaw = Math.atan2(slot.along.x, slot.along.z);
    pivot.rotation.y = sideYaw;
    return {
      data, slot, index, anchor, mover, pivot, holder, sideYaw,
      tilt: new V3().crossVectors(slot.normal, UP).normalize(),
      hit: null, centerY: -0.4, size: new V3(0.6, 0.65, 0.3),
      yaw: { x: sideYaw, v: 0 }, slide: { x: 0, v: 0 }, lift: { x: 0, v: 0 },
      spin: 0, spinV: 0, state: 'rest', phase: index * 1.7, faceFrom: null,
    };
  });

  function fitModel(item, model) {
    const d = item.data;
    const wrap = new THREE.Group();
    wrap.add(model);
    model.scale.setScalar(d.scale || 1);
    wrap.rotation.y = d.frontYaw || 0;
    wrap.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(wrap);
    const size = box.getSize(new V3()), c = box.getCenter(new V3());
    wrap.position.set(-c.x, HANG_TOP - box.max.y, -c.z);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = false;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => { if ('envMapIntensity' in m) m.envMapIntensity = 0.8; });
    });
    item.holder.add(wrap);
    item.size.copy(size);
    item.centerY = HANG_TOP - size.y / 2;
    // cheap invisible box for hover picking (raycasting the real mesh would be far too slow)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(size.x * 1.08, size.y * 1.06, Math.max(size.z, 0.2) * 1.3), new THREE.MeshBasicMaterial());
    hit.visible = false; hit.position.y = item.centerY; hit.userData.item = item;
    item.pivot.add(hit);
    item.hit = hit;
  }

  /* where the garment's centre is in the world right now */
  function itemCenter(item, out = new V3()) {
    item.mover.updateMatrixWorld();
    return out.set(0, item.centerY, 0).applyMatrix4(item.mover.matrixWorld);
  }
  /* the same point once the piece is pulled out for its page */
  function focusCenter(item) {
    const s = item.slot;
    const p = s.pos.clone().addScaledVector(s.normal, FOCUS_SLIDE);
    p.y += item.centerY + FOCUS_LIFT;
    return p;
  }

  /* ---------- camera rig ---------- */
  const rig = { pos: new V3(0, 1.62, 9.6), tgt: new V3(0, 1.45, 0), shiftX: 0, shiftY: 0 };
  const OVERVIEW = { pos: new V3(-1.0, 1.64, 4.2), tgt: new V3(2.5, 1.32, 1.0) };
  const isPortrait = () => window.innerWidth <= 760 || window.innerWidth / window.innerHeight < 0.8;

  function slotView(slot) {
    const pos = slot.pos.clone().addScaledVector(slot.normal, 2.15).addScaledVector(slot.along, 0.55); pos.y = 1.58;
    const tgt = slot.pos.clone().addScaledVector(slot.along, -0.1).addScaledVector(slot.normal, 0.1); tgt.y = 1.42;
    return { pos, tgt };
  }
  function productView(item) {
    const P = focusCenter(item);
    const portrait = isPortrait();
    // longer pieces (coats) need the camera a little further back to fit in frame
    const fit = Math.max(1, item.size.y / 0.72);
    const pos = P.clone().addScaledVector(item.slot.normal, (portrait ? 1.7 : 1.28) * fit);
    pos.y += 0.05;
    return { pos, tgt: P, shiftX: portrait ? 0 : 0.2, shiftY: portrait ? 0.215 : 0 };
  }

  // Catmull-Rom needs 3+ points to behave in three r147, so pad short paths with midpoints.
  function path(points) {
    const pts = points.length === 2 ? [points[0], points[0].clone().lerp(points[1], 0.5), points[1]] : points;
    return new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  }

  // Browsing path: overview, then one stop per product.
  const stops = [OVERVIEW, ...items.map((it) => slotView(it.slot))];
  const tourPosCurve = stops.length > 1 ? path(stops.map((s) => s.pos)) : null;
  const tourTgtCurve = stops.length > 1 ? path(stops.map((s) => s.tgt)) : null;
  function tourPose(t) {
    if (!tourPosCurve) return { pos: OVERVIEW.pos.clone(), tgt: OVERVIEW.tgt.clone() };
    const u = clamp(t / (stops.length - 1), 0, 1);
    return { pos: tourPosCurve.getPoint(u), tgt: tourTgtCurve.getPoint(u) };
  }

  // Walk-in path from the pavement, through the doors, to the browsing overview.
  const entryPos = path([new V3(0, 1.62, 9.6), new V3(0, 1.62, 6.7), new V3(-0.3, 1.62, 4.55), OVERVIEW.pos]);
  const entryTgt = path([new V3(0, 1.45, 0), new V3(0, 1.45, -1.5), new V3(0.6, 1.4, -0.8), OVERVIEW.tgt]);
  // On the landing the shopfront sits off-centre so the copy has room:
  // to the right on wide screens, lower down on tall ones.
  const landingShift = () => (isPortrait() ? { x: 0, y: -0.15 } : { x: 0.2, y: 0 });

  let flight = null;
  function fly({ pos, tgt, shiftX = 0, shiftY = 0, dur = 1.6, easing = Ease.inOutQuart, via = [], onUpdate, onDone }) {
    flight = {
      cp: path([rig.pos.clone(), ...via.map((v) => v.pos), pos.clone()]),
      ct: path([rig.tgt.clone(), ...via.map((v) => v.tgt), tgt.clone()]),
      sx0: rig.shiftX, sy0: rig.shiftY, sx1: shiftX, sy1: shiftY,
      t: 0, dur: Math.max(dur * DUR, 0.01), easing, onUpdate, onDone, speed: 1,
    };
  }

  /* ---------- state ---------- */
  let mode = 'landing';
  let ready = false;
  let entryTarget = 0;          // where the scroll wants the walk-in to be (0 = pavement, 1 = inside)
  let entryAuto = false;        // gliding on its own (button / released past halfway) rather than scrubbing
  let entryIdle = 0;
  let waiting = false;
  const entry = { x: 0, v: 0 };
  let routeId = null;           // product id from the URL (set by React)
  let active = null;            // product whose page is open
  let hovered = null;
  let tourTarget = 0, tourSmooth = 0;
  let pdpMix = 0;               // 0 = store lighting, 1 = product spotlight lighting
  const pointer = { x: -1, y: -1, nx: 0, ny: 0, onCanvas: false, moved: false };
  const par = { x: 0, y: 0 };
  let drag = null, lastInteract = 0;

  function setMode(m) { if (mode === m) return; mode = m; emit('mode', m); updateCursor(); }
  function setState(item, state) {
    if (!item || item.state === state) return;
    if (item.state === 'focus' && state !== 'focus') {   // fold the turntable spin back into the yaw
      item.yaw.x += item.spin; item.spin = 0; item.spinV = 0;
    }
    item.state = state;
  }
  function setHovered(item) {
    if (hovered === item) return;
    if (hovered && hovered !== active) setState(hovered, 'rest');
    hovered = item;
    if (item && item !== active) setState(item, 'hover');
    emit('hover', item ? item.index : null);
    updateCursor();
  }

  /* ---------- routing (the URL lives in React) ---------- */
  const routeItem = () => (routeId ? items.find((i) => i.data.id === routeId) || null : null);
  function onRoute() {
    if (mode === 'landing') {
      // a product link on the landing (or a shared link): walk in, open it on arrival
      if (routeItem()) enter();
      else if (routeId && ready) emit('navigate', null, true);
      return;
    }
    if (!ready) return;
    const item = routeItem();
    if (!item && routeId) emit('navigate', null, true);   // unknown product: back to the store
    if (item) { if (item !== active) openProduct(item); }
    else if (active) closeProduct();
  }
  const go = (item) => emit('navigate', item ? item.data.id : null, false);

  /* ---------- transitions ---------- */
  function openProduct(item) {
    const prev = active;
    if (prev && prev !== item) setState(prev, 'rest');
    setHovered(null);
    active = item;
    tourTarget = item.index + 1;
    const v = productView(item);
    item.faceFrom = v.pos;
    setState(item, 'focus');
    emit('active', item.index);
    setMode('toProduct');
    pressCursor();

    let via;
    if (prev) {
      // product to product: pull back off the rack, glide across, push in
      const a = productView(prev);
      const n = prev.slot.normal.clone().add(item.slot.normal).normalize();
      const mid = a.pos.clone().lerp(v.pos, 0.5).addScaledVector(n, 0.9); mid.y += 0.08;
      via = [{ pos: mid, tgt: a.tgt.clone().lerp(v.tgt, 0.5) }];
    } else {
      // a soft rising arc toward the piece
      const mid = rig.pos.clone().lerp(v.pos, 0.55); mid.y += 0.12;
      via = [{ pos: mid, tgt: rig.tgt.clone().lerp(v.tgt, 0.75) }];
    }
    fly({ ...v, via, dur: prev ? 2.1 : 1.9, easing: Ease.inOutQuart, onDone: () => setMode('product') });
  }

  function closeProduct() {
    const item = active;
    active = null;
    setState(item, 'rest');
    emit('active', null);
    setMode('toStore');
    tourTarget = item.index + 1;
    const p = tourPose(tourTarget);
    const mid = rig.pos.clone().lerp(p.pos, 0.5).addScaledVector(item.slot.normal, 0.25); mid.y += 0.1;
    fly({
      pos: p.pos, tgt: p.tgt, via: [{ pos: mid, tgt: rig.tgt.clone().lerp(p.tgt, 0.5) }],
      dur: 1.6, easing: Ease.inOutQuart,
      onDone: () => { setMode('store'); tourSmooth = tourTarget; emit('returned', item.index); },
    });
  }

  /* ---------- landing: scroll to walk in ---------- */
  function enter() {
    if (mode !== 'landing') return;
    clearTimeout(entryIdle);
    entryAuto = true;
    entryTarget = 1;
  }
  function leave() {
    if (mode !== 'landing') return;
    clearTimeout(entryIdle);
    entryAuto = true;
    entryTarget = 0;
  }
  function scrub(delta) {
    if (mode !== 'landing' || !delta) return;
    entryAuto = false;
    entryTarget = clamp(entryTarget + delta, 0, 1);
    // When the visitor stops scrolling, finish the move in the direction they were going:
    // past ~35% going in, walk the rest of the way; backing out, return to the pavement.
    const dir = Math.sign(delta);
    clearTimeout(entryIdle);
    entryIdle = setTimeout(() => {
      if (mode !== 'landing') return;
      if (dir > 0 && entryTarget > 0.35) enter();
      else if (dir < 0 && entryTarget < 0.8) leave();
    }, 200);
  }
  function setWaiting(w) { if (w !== waiting) { waiting = w; emit('waiting', w); } }
  function updateEntry(dt) {
    const goal = ready ? entryTarget : Math.min(entryTarget, ENTRY_GATE);
    if (REDUCED) { entry.x = goal; entry.v = 0; }
    else if (entryAuto) spring(entry, goal, 2.4, 3.1, dt);   // unhurried glide
    else spring(entry, goal, 10, 6.3, dt);                    // follows the scroll closely
    entry.x = clamp(entry.x, 0, 1);
    const k = entry.x;
    entryPos.getPoint(k, rig.pos);
    entryTgt.getPoint(k, rig.tgt);
    const s = landingShift(), off = 1 - Ease.inOutCubic(clamp(k / 0.4, 0, 1));
    rig.shiftX = s.x * off; rig.shiftY = s.y * off;
    room.setDoors(Ease.inOutCubic(clamp((k - 0.04) / 0.3, 0, 1)));
    if (landingEl) landingEl.style.setProperty('--p', k.toFixed(4));
    setWaiting(!ready && entryTarget > ENTRY_GATE && k > ENTRY_GATE - 0.03);
    if (ready && entryTarget >= 1 && k > 0.996) arrive();
  }
  function arrive() {
    clearTimeout(entryIdle);
    room.setDoors(1);
    rig.shiftX = rig.shiftY = 0;
    tourTarget = tourSmooth = 0;
    setMode('store');
    onRoute();   // a product picked on the landing opens now
  }

  function step(dir) {
    if (mode !== 'store') return;
    tourTarget = clamp(Math.round(tourTarget) + dir, 0, items.length);
    setHovered(null);
  }

  /* ---------- input ---------- */
  listen(window, 'pointermove', (e) => {
    pointer.x = e.clientX; pointer.y = e.clientY;
    pointer.nx = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.ny = (e.clientY / window.innerHeight) * 2 - 1;
    pointer.onCanvas = e.target === canvas;
    pointer.moved = true;
    if (drag) {
      const dx = e.clientX - drag.x;
      drag.dist += Math.abs(dx) + Math.abs(e.clientY - drag.y);
      drag.x = e.clientX; drag.y = e.clientY;
      if (mode === 'product' && active) {
        const now = performance.now(), dt = Math.max((now - drag.t) / 1000, 1 / 240);
        active.spin += dx * 0.009;
        active.spinV = (dx * 0.009) / dt;
        drag.t = now;
        lastInteract = now;
      }
    }
    updateCursor();
  }, { passive: true });

  listen(canvas, 'pointerdown', (e) => {
    if (mode === 'landing') return;
    drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, dist: 0, t: performance.now(), type: e.pointerType };
    try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
    if (mode === 'product' && active) { active.spinV = 0; lastInteract = performance.now(); }
  });
  listen(canvas, 'pointerup', (e) => {
    const d = drag; drag = null;
    if (!d) return;
    if (d.dist < 8) { tap(e, d.type); return; }
    // swipe to browse on touch screens
    if (mode === 'store' && d.type !== 'mouse') {
      const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 40) step(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : -1) : (dy < 0 ? 1 : -1));
    }
  });
  listen(canvas, 'pointercancel', () => { drag = null; });
  listen(canvas, 'pointerleave', (e) => {
    if (e.pointerType === 'mouse') { pointer.onCanvas = false; if (mode === 'store') setHovered(null); updateCursor(); }
  });

  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(x, y) {
    const hits = items.filter((i) => i.hit).map((i) => i.hit);
    if (!hits.length) return null;
    ray.setFromCamera(ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
    const h = ray.intersectObjects(hits, false)[0];
    return h ? h.object.userData.item : null;
  }

  function tap(e, type) {
    if (mode !== 'store') return;
    const it = pick(e.clientX, e.clientY);
    if (!it) { setHovered(null); return; }
    // touch: first tap turns the piece to you, second tap opens it
    if (type !== 'mouse' && hovered !== it) { setHovered(it); return; }
    go(it);
  }

  let wheelAcc = 0, wheelLast = 0;
  listen(window, 'wheel', (e) => {
    if (mode === 'landing') {
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      scrub((e.deltaY || e.deltaX) * unit / (window.innerHeight * 2.4));   // ~2.4 screens of scrolling walks you in
      return;
    }
    if (mode !== 'store' || (e.target instanceof Element && e.target.closest('.pdp'))) return;
    e.preventDefault();
    wheelAcc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const now = performance.now();
    if (Math.abs(wheelAcc) > 40 && now - wheelLast > 450) { step(Math.sign(wheelAcc)); wheelAcc = 0; wheelLast = now; }
    if (now - wheelLast > 600) wheelAcc *= 0.5;
  }, { passive: false });

  // touch: swipe up on the landing to walk in
  let touchY = null;
  listen(window, 'touchstart', (e) => { touchY = e.touches[0]?.clientY ?? null; }, { passive: true });
  listen(window, 'touchmove', (e) => {
    if (mode !== 'landing' || touchY == null) return;
    const y = e.touches[0].clientY;
    if (e.cancelable) e.preventDefault();
    scrub((touchY - y) / (window.innerHeight * 1.3));
    touchY = y;
  }, { passive: false });
  listen(window, 'touchend', () => { touchY = null; }, { passive: true });

  listen(window, 'keydown', (e) => {
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (mode === 'landing') {
      const onPage = document.activeElement === document.body || document.activeElement === landingEl;
      if (e.key === 'ArrowDown' || e.key === 'PageDown' || (e.key === ' ' && onPage)) { e.preventDefault(); enter(); }
      else if (e.key === 'ArrowUp' || e.key === 'PageUp') { e.preventDefault(); leave(); }
      return;
    }
    if (mode === 'store') {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
      else if (e.key === 'Enter' && document.activeElement === document.body) {
        const it = items[Math.round(tourTarget) - 1]; if (it) go(it);
      }
    } else if ((mode === 'product' || mode === 'toProduct') && e.key === 'Escape') {
      go(null);
    }
  });

  /* ---------- custom cursor (DOM node owned by React, driven from here) ---------- */
  const cur = { x: -100, y: -100 };
  const cursorLabel = cursorEl?.querySelector('.cursor-label');
  function updateCursor() {
    if (!FINE || !cursorEl) return;
    const view = mode === 'store' && hovered && pointer.onCanvas;
    const dragging = mode === 'product' && pointer.onCanvas;
    cursorEl.classList.toggle('is-view', !!view);
    cursorEl.classList.toggle('is-drag', !!dragging && !view);
    cursorEl.classList.toggle('is-hidden', !pointer.onCanvas);
    if (cursorLabel) cursorLabel.textContent = dragging ? 'Drag' : 'View';
  }
  let pressTimer = 0;
  function pressCursor() {
    if (!FINE || !cursorEl) return;
    cursorEl.classList.add('is-press');
    clearTimeout(pressTimer);
    pressTimer = setTimeout(() => cursorEl.classList.remove('is-press'), 700);
  }

  /* ---------- resize ---------- */
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 68 : 50;
    camera.updateProjectionMatrix();
    if (active && mode === 'product') {   // keep the piece framed when the window changes shape
      const v = productView(active);
      rig.pos.copy(v.pos); rig.tgt.copy(v.tgt); rig.shiftX = v.shiftX; rig.shiftY = v.shiftY;
      active.faceFrom = v.pos;
    }
  }
  listen(window, 'resize', resize);
  resize();

  /* ---------- per-frame ---------- */
  function spring(s, target, k, c, dt) {
    const n = Math.ceil(dt * 240), h = dt / n;
    for (let i = 0; i < n; i++) { s.v += (k * (target - s.x) - c * s.v) * h; s.x += s.v * h; }
  }
  const _c = new V3(), _d = new V3();

  function stepItem(it, dt, t) {
    let yawT = it.sideYaw + (REDUCED ? 0 : Math.sin(t * 0.55 + it.phase) * 0.03);
    let slideT = 0, liftT = 0;
    if (it.state !== 'rest') {
      const from = it.state === 'focus' ? it.faceFrom : camera.position;
      const c = it.state === 'focus' ? focusCenter(it) : itemCenter(it, _c);
      _d.subVectors(from, c);
      yawT = Math.atan2(_d.x, _d.z);
      slideT = it.state === 'focus' ? FOCUS_SLIDE : HOVER_SLIDE;
      liftT = it.state === 'focus' ? FOCUS_LIFT : HOVER_LIFT;
    }
    yawT = it.yaw.x + wrapPi(yawT - it.yaw.x);
    spring(it.yaw, yawT, 52, 7.2, dt);      // under-damped: the piece swings like it's on a hook
    spring(it.slide, slideT, 58, 13.5, dt);
    spring(it.lift, liftT, 60, 12, dt);

    // turntable spin on the product page (drag + inertia, then eases home)
    if (it.state === 'focus' && !drag) {
      it.spin += it.spinV * dt;
      it.spinV *= Math.exp(-3.2 * dt);
      if (performance.now() - lastInteract > 3500 && Math.abs(it.spinV) < 0.05) {
        it.spin = damp(it.spin, Math.round(it.spin / TAU) * TAU, 1.6, dt);
      }
    }
    it.mover.position.copy(it.slot.normal).multiplyScalar(it.slide.x);
    it.mover.position.y = it.lift.x;
    // the bottom of the garment lags behind as it slides, like real fabric on a hanger
    it.mover.quaternion.setFromAxisAngle(it.tilt, -clamp(it.slide.v * 0.11, -0.12, 0.12));
    it.pivot.rotation.y = it.yaw.x + it.spin;
  }

  function updateLights(dt) {
    const target = mode === 'product' || mode === 'toProduct' ? 1 : 0;
    pdpMix = damp(pdpMix, target, target ? 1.6 : 2.4, dt);
    for (const o of room.lights) o.light.intensity = o.base * (1 - 0.6 * pdpMix);

    const subject = active || hovered;
    const want = active ? 2.8 : hovered ? 1.5 : 0;
    keyLight.intensity = damp(keyLight.intensity, want, 4, dt);
    rimLight.intensity = damp(rimLight.intensity, active ? 2.2 : hovered ? 0.8 : 0, 4, dt);
    fillLight.intensity = damp(fillLight.intensity, active ? 0.45 : 0, 3, dt);
    if (subject) {
      const c = itemCenter(subject, _c), n = subject.slot.normal;
      _d.copy(c).addScaledVector(n, 1.3).addScaledVector(subject.slot.along, 0.35); _d.y += 1.35;
      keyLight.position.lerp(_d, keyLight.intensity < 0.05 ? 1 : 1 - Math.exp(-6 * dt));
      keyLight.target.position.lerp(c, keyLight.intensity < 0.05 ? 1 : 1 - Math.exp(-6 * dt));
      _d.copy(c).addScaledVector(n, -0.3); _d.y += 1.05;
      rimLight.position.copy(_d);
      rimLight.target.position.copy(c).addScaledVector(n, 0.25);
      fillLight.position.copy(c).addScaledVector(n, 0.8); fillLight.position.y -= 0.25;
    }
  }

  const _right = new V3(), _fwd = new V3(), _camUp = new V3();
  function updateCamera(dt) {
    if (flight) {
      flight.t += dt * flight.speed;
      const k = clamp(flight.t / flight.dur, 0, 1), e = flight.easing(k);
      flight.cp.getPoint(e, rig.pos);
      flight.ct.getPoint(e, rig.tgt);
      rig.shiftX = lerp(flight.sx0, flight.sx1, e);
      rig.shiftY = lerp(flight.sy0, flight.sy1, e);
      if (flight.onUpdate) flight.onUpdate(k, e);
      if (k >= 1) { const f = flight; flight = null; if (f.onDone) f.onDone(); }
    } else if (mode === 'landing') {
      updateEntry(dt);
    } else if (mode === 'store') {
      tourSmooth = damp(tourSmooth, tourTarget, 2.6, dt);
      const p = tourPose(tourSmooth);
      rig.pos.copy(p.pos); rig.tgt.copy(p.tgt);
    }
    // gentle look-around following the pointer
    const amt = REDUCED || !FINE ? 0 : mode === 'store' || mode === 'landing' ? 1 : mode === 'product' ? 0.25 : 0;
    par.x = damp(par.x, pointer.nx * amt, 2.5, dt);
    par.y = damp(par.y, pointer.ny * amt, 2.5, dt);
    _fwd.subVectors(rig.tgt, rig.pos).normalize();
    _right.crossVectors(_fwd, UP).normalize();
    _camUp.crossVectors(_right, _fwd);
    camera.position.copy(rig.pos).addScaledVector(_right, par.x * 0.08).addScaledVector(_camUp, -par.y * 0.04);
    _c.copy(rig.tgt).addScaledVector(_right, par.x * 0.32).addScaledVector(_camUp, -par.y * 0.16);
    camera.lookAt(_c);
    const w = window.innerWidth, h = window.innerHeight;
    camera.setViewOffset(w, h, -rig.shiftX * w, rig.shiftY * h, w, h);
  }

  // The tag's text and visibility come from React; only its position is set here.
  function updateTag() {
    if (!hovered || mode !== 'store' || !tagEl) return;
    const c = itemCenter(hovered, _c);
    _right.setFromMatrixColumn(camera.matrixWorld, 0);
    const side = hovered.size.x / 2 + 0.06;
    const p = c.clone().addScaledVector(_right, side).project(camera);
    let x = (p.x + 1) / 2 * window.innerWidth, y = (1 - p.y) / 2 * window.innerHeight;
    const tw = tagEl.offsetWidth || 260;
    const left = x + tw > window.innerWidth - 16;
    if (left) {
      const q = c.clone().addScaledVector(_right, -side).project(camera);
      x = (q.x + 1) / 2 * window.innerWidth - tw;
      y = (1 - q.y) / 2 * window.innerHeight;
    }
    tagEl.dataset.side = left ? 'left' : 'right';
    x = clamp(x, 16, window.innerWidth - tw - 16);
    y = clamp(y, 90, window.innerHeight - 140);
    tagEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%)`;
  }

  let lastCurrent = null;
  function updateCurrent() {
    const i = Math.round(mode === 'store' ? tourTarget : active ? active.index + 1 : tourTarget) - 1;
    if (i === lastCurrent) return;
    lastCurrent = i;
    emit('current', i);
  }

  /* Adaptive resolution: if the average frame rate stays under ~45 fps, render
     at a lower pixel ratio. It only ever steps down, so it can't oscillate. */
  const perf = { time: 0, frames: 0, slow: 0 };
  function adapt(rawDt) {
    if (!ready || rawDt > 0.25 || dpr <= MIN_DPR) return;   // skip loading hitches and tab switches
    perf.time += rawDt; perf.frames++;
    if (perf.time < 1) return;
    const fps = perf.frames / perf.time;
    perf.time = 0; perf.frames = 0;
    perf.slow = fps < 45 ? perf.slow + 1 : 0;
    if (perf.slow >= 2) {
      perf.slow = 0;
      dpr = Math.max(MIN_DPR, dpr - 0.25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
    }
  }

  const clock = new THREE.Clock();
  let raf = 0;
  function frame() {
    if (disposed) return;
    const rawDt = clock.getDelta();
    adapt(rawDt);
    const dt = Math.min(rawDt, 0.1), t = clock.elapsedTime;
    updateCamera(dt);
    camera.updateMatrixWorld();
    for (const it of items) stepItem(it, dt, t);
    if (mode === 'store' && FINE && pointer.onCanvas && !drag) {
      const it = pick(pointer.x, pointer.y);
      if (it !== hovered) setHovered(it);
    }
    updateLights(dt);
    updateTag();
    updateCurrent();
    if (FINE && cursorEl) {
      cur.x = damp(cur.x, pointer.x, 22, dt); cur.y = damp(cur.y, pointer.y, 22, dt);
      cursorEl.style.transform = `translate(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px)`;
    }
    renderer.render(scene, camera);
    if (!live) { live = true; emit('live'); }
    raf = requestAnimationFrame(frame);
  }
  let live = false;

  /* ---------- loading ---------- */
  async function boot() {
    const gltf = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    gltf.setDRACOLoader(draco);
    gltf.setMeshoptDecoder(MeshoptDecoder);

    const urls = [...new Set(items.map((i) => i.data.model))];
    const prog = new Map(urls.map((u) => [u, { l: 0, t: 0, done: false }]));
    let lastPct = -1;
    const report = () => {
      let l = 0, t = 0, done = 0;
      prog.forEach((p) => { l += p.l; t += p.t; done += p.done ? 1 : 0; });
      const f = urls.length ? (t ? (l / t) * 0.95 + (done / urls.length) * 0.05 : done / urls.length) : 1;
      const pct = Math.round(f * 100);
      if (pct !== lastPct) { lastPct = pct; emit('progress', f); }   // re-render the loader once per percent, not per chunk
    };
    frame();

    try {
      const loaded = await Promise.all(urls.map((u) => new Promise((res, rej) => {
        gltf.load(u, (g) => { prog.get(u).done = true; report(); res([u, g.scene]); },
          (e) => { if (e.lengthComputable) { prog.get(u).l = e.loaded; prog.get(u).t = e.total; report(); } },
          (err) => rej(Object.assign(new Error(`Could not load ${u}`), { cause: err })));
      })));
      if (disposed) return;
      const byUrl = new Map(loaded);
      const used = new Set();
      items.forEach((it) => {
        const src = byUrl.get(it.data.model);
        fitModel(it, used.has(src) ? src.clone(true) : src);
        used.add(src);
      });
    } catch (err) {
      console.error(err);
      emit('error', location.protocol === 'file:'
        ? 'The 3D models can’t load from a file:// address. Run the site through a web server (see README.md).'
        : `${err.message}. Check that the file path in src/data/products.js is right.`);
      return;
    } finally {
      draco.dispose();
    }
    emit('progress', 1);
    renderer.compile(scene, camera);

    ready = true;
    emit('ready');
    if (routeId && !routeItem()) emit('navigate', null, true);
    // Nothing else to do: if the visitor is already scrolling in (or waiting at
    // the door), updateEntry carries on through the doors now that `ready` is set.
  }

  // Small hook for automated checks and for poking at the store from the console.
  window.__store = {
    get mode() { return mode; },
    items,
    hover: (i) => setHovered(items[i] || null),
    enter,
    get entry() { return entry.x; },
    get entryTarget() { return entryTarget; },
    get waiting() { return waiting; },
    rig,
  };

  boot();

  return {
    /** Tell the scene which product the URL points at (null = the store). */
    setRoute(id) { routeId = id || null; onRoute(); },
    step,
    /** Walk in from the landing (the "Enter" button). */
    enter,
    dockEnter(i) { if (mode === 'store') setHovered(items[i] || null); },
    dockLeave(i) { if (hovered === items[i] && !pointer.onCanvas) setHovered(null); },
    dockFocus(i) { if (mode === 'store') { tourTarget = i + 1; setHovered(items[i] || null); } },
    dockBlur(i) { if (hovered === items[i]) setHovered(null); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(pressTimer);
      clearTimeout(entryIdle);
      cleanups.forEach((fn) => fn());
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
        mats.forEach((m) => { Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); }); m.dispose(); });
      });
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      if (window.__store && window.__store.items === items) delete window.__store;
    },
  };
}
