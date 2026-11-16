/* ============================================================
   3D for the storefront pages (the showroom has its own engine).

     loadModel(url)            cached GLTF load
     createViewer(...)         a live, drag-to-turn product viewer
     getTurntable(product)     16 pre-rendered frames of a full turn,
                               so shop cards can spin on hover without
                               a WebGL context per card
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const TAU = Math.PI * 2;
const damp = (a, b, rate, dt) => a + (b - a) * (1 - Math.exp(-rate * dt));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- loading ---------- */
let loader;
const cache = new Map();
const listeners = new Map();

export function loadModel(url, onProgress) {
  if (onProgress) {
    if (!listeners.has(url)) listeners.set(url, new Set());
    listeners.get(url).add(onProgress);
  }
  if (!cache.has(url)) {
    if (!loader) {
      loader = new GLTFLoader();
      const draco = new DRACOLoader();
      draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
      loader.setDRACOLoader(draco);
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
    const tell = (f) => listeners.get(url)?.forEach((fn) => fn(f));
    cache.set(url, new Promise((resolve, reject) => {
      loader.load(url,
        (g) => { tell(1); resolve(g.scene); },
        (e) => { if (e.lengthComputable) tell(e.loaded / e.total); },
        (err) => { cache.delete(url); reject(err); });
    }));
  }
  return cache.get(url);
}

/* A copy of the model, scaled and turned per the catalog, centred on the origin. */
function buildSubject(product, template) {
  const model = template.clone(true);
  const wrap = new THREE.Group();
  wrap.add(model);
  model.scale.setScalar(product.scale || 1);
  wrap.rotation.y = product.frontYaw || 0;
  wrap.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(wrap);
  const size = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  wrap.position.set(-c.x, -c.y, -c.z);
  model.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => { if ('envMapIntensity' in m) m.envMapIntensity = 0.38; });
  });
  const pivot = new THREE.Group();
  pivot.add(wrap);
  return { pivot, size, radius: Math.hypot(size.x, size.z) / 2 };
}

/* Dark clothes on a dark page: a soft key from the front, and two rim
   lights (ember from the left, cold from the right) to draw the outline. */
function lightScene(renderer, scene) {
  const pm = new THREE.PMREMGenerator(renderer);
  const env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  scene.environment = env;

  const key = new THREE.DirectionalLight(0xfff1e2, 0.85); key.position.set(1.2, 1.8, 3);
  const ember = new THREE.DirectionalLight(0xff5a24, 3); ember.position.set(-3, 1.1, -2.2);
  const cold = new THREE.DirectionalLight(0xa9bcff, 1.2); cold.position.set(3, 1.6, -2.4);
  const fill = new THREE.HemisphereLight(0xbfb8ae, 0x120d0a, 0.28);
  scene.add(key, ember, cold, fill);
  return () => env.dispose();
}

function makeRenderer(canvas, extra) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance', ...extra });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.86;
  renderer.setClearColor(0x000000, 0);
  return renderer;
}

/* Camera distance that fits a w × h subject into the view with some air around it. */
function frame(camera, w, h, fill) {
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const d = Math.max(h / 2 / t, w / 2 / (t * camera.aspect)) / fill;
  camera.position.set(0, h * 0.04, d);
  camera.lookAt(0, 0, 0);
}

/* ---------- live viewer ----------
   canvas       the <canvas> to draw into (sized by CSS; its parent is observed)
   product      catalog entry with `model`
   opts.drag    let the visitor turn the piece
   opts.spin    idle rotation, radians per second
   opts.fill    how much of the view the piece takes (0..1)
   opts.yaw     () => extra rotation, e.g. tied to scroll
   opts.onProgress / onReady / onError */
