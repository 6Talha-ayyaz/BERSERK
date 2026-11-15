/* ==========================================================
   3D boutique storefront
   - Products hang on the room's rails, side-on like real stock.
   - Hover: the piece slides off the rail and swings round to face you.
   - Click: the camera flies in, the store lights dim, a spotlight
     comes up and the product page unfolds around the piece.
   - Routes are hashes (#/product/<id>) so every product has its own
     URL, back/forward work, and it runs on any static host.
   ========================================================== */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildRoom } from './room.js';
import { STORE, PRODUCTS } from './products.js';

/* ---------- small utilities ---------- */
const $ = (s) => document.querySelector(s);
const V3 = THREE.Vector3;
const body = document.body;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(hover: hover) and (pointer: fine)').matches;
const TAU = Math.PI * 2;
const UP = new V3(0, 1, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const wrapPi = (a) => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const pad = (n) => String(n).padStart(2, '0');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const Ease = {
  inOutCubic: (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuart: (t) => (t < .5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};
const fmtPrice = (n) => new Intl.NumberFormat(STORE.locale || 'en-US', {
  style: 'currency', currency: STORE.currency || 'USD',
  minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2,
}).format(n);

/* ---------- motion constants ---------- */
const HANG_TOP = -0.08;       // garment top, relative to the rail (metres)
const HOVER_SLIDE = 0.3;      // how far a hovered piece comes off the rail
const HOVER_LIFT = 0.025;
const FOCUS_SLIDE = 0.48;     // ...and when its page is open
const FOCUS_LIFT = 0.05;
const DUR = REDUCED ? 0.35 : 1;

/* ---------- static text ---------- */
document.querySelectorAll('[data-store-name]').forEach((el) => { el.textContent = STORE.name; });
$('#store-title').textContent = STORE.collection;
const BASE_TITLE = `${STORE.name} | ${STORE.collection}`;
document.title = BASE_TITLE;

/* ---------- DOM refs ---------- */
const canvas = $('#scene');
const loaderEl = $('#loader');
const pdpEl = $('#pdp');
const tagEl = $('#tag');
const cursorEl = $('#cursor');
const toastEl = $('#toast');
const dockList = $('#dock-list');

/* ---------- renderer / scene ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (err) {
  fail('Your browser could not start WebGL, which this 3D boutique needs. Try a recent Chrome, Edge, Safari or Firefox.');
  throw err;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.62;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const room = buildRoom(renderer, scene);
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
const items = PRODUCTS.slice(0, room.slots.length).map((data, index) => {
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
if (PRODUCTS.length > room.slots.length) console.warn(`Only ${room.slots.length} display spots: extra products are not shown.`);

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
  const pos = P.clone().addScaledVector(item.slot.normal, portrait ? 1.7 : 1.28);
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

let flight = null;
function fly({ pos, tgt, shiftX = 0, shiftY = 0, dur = 1.6, easing = Ease.inOutQuart, via = [], onUpdate, onDone }) {
  flight = {
    cp: path([rig.pos.clone(), ...via.map((v) => v.pos), pos.clone()]),
    ct: path([rig.tgt.clone(), ...via.map((v) => v.tgt), tgt.clone()]),
    sx0: rig.shiftX, sy0: rig.shiftY, sx1: shiftX, sy1: shiftY,
    t: 0, dur: Math.max(dur * DUR, 0.01), easing, onUpdate, onDone, speed: 1,
  };
}

/* ---------- app state ---------- */
let mode = 'loading';         // loading | intro | store | toProduct | product | toStore
let ready = false;
let active = null;            // product whose page is open
let hovered = null;
let tourTarget = 0, tourSmooth = 0;
let pdpMix = 0;               // 0 = store lighting, 1 = product spotlight lighting
const pointer = { x: -1, y: -1, nx: 0, ny: 0, onCanvas: false, moved: false };
const par = { x: 0, y: 0 };
let drag = null, lastInteract = 0;

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
  if (item) { $('#tag-name').textContent = item.data.name; $('#tag-price').textContent = fmtPrice(item.data.price); }
  tagEl.classList.toggle('is-on', !!item);
  updateCursor();
}

/* ---------- routing ---------- */
function routeItem() {
  const m = location.hash.match(/^#\/product\/([\w-]+)/);
  return m ? items.find((i) => i.data.id === m[1]) || null : null;
}
function onRoute() {
  if (!ready) return;
  const item = routeItem();
  if (!item && /^#\/product\//.test(location.hash)) { history.replaceState(null, '', '#/'); }
  if (item) { if (item !== active) openProduct(item); }
  else if (active) closeProduct();
}
window.addEventListener('hashchange', onRoute);
const go = (item) => { location.hash = item ? `#/product/${item.data.id}` : '#/'; };

/* ---------- transitions ---------- */
function openProduct(item) {
  if (mode === 'intro') { body.classList.remove('is-intro'); room.setDoors(1); }
  const prev = active;
  if (prev && prev !== item) setState(prev, 'rest');
  setHovered(null);
  active = item;
  tourTarget = item.index + 1;
  const v = productView(item);
  item.faceFrom = v.pos;
  setState(item, 'focus');
  renderPDP(item, !!prev);
  body.classList.add('is-pdp');
  pdpEl.setAttribute('aria-hidden', 'false');
  document.title = `${item.data.name} | ${STORE.name}`;
  mode = 'toProduct';
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
  fly({
    ...v, via, dur: prev ? 2.1 : 1.9, easing: Ease.inOutQuart,
    onDone: () => {
      mode = 'product';
      const h = $('#pdp-title'); if (h) h.focus({ preventScroll: true });
    },
  });
}

function closeProduct() {
  const item = active;
  active = null;
  setState(item, 'rest');
  body.classList.remove('is-pdp');
  pdpEl.classList.remove('is-in');
  pdpEl.setAttribute('aria-hidden', 'true');
  document.title = BASE_TITLE;
  mode = 'toStore';
  tourTarget = item.index + 1;
  const p = tourPose(tourTarget);
  const mid = rig.pos.clone().lerp(p.pos, 0.5).addScaledVector(item.slot.normal, 0.25); mid.y += 0.1;
  fly({
    pos: p.pos, tgt: p.tgt, via: [{ pos: mid, tgt: rig.tgt.clone().lerp(p.tgt, 0.5) }],
    dur: 1.6, easing: Ease.inOutQuart,
    onDone: () => {
      mode = 'store'; tourSmooth = tourTarget;
      const link = dockList.querySelector(`[data-i="${item.index}"] a`); if (link && document.activeElement !== link) link.focus({ preventScroll: true });
    },
  });
}

function startIntro() {
  mode = 'intro';
  body.classList.add('is-intro');
  room.setDoors(0);
  rig.pos.set(0, 1.62, 9.6); rig.tgt.set(0, 1.45, 0);
  const ov = tourPose(0);
  fly({
    pos: ov.pos, tgt: ov.tgt, dur: 5.6, easing: Ease.inOutSine,
    via: [{ pos: new V3(0, 1.62, 6.7), tgt: new V3(0, 1.45, -1.5) }, { pos: new V3(-0.3, 1.62, 4.55), tgt: new V3(0.6, 1.4, -0.8) }],
    onUpdate: (k) => room.setDoors(Ease.inOutCubic(clamp((k - 0.04) / 0.3, 0, 1))),
    onDone: () => { room.setDoors(1); mode = 'store'; tourTarget = tourSmooth = 0; body.classList.remove('is-intro'); },
  });
}
function skipIntro() { if (mode === 'intro' && flight) flight.speed = 7; }

function step(dir) {
  if (mode !== 'store') return;
  tourTarget = clamp(Math.round(tourTarget) + dir, 0, items.length);
  setHovered(null);
}

/* ---------- product page ---------- */
let swapTimer = 0;
function renderPDP(item, swap) {
  const d = item.data, n = items.length, i = item.index;
  const prev = items[(i - 1 + n) % n], next = items[(i + 1) % n];
  const words = d.name.split(/\s+/).map((w, k) => `<span class="ln" style="--i:${2 + k}"><span>${esc(w)}</span></span>`).join(' ');
  const colors = d.colors || [];
  const html = `
    <a class="pdp-back rv" style="--i:0" href="#/">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>Back to the store
    </a>
    <p class="pdp-eyebrow rv" style="--i:1">Featured · ${pad(i + 1)} / ${pad(n)}</p>
    <h1 class="pdp-title" id="pdp-title" tabindex="-1">${words}</h1>
    <p class="pdp-price rv" style="--i:4">${fmtPrice(d.price)}</p>
    ${d.tagline ? `<p class="pdp-tagline rv" style="--i:5">${esc(d.tagline)}</p>` : ''}
    ${d.description ? `<p class="pdp-desc rv" style="--i:6">${esc(d.description)}</p>` : ''}
    ${colors.length ? `<div class="rv" style="--i:7">
      <p class="pdp-label">Colour <b id="pdp-color">${esc(colors[0].name)}</b></p>
      <div class="swatches" role="group" aria-label="Colour">${colors.map((c, k) =>
        `<button type="button" class="swatch" style="background:${esc(c.hex)}" aria-label="${esc(c.name)}" aria-pressed="${k === 0}" data-color="${esc(c.name)}"></button>`).join('')}</div>
    </div>` : ''}
    ${(d.sizes || []).length ? `<div class="rv" style="--i:8">
      <p class="pdp-label">Size <b id="pdp-size">Select a size</b></p>
      <div class="sizes" id="sizes" role="group" aria-label="Size">${d.sizes.map((s) =>
        `<button type="button" class="size" aria-pressed="false" data-size="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <p class="size-msg" id="size-msg" aria-live="polite"></p>
    </div>` : ''}
    <div class="rv" style="--i:9"><button type="button" class="btn-buy" id="btn-buy"><span>Add to bag · ${fmtPrice(d.price)}</span></button></div>
    <div class="pdp-acc rv" style="--i:10">
      ${(d.details || []).length ? `<details open><summary>Details</summary><ul>${d.details.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>` : ''}
      ${d.care ? `<details><summary>Care</summary><p>${esc(d.care)}</p></details>` : ''}
      <details><summary>Shipping &amp; returns</summary><p>Free shipping on orders over ${fmtPrice(150)}. Free returns within 30 days.</p></details>
    </div>
    ${n > 1 ? `<nav class="pdp-pager rv" style="--i:11" aria-label="More pieces">
      <a href="#/product/${esc(prev.data.id)}" class="prev"><span>← Previous</span><b>${esc(prev.data.name)}</b></a>
      <a href="#/product/${esc(next.data.id)}" class="next"><span>Next →</span><b>${esc(next.data.name)}</b></a>
    </nav>` : ''}
    ${d.credit ? `<p class="pdp-credit rv" style="--i:12">${d.credit.url ? `<a href="${esc(d.credit.url)}" target="_blank" rel="noopener">${esc(d.credit.text)}</a>` : esc(d.credit.text)}</p>` : ''}
  `;
  clearTimeout(swapTimer);
  const mount = () => {
    pdpEl.innerHTML = html;
    pdpEl.scrollTop = 0;
    pdpEl.classList.toggle('is-swap', !!swap);
    void pdpEl.offsetWidth;            // restart the reveal
    pdpEl.classList.add('is-in');
    bindPDP(item);
  };
  if (swap && pdpEl.classList.contains('is-in')) {
    pdpEl.classList.remove('is-in');
    swapTimer = setTimeout(mount, REDUCED ? 0 : 520);
  } else {
    pdpEl.classList.remove('is-in');
    mount();
  }
}

function bindPDP(item) {
  let size = null, color = item.data.colors?.[0]?.name || '';
  pdpEl.querySelectorAll('.swatch').forEach((b) => b.addEventListener('click', () => {
    pdpEl.querySelectorAll('.swatch').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    color = b.dataset.color; $('#pdp-color').textContent = color;
  }));
  pdpEl.querySelectorAll('.size').forEach((b) => b.addEventListener('click', () => {
    pdpEl.querySelectorAll('.size').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    size = b.dataset.size; $('#pdp-size').textContent = size; $('#size-msg').textContent = '';
  }));
  $('#btn-buy').addEventListener('click', () => {
    const sizes = $('#sizes');
    if (sizes && !size) {
      sizes.classList.remove('is-shake'); void sizes.offsetWidth; sizes.classList.add('is-shake');
      $('#size-msg').textContent = 'Please choose a size first.';
      return;
    }
    bag.push({ id: item.data.id, size, color });
    saveBag();
    toast(`Added to bag: ${item.data.name}${size ? `, ${size}` : ''}`);
  });
}

/* ---------- bag (demo: stored in this browser only) ---------- */
let bag = [];
try { bag = JSON.parse(localStorage.getItem('boutique-bag') || '[]'); } catch (_) { bag = []; }
function saveBag() {
  try { localStorage.setItem('boutique-bag', JSON.stringify(bag)); } catch (_) { /* private mode */ }
  const b = $('#bag-btn');
  $('#bag-count').textContent = bag.length;
  b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump');
}
$('#bag-count').textContent = bag.length;
$('#bag-btn').addEventListener('click', () => {
  toast(bag.length ? `${bag.length} piece${bag.length > 1 ? 's' : ''} in your bag. Checkout is coming soon.` : 'Your bag is empty.');
});

let toastTimer = 0;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 2800);
}

/* ---------- dock (bottom product list) ---------- */
dockList.innerHTML = items.map((it, i) =>
  `<li class="dock-item" data-i="${i}"><a href="#/product/${esc(it.data.id)}"><span class="dock-num">${pad(i + 1)}</span>${esc(it.data.name)}</a></li>`).join('');
dockList.querySelectorAll('.dock-item').forEach((li) => {
  const it = items[+li.dataset.i];
  const a = li.querySelector('a');
  a.addEventListener('mouseenter', () => { if (mode === 'store') setHovered(it); });
  a.addEventListener('mouseleave', () => { if (hovered === it && !pointer.onCanvas) setHovered(null); });
  a.addEventListener('focus', () => { if (mode === 'store') { tourTarget = it.index + 1; setHovered(it); } });
  a.addEventListener('blur', () => { if (hovered === it) setHovered(null); });
});
$('#dock-prev').addEventListener('click', () => step(-1));
$('#dock-next').addEventListener('click', () => step(1));
if (!FINE) $('#dock-hint').textContent = 'Swipe to browse · Tap a piece to turn it · Tap again to open';
if (!items.length) $('#dock-hint').textContent = 'Add products in js/products.js';

/* ---------- input ---------- */
window.addEventListener('pointermove', (e) => {
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

canvas.addEventListener('pointerdown', (e) => {
  if (mode === 'intro') { skipIntro(); return; }
  drag = { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, dist: 0, t: performance.now(), type: e.pointerType };
  try { canvas.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
  if (mode === 'product' && active) { active.spinV = 0; lastInteract = performance.now(); }
});
canvas.addEventListener('pointerup', (e) => {
  const d = drag; drag = null;
  if (!d) return;
  if (d.dist < 8) { tap(e, d.type); return; }
  // swipe to browse on touch screens
  if (mode === 'store' && d.type !== 'mouse') {
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 40) step(Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 1 : -1) : (dy < 0 ? 1 : -1));
  }
});
canvas.addEventListener('pointercancel', () => { drag = null; });
canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') { pointer.onCanvas = false; if (mode === 'store') setHovered(null); updateCursor(); } });

function pick(x, y) {
  const hits = items.filter((i) => i.hit).map((i) => i.hit);
  if (!hits.length) return null;
  ray.setFromCamera(ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1), camera);
  const h = ray.intersectObjects(hits, false)[0];
  return h ? h.object.userData.item : null;
}
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function tap(e, type) {
  if (mode !== 'store') return;
  const it = pick(e.clientX, e.clientY);
  if (!it) { setHovered(null); return; }
  // touch: first tap turns the piece to you, second tap opens it
  if (type !== 'mouse' && hovered !== it) { setHovered(it); return; }
  go(it);
}

let wheelAcc = 0, wheelLast = 0;
window.addEventListener('wheel', (e) => {
  if (mode === 'intro') { skipIntro(); return; }
  if (mode !== 'store' || pdpEl.contains(e.target)) return;
  e.preventDefault();
  wheelAcc += Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
  const now = performance.now();
  if (Math.abs(wheelAcc) > 40 && now - wheelLast > 450) { step(Math.sign(wheelAcc)); wheelAcc = 0; wheelLast = now; }
  if (now - wheelLast > 600) wheelAcc *= 0.5;
}, { passive: false });

window.addEventListener('keydown', (e) => {
  if (mode === 'intro') { skipIntro(); return; }
  const inField = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '');
  if (inField) return;
  if (mode === 'store') {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
    else if (e.key === 'Enter' && document.activeElement === body) {
      const it = items[Math.round(tourTarget) - 1]; if (it) go(it);
    }
  } else if ((mode === 'product' || mode === 'toProduct') && e.key === 'Escape') {
    go(null);
  }
});

/* ---------- custom cursor ---------- */
const cur = { x: -100, y: -100 };
if (FINE) body.classList.add('has-cursor');
function updateCursor() {
  if (!FINE) return;
  const view = mode === 'store' && hovered && pointer.onCanvas;
  const dragging = mode === 'product' && pointer.onCanvas;
  cursorEl.classList.toggle('is-view', !!view);
  cursorEl.classList.toggle('is-drag', !!dragging && !view);
  cursorEl.classList.toggle('is-hidden', !pointer.onCanvas);
  $('#cursor-label').textContent = dragging ? 'Drag' : 'View';
}
function pressCursor() {
  if (!FINE) return;
  cursorEl.classList.add('is-press');
  setTimeout(() => cursorEl.classList.remove('is-press'), 700);
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
window.addEventListener('resize', resize);
resize();

/* ---------- per-frame ---------- */
function spring(s, target, k, c, dt) {
  const n = Math.ceil(dt * 240), h = dt / n;
  for (let i = 0; i < n; i++) { s.v += (k * (target - s.x) - c * s.v) * h; s.x += s.v * h; }
}
const _c = new V3(), _d = new V3(), _q = new THREE.Quaternion();

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
  if (it.state === 'focus') {
    if (!drag) {
      it.spin += it.spinV * dt;
      it.spinV *= Math.exp(-3.2 * dt);
      if (performance.now() - lastInteract > 3500 && Math.abs(it.spinV) < 0.05) {
        it.spin = damp(it.spin, Math.round(it.spin / TAU) * TAU, 1.6, dt);
      }
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
  } else if (mode === 'store') {
    tourSmooth = damp(tourSmooth, tourTarget, 2.6, dt);
    const p = tourPose(tourSmooth);
    rig.pos.copy(p.pos); rig.tgt.copy(p.tgt);
  }
  // gentle look-around following the pointer
  const amt = REDUCED || !FINE ? 0 : mode === 'store' ? 1 : mode === 'product' ? 0.25 : 0;
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

function updateTag() {
  if (!hovered || mode !== 'store') return;
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
  tagEl.classList.toggle('is-left', left);
  x = clamp(x, 16, window.innerWidth - tw - 16);
  y = clamp(y, 90, window.innerHeight - 140);
  tagEl.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translateY(-50%)`;
}

let lastCur = '';
function updateDock() {
  const i = Math.round(mode === 'store' ? tourTarget : active ? active.index + 1 : tourTarget) - 1;
  const key = String(i);
  if (key === lastCur) return;
  lastCur = key;
  dockList.querySelectorAll('.dock-item').forEach((li) => li.classList.toggle('is-current', +li.dataset.i === i));
  const curLi = dockList.querySelector('.is-current');
  if (curLi) curLi.scrollIntoView({ block: 'nearest', inline: 'center', behavior: REDUCED ? 'auto' : 'smooth' });
  $('#dock-prev').disabled = Math.round(tourTarget) <= 0;
  $('#dock-next').disabled = Math.round(tourTarget) >= items.length;
}

const clock = new THREE.Clock();
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1), t = clock.elapsedTime;
  updateCamera(dt);
  camera.updateMatrixWorld();
  for (const it of items) stepItem(it, dt, t);
  if (mode === 'store' && FINE && pointer.onCanvas && !drag) {
    const it = pick(pointer.x, pointer.y);
    if (it !== hovered) setHovered(it);
  }
  updateLights(dt);
  updateTag();
  updateDock();
  if (FINE) {
    cur.x = damp(cur.x, pointer.x, 22, dt); cur.y = damp(cur.y, pointer.y, 22, dt);
    cursorEl.style.transform = `translate(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px)`;
  }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---------- loading ---------- */
function fail(msg) {
  loaderEl.classList.add('is-error');
  $('#loader-sub').textContent = msg;
}
function setProgress(f) {
  $('#loader-fill').style.transform = `scaleX(${f.toFixed(3)})`;
  $('#loader-pct').textContent = Math.round(f * 100);
}

async function boot() {
  const gltf = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
  gltf.setDRACOLoader(draco);
  gltf.setMeshoptDecoder(MeshoptDecoder);

  const urls = [...new Set(items.map((i) => i.data.model))];
  const prog = new Map(urls.map((u) => [u, { l: 0, t: 0, done: false }]));
  const report = () => {
    let l = 0, t = 0, done = 0;
    prog.forEach((p) => { l += p.l; t += p.t; done += p.done ? 1 : 0; });
    setProgress(urls.length ? (t ? (l / t) * 0.95 + (done / urls.length) * 0.05 : done / urls.length) : 1);
  };
  const started = performance.now();
  frame();

  try {
    const loaded = await Promise.all(urls.map((u) => new Promise((res, rej) => {
      gltf.load(u, (g) => { prog.get(u).done = true; report(); res([u, g.scene]); },
        (e) => { if (e.lengthComputable) { prog.get(u).l = e.loaded; prog.get(u).t = e.total; report(); } },
        (err) => rej(Object.assign(new Error(`Could not load ${u}`), { cause: err })));
    })));
    const byUrl = new Map(loaded);
    const used = new Set();
    items.forEach((it) => {
      const src = byUrl.get(it.data.model);
      fitModel(it, used.has(src) ? src.clone(true) : src);
      used.add(src);
    });
  } catch (err) {
    console.error(err);
    fail(location.protocol === 'file:'
      ? 'The 3D models can’t load from a file:// address. Run the site through a local web server (see README.md).'
      : `${err.message}. Check that the file path in js/products.js is right.`);
    return;
  }
  setProgress(1);
  renderer.compile(scene, camera);

  // let the loader breathe for a moment so it never just flashes
  await new Promise((r) => setTimeout(r, Math.max(0, 900 - (performance.now() - started))));
  ready = true;
  loaderEl.classList.add('is-done');
  body.classList.remove('is-loading');
  setTimeout(() => loaderEl.remove(), 2000);

  const routed = routeItem();
  if (routed) {
    room.setDoors(1);
    tourTarget = tourSmooth = routed.index + 1;
    const p = tourPose(tourTarget); rig.pos.copy(p.pos); rig.tgt.copy(p.tgt);
    mode = 'store';
    openProduct(routed);
  } else if (REDUCED) {
    room.setDoors(1);
    mode = 'store';
    if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
  } else {
    if (location.hash && location.hash !== '#/') history.replaceState(null, '', '#/');
    startIntro();
  }
}

// Small hook for automated checks and for poking at the store from the console.
window.__store = {
  get mode() { return mode; },
  items,
  hover: (i) => setHovered(items[i] || null),
  skip: skipIntro,
  rig,
};

boot();