export function createViewer(canvas, product, opts = {}) {
  const { drag = true, spin = 0.25, fill = 0.8, yaw: extraYaw, onProgress, onReady, onError } = opts;
  let disposed = false, raf = 0, visible = true, subject = null, disposeLights = null;
  const cleanups = [];
  const on = (t, type, fn, o) => { t.addEventListener(type, fn, o); cleanups.push(() => t.removeEventListener(type, fn, o)); };

  let renderer;
  try { renderer = makeRenderer(canvas); } catch (err) { onError?.(err); return { dispose() {} }; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  disposeLights = lightScene(renderer, scene);

  const host = canvas.parentElement;
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (subject) frame(camera, subject.radius * 2, subject.size.y, fill);
  };
  const ro = new ResizeObserver(resize); ro.observe(host);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf && subject) { last = performance.now(); raf = requestAnimationFrame(tick); }
  });
  io.observe(host);

  /* state */
  const rot = { yaw: 0, vel: 0, tilt: 0, tiltTo: 0 };
  let grabbing = false, lastX = 0, lastY = 0, idle = 0, intro = REDUCED ? 1 : 0, last = performance.now();
  const ptr = { x: 0, y: 0 };

  if (drag) {
    on(canvas, 'pointerdown', (e) => {
      grabbing = true; lastX = e.clientX; lastY = e.clientY; rot.vel = 0;
      canvas.setPointerCapture(e.pointerId); canvas.classList.add('is-grabbing');
    });
    on(canvas, 'pointermove', (e) => {
      if (!grabbing) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      lastX = e.clientX; lastY = e.clientY;
      rot.yaw += dx * 0.011; rot.vel = dx * 0.011 * 60;
      rot.tiltTo = clamp(rot.tiltTo + dy * 0.004, -0.35, 0.35);
      idle = 0;
    });
    const up = () => { grabbing = false; canvas.classList.remove('is-grabbing'); };
    on(canvas, 'pointerup', up); on(canvas, 'pointercancel', up);
  }
  on(window, 'pointermove', (e) => {
    ptr.x = e.clientX / window.innerWidth - 0.5;
    ptr.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  function tick(now) {
    raf = 0;
    if (disposed || !visible) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    intro = Math.min(1, intro + dt / 1.6);
    const k = 1 - Math.pow(1 - intro, 4);
    if (!grabbing) {
      idle += dt;
      rot.yaw += rot.vel * dt;
      rot.vel = damp(rot.vel, idle > 0.6 && !REDUCED ? spin : 0, 3, dt);
      if (idle > 2.5) rot.tiltTo = damp(rot.tiltTo, 0, 1.5, dt);
    }
    rot.tilt = damp(rot.tilt, rot.tiltTo + (REDUCED ? 0 : ptr.y * 0.12), 6, dt);
    const p = subject.pivot;
    p.rotation.y = rot.yaw + (1 - k) * -2.6 + (extraYaw ? extraYaw() : 0) + (REDUCED ? 0 : ptr.x * 0.25);
    p.rotation.x = rot.tilt;
    p.scale.setScalar(0.86 + 0.14 * k);
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  }

  loadModel(product.model, onProgress).then((template) => {
    if (disposed) return;
    subject = buildSubject(product, template);
    scene.add(subject.pivot);
    resize();
    renderer.compile(scene, camera);
    onReady?.();
    last = performance.now();
    if (visible) raf = requestAnimationFrame(tick);
  }).catch((err) => { console.error(err); onError?.(err); });

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      cleanups.forEach((fn) => fn());
      disposeLights?.();
      renderer.dispose();
    },
  };
}

/* ---------- turntables ----------
   One hidden renderer draws every product's frames, one product at a time. */
export const TURN_FRAMES = 16;
const TURN_W = 512, TURN_H = 640;
const turns = new Map();
let bench = null, queue = Promise.resolve(), pending = 0;

function getBench() {
  if (bench) return bench;
  const canvas = document.createElement('canvas');
  canvas.width = TURN_W; canvas.height = TURN_H;
  const renderer = makeRenderer(canvas, { preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(TURN_W, TURN_H, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, TURN_W / TURN_H, 0.05, 50);
  const disposeLights = lightScene(renderer, scene);
  bench = { canvas, renderer, scene, camera, disposeLights };
  return bench;
}
function dropBench() {
  if (!bench || pending) return;
  bench.disposeLights();
  bench.renderer.dispose();
  bench.renderer.forceContextLoss();
  bench = null;
}

async function renderTurn(product) {
  const template = await loadModel(product.model);
  const { canvas, renderer, scene, camera } = getBench();
  const subject = buildSubject(product, template);
  scene.add(subject.pivot);
  frame(camera, subject.radius * 2, subject.size.y, 0.8);
  const frames = [];
  for (let i = 0; i < TURN_FRAMES; i++) {
    subject.pivot.rotation.y = (i / TURN_FRAMES) * TAU;
    renderer.render(scene, camera);
    if (window.createImageBitmap) frames.push(await createImageBitmap(canvas));
    else {
      const copy = document.createElement('canvas');
      copy.width = TURN_W; copy.height = TURN_H;
      copy.getContext('2d').drawImage(canvas, 0, 0);
      frames.push(copy);
    }
    await new Promise((r) => setTimeout(r, 0));   // keep the page responsive between frames
  }
  scene.remove(subject.pivot);
  return frames;
}

export function getTurntable(product) {
  if (!turns.has(product.id)) {
    pending++;
    const job = queue.then(() => renderTurn(product));
    queue = job.catch(() => {}).then(() => { pending--; setTimeout(dropBench, 200); });
    job.catch(() => turns.delete(product.id));
    turns.set(product.id, job);
  }
  return turns.get(product.id);
}
