/* Boutique room — ported from "Boutique Room Model.html" into a reusable module.
   Geometry, materials and lighting are unchanged; the free-roam camera/UI is removed
   because the storefront drives the camera itself.
   Units are metres. Interior: x -3.5..3.5, z -4.5..4.5, entrance on +z. */
import * as THREE from 'three';

export function buildRoom(renderer, scene) {
  var W = 7.0, D = 9.0, H = 3.2;
  var HW = W / 2, HD = D / 2;

  scene.background = new THREE.Color(0x5d626b);
  var root = new THREE.Group(); root.name = 'Boutique'; scene.add(root);
  var ceilingGroup = new THREE.Group(); ceilingGroup.name = 'Ceiling'; root.add(ceilingGroup);
  var lights = [];            // every room light, so the storefront can dim them
  function addLight(l) { scene.add(l); lights.push({ light: l, base: l.intensity }); return l; }

  /* ---------- helpers ---------- */
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var R = rng(11);
  function canvasTex(w, h, draw, rx, ry) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx || 1, ry || 1);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 8; return t;
  }
  function std(color, rough, metal, o) {
    return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: rough == null ? .8 : rough, metalness: metal || 0 }, o || {}));
  }
  function mesh(geo, mat, x, y, z, parent, shadow) {
    var m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
    (parent || root).add(m); return m;
  }
  function box(w, h, d, mat, x, yBottom, z, parent) { return mesh(new THREE.BoxGeometry(w, h, d), mat, x, yBottom + h / 2, z, parent); }
  function cyl(rt, rb, h, mat, x, yBottom, z, parent, seg) { return mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 24), mat, x, yBottom + h / 2, z, parent); }

  /* ---------- textures ---------- */
  var floorTex = canvasTex(512, 512, function (g, w, h) {
    g.fillStyle = '#e7ddcc'; g.fillRect(0, 0, w, h);
    var r = rng(3);
    for (var i = 0; i < 2600; i++) { g.fillStyle = 'rgba(' + (r() < .5 ? '120,100,70' : '255,250,240') + ',' + (0.02 + r() * 0.05) + ')'; g.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
    g.lineCap = 'round';
    for (var k = 0; k < 9; k++) { g.strokeStyle = 'rgba(150,130,100,' + (0.05 + r() * 0.08) + ')'; g.lineWidth = 1 + r() * 2; g.beginPath(); var x = r() * w, y = r() * h; g.moveTo(x, y); g.bezierCurveTo(x + r() * 200 - 100, y + r() * 200 - 100, x + r() * 200 - 100, y + r() * 200 - 100, x + r() * 300 - 150, y + r() * 300 - 150); g.stroke(); }
    g.strokeStyle = '#cbbfa8'; g.lineWidth = 4; g.strokeRect(0, 0, w, h);
  }, W / 1.2, D / 1.2);
  var woodTex = canvasTex(512, 512, function (g, w, h) {
    g.fillStyle = '#a87d52'; g.fillRect(0, 0, w, h);
    var r = rng(5);
    for (var i = 0; i < 320; i++) { var x = r() * w, lw = 1 + r() * 3; g.fillStyle = r() < .5 ? 'rgba(70,40,15,' + (0.05 + r() * 0.13) + ')' : 'rgba(220,180,130,' + (0.04 + r() * 0.1) + ')'; g.fillRect(x, 0, lw, h); }
    for (var j = 1; j < 4; j++) { g.fillStyle = 'rgba(60,35,15,.35)'; g.fillRect(j * 128, 0, 2, h); }
  });
  var marbleTex = canvasTex(512, 512, function (g, w, h) {
    g.fillStyle = '#f1eee8'; g.fillRect(0, 0, w, h);
    var r = rng(9);
    for (var k = 0; k < 16; k++) { g.strokeStyle = 'rgba(125,120,112,' + (0.12 + r() * 0.2) + ')'; g.lineWidth = 0.6 + r() * 1.8; g.beginPath(); var x = r() * w, y = r() * h; g.moveTo(x, y); g.bezierCurveTo(x + r() * 260 - 130, y + r() * 260 - 130, x + r() * 260 - 130, y + r() * 260 - 130, x + r() * 400 - 200, y + r() * 400 - 200); g.stroke(); }
  });
  var carpetTex = canvasTex(256, 256, function (g, w, h) {
    g.fillStyle = '#d9cdb7'; g.fillRect(0, 0, w, h);
    var r = rng(2);
    for (var i = 0; i < 5000; i++) { g.fillStyle = 'rgba(' + (r() < .5 ? '160,140,110' : '255,250,235') + ',' + (0.05 + r() * 0.1) + ')'; g.fillRect(r() * w, r() * h, 1, 1 + r() * 3); }
  }, 3, 3);
  var glowTex = canvasTex(8, 128, function (g, w, h) {
    var gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(255,214,150,1)'); gr.addColorStop(.35, 'rgba(255,214,150,.35)'); gr.addColorStop(1, 'rgba(255,214,150,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  /* ---------- environment for soft reflections ---------- */
  (function () {
    var pm = new THREE.PMREMGenerator(renderer);
    var es = new THREE.Scene();
    es.add(new THREE.Mesh(new THREE.BoxGeometry(12, 6, 14), new THREE.MeshBasicMaterial({ color: 0x7a6d5c, side: THREE.BackSide })));
    for (var i = 0; i < 5; i++) {
      var p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, .2), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.2, 3.2), side: THREE.DoubleSide }));
      p.position.set(-4 + i * 2, 2.9, -1 + ((i % 2) * 3)); p.rotation.x = Math.PI / 2; es.add(p);
    }
    scene.environment = pm.fromScene(es, 0.04).texture;
    pm.dispose();
  })();

  /* ---------- materials ---------- */
  var M = {
    wall: std(0xe4d8c4, .95, 0, { envMapIntensity: .2 }),
    ext: std(0xe2ded6, .95),
    ceil: std(0xeadfcc, .95, 0, { envMapIntensity: .2 }),
    wood: std(0xffffff, .55, 0, { map: woodTex, envMapIntensity: .6 }),
    brass: std(0xc4a26c, .32, .95, { envMapIntensity: 1.1 }),
    dark: std(0x252420, .45, .6, { envMapIntensity: .8 }),
    marble: std(0xf1ece2, .22, 0, { map: marbleTex, envMapIntensity: .5 }),
    floor: std(0xf3ead8, .3, 0, { map: floorTex, envMapIntensity: .4 }),
    carpet: std(0xe6dac4, 1, 0, { map: carpetTex, envMapIntensity: .15 }),
    glass: std(0xd3a468, .06, .1, { transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1.2 }),
    glassFit: std(0xc9a679, .18, .1, { transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 1 }),
    mirror: std(0xd9d1c4, .04, 1, { envMapIntensity: 1.2 }),
    black: std(0x161515, .4, .1),
    leather: std(0x1b1a19, .35, .05),
    boucle: std(0xe3d8c6, 1, 0, { side: THREE.DoubleSide }),
    taupe: std(0x9a8a76, .95, 0, { side: THREE.DoubleSide }),
    white: std(0xf4f0e8, .6),
    stem: std(0x6f6a4a, .9),
    bloom: std(0xf4eadf, .9),
    lampBasic: new THREE.MeshBasicMaterial({ color: 0xfff1d6 }),
    trimBasic: new THREE.MeshBasicMaterial({ color: 0xffe3b2 }),
    pavement: std(0x8b8883, .95)
  };
  var glowMat = new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .3 });

  /* ---------- shell ---------- */
  function wallBox(w, h, d, x, yBottom, z, mats) {
    var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
    m.position.set(x, yBottom + h / 2, z); m.castShadow = true; m.receiveShadow = true; root.add(m); return m;
  }
  var IN = M.wall, OUT = M.ext;
  wallBox(.2, H, D + .4, -HW - .1, 0, 0, [IN, OUT, OUT, OUT, OUT, OUT]);
  wallBox(.2, H, D + .4, HW + .1, 0, 0, [OUT, IN, OUT, OUT, OUT, OUT]);
  wallBox(W + .4, H, .2, 0, 0, -HD - .1, [OUT, OUT, OUT, OUT, IN, OUT]);
  var OPEN = 3.5, OPEN_H = 2.7, sideW = (HW + .2 - OPEN / 2);
  wallBox(sideW, H, .2, -(OPEN / 2 + sideW / 2), 0, HD + .1, [OUT, OUT, OUT, OUT, OUT, IN]);
  wallBox(sideW, H, .2, (OPEN / 2 + sideW / 2), 0, HD + .1, [OUT, OUT, OUT, OUT, OUT, IN]);
  wallBox(OPEN, H - OPEN_H, .2, 0, OPEN_H, HD + .1, [OUT, OUT, OUT, OUT, OUT, IN]);
  var facade = new THREE.Group(); facade.name = 'Facade'; root.add(facade);
  facade.add(wallBox(5, 3.6, .2, -(HW + .2 + 2.5), 0, HD + .1, [OUT, OUT, OUT, OUT, OUT, OUT]));
  facade.add(wallBox(5, 3.6, .2, (HW + .2 + 2.5), 0, HD + .1, [OUT, OUT, OUT, OUT, OUT, OUT]));
  var floor = mesh(new THREE.PlaneGeometry(W, D), M.floor, 0, 0, 0); floor.rotation.x = -Math.PI / 2; floor.castShadow = false;
  var pave = mesh(new THREE.PlaneGeometry(40, 24), M.pavement, 0, -.005, HD + .2 + 12); pave.rotation.x = -Math.PI / 2; pave.castShadow = false;
  var ceil = mesh(new THREE.PlaneGeometry(W, D), M.ceil, 0, H, 0, ceilingGroup); ceil.rotation.x = Math.PI / 2; ceil.castShadow = false;

  /* ---------- cove soffits and glow washes ---------- */
  function glowPlane(len, hgt, x, y, z, ry) {
    var g = new THREE.Mesh(new THREE.PlaneGeometry(len, hgt), glowMat);
    g.position.set(x, y, z); g.rotation.y = ry; g.renderOrder = 2; ceilingGroup.add(g); return g;
  }
  box(.3, .22, D, M.wall, HW - .15, H - .22, 0, ceilingGroup);
  box(.3, .22, D, M.wall, -HW + .15, H - .22, 0, ceilingGroup);
  box(.02, .025, D - .1, M.trimBasic, HW - .31, H - .235, 0, ceilingGroup);
  box(.02, .025, D - .1, M.trimBasic, -HW + .31, H - .235, 0, ceilingGroup);
  glowPlane(D - .2, 1.0, HW - .012, H - .22 - .5, 0, -Math.PI / 2);
  glowPlane(D - .2, 1.0, -HW + .012, H - .22 - .5, 0, Math.PI / 2);
  box(2.6, .35, .3, M.wall, -.7, H - .35, -HD + .15, ceilingGroup);
  box(2.6, .025, .02, M.trimBasic, -.7, H - .37, -HD + .31, ceilingGroup);
  glowPlane(2.6, 1.1, -.7, H - .35 - .55, -HD + .012, 0);

  /* ---------- ceiling lights ---------- */
  var zs = [3.4, 2.1, .8, -.5, -1.8, -3.1];
  [-2.15, 0, 2.15].forEach(function (x) {
    zs.forEach(function (z, i) {
      if (x !== 0 && i % 2 === 1) return;
      mesh(new THREE.CylinderGeometry(.075, .075, .012, 20), M.white, x, H - .006, z, ceilingGroup, false);
      mesh(new THREE.CylinderGeometry(.052, .052, .014, 20), M.lampBasic, x, H - .012, z, ceilingGroup, false);
    });
  });
  mesh(new THREE.CylinderGeometry(.05, .05, .03, 16), M.white, .35, H - .015, .2, ceilingGroup, false);
  function track(x, z0, z1, alongZ, nSpots) {
    var len = Math.abs(z1 - z0), cz = (z0 + z1) / 2;
    mesh(new THREE.BoxGeometry(alongZ ? .035 : len, .03, alongZ ? len : .035), M.black, alongZ ? x : cz, H - .04, alongZ ? cz : x, ceilingGroup, false);
    for (var i = 0; i < nSpots; i++) {
      var t = (i + .5) / nSpots, p = z0 + (z1 - z0) * t;
      var s = new THREE.Group();
      s.position.set(alongZ ? x : p, H - .07, alongZ ? p : x);
      mesh(new THREE.CylinderGeometry(.01, .01, .08, 8), M.black, 0, 0, 0, s, false);
      mesh(new THREE.CylinderGeometry(.04, .034, .16, 14), M.black, 0, -.13, 0, s, false);
      var lens = mesh(new THREE.CircleGeometry(.032, 14), M.lampBasic, 0, -.211, 0, s, false); lens.rotation.x = Math.PI / 2;
      s.rotation.z = (alongZ ? (x > 0 ? .45 : -.45) : 0); s.rotation.x = (alongZ ? 0 : -.5);
      ceilingGroup.add(s);
    }
  }
  track(-1.75, 3.7, -1.9, true, 6);
  track(1.75, 3.7, -1.9, true, 6);
  track(-3.55, -1.3, 1.2, false, 5);

  /* ---------- lights ---------- */
  addLight(new THREE.HemisphereLight(0xffeccf, 0x8a7355, .3));
  [[0, 2.9, 2.6], [0, 2.9, -1.0], [0, 2.9, -3.4], [-2.2, 2.9, .5], [2.2, 2.9, .5], [-2.2, 2.9, -2.5], [2.2, 2.9, -2.5]].forEach(function (p) {
    var l = new THREE.PointLight(0xffcf94, .28, 8, 2); l.position.set(p[0], p[1], p[2]); addLight(l);
  });
  function spot(px, pz, tx, tz) {
    var s = new THREE.SpotLight(0xffd9a6, .7, 10, .7, .7, 1.5);
    s.position.set(px, H - .1, pz); s.target.position.set(tx, .9, tz);
    s.castShadow = true; s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0006; s.shadow.radius = 4;
    addLight(s); scene.add(s.target);
  }
  spot(-1.6, 1.0, -1.95, -.8);
  spot(1.9, 1.4, 2.95, -.5);
  spot(-.6, -2.6, -.6, -4.3);

  /* ---------- entrance: glazing, frames, doors ---------- */
  var DOORZ = HD + .1;
  box(.07, OPEN_H, .24, M.dark, -OPEN / 2 + .035, 0, DOORZ);
  box(.07, OPEN_H, .24, M.dark, OPEN / 2 - .035, 0, DOORZ);
  box(OPEN, .07, .24, M.dark, 0, OPEN_H - .07, DOORZ);
  [-1, 1].forEach(function (s) {
    var cx = s * (1.2 + (OPEN / 2 - 1.2) / 2), w = OPEN / 2 - 1.2 - .07;
    mesh(new THREE.PlaneGeometry(w, OPEN_H - .14), M.glass, cx, (OPEN_H - .07) / 2, DOORZ, null, false);
    box(.05, OPEN_H - .14, .1, M.dark, s * 1.2, 0, DOORZ);
    box(w + .1, .05, .1, M.dark, cx, 0, DOORZ);
    box(w + .1, .05, .1, M.dark, cx, OPEN_H - .12, DOORZ);
  });
  function makeLeaf(side) {
    var g = new THREE.Group(); var s = -side;
    g.position.set(side * 1.2, 0, DOORZ + .02);
    var lw = 1.2, lh = 2.62;
    box(lw, .1, .06, M.dark, s * lw / 2, 0, 0, g);
    box(lw, .1, .06, M.dark, s * lw / 2, lh - .1, 0, g);
    box(.07, lh, .06, M.dark, 0, 0, 0, g);
    box(.07, lh, .06, M.dark, s * (lw - .035), 0, 0, g);
    mesh(new THREE.PlaneGeometry(lw - .1, lh - .2), M.glass, s * lw / 2, lh / 2, 0, g, false);
    [.08, -.08].forEach(function (dz) {
      cyl(.013, .013, .5, M.brass, s * (lw - .12), .8, dz, g, 12);
      cyl(.008, .008, .07, M.brass, s * (lw - .12), .9, dz / 2, g, 8).rotation.x = Math.PI / 2;
    });
    root.add(g); return g;
  }
  var doorL = makeLeaf(-1), doorR = makeLeaf(1);
  function setDoors(a) { var ang = a * Math.PI * .43; doorL.rotation.y = -ang; doorR.rotation.y = ang; }

  /* ---------- left wall: mirrors ---------- */
  (function () {
    var x = -HW + .02, zc = [2.55, 1.0, -.55];
    zc.forEach(function (z) {
      mesh(new THREE.PlaneGeometry(1.35, 2.7), M.mirror, x + .005, 1.5, z, null, false).rotation.y = Math.PI / 2;
      box(.04, 2.8, .05, M.wood, x + .02, .1, z - .7);
      box(.04, 2.8, .05, M.wood, x + .02, .1, z + .7);
      box(.04, .05, 1.4, M.wood, x + .02, 2.85, z);
      box(.04, .05, 1.4, M.wood, x + .02, .1, z);
    });
  })();

  /* ---------- racks ---------- */
  function railZ(x, y, z0, z1) { var r = mesh(new THREE.CylinderGeometry(.013, .013, Math.abs(z1 - z0), 12), M.brass, x, y, (z0 + z1) / 2); r.rotation.x = Math.PI / 2; }
  function railX(z, y, x0, x1) { var r = mesh(new THREE.CylinderGeometry(.013, .013, Math.abs(x1 - x0), 12), M.brass, (x0 + x1) / 2, y, z); r.rotation.z = Math.PI / 2; }
  function pole(x, z, h, mat) { box(.045, h, .045, mat || M.wood, x, 0, z); }
  (function () {
    var x = HW - .5;
    railZ(x, 1.85, 3.3, -3.4);
    [3.2, .3, -3.3].forEach(function (z) { pole(x, z, H - .02); });
    box(.6, .1, 2.9, M.marble, x + .05, 0, 1.7);
    box(.6, .1, 3.2, M.marble, x + .05, 0, -1.6);
  })();
  (function () {
    var x = -HW + .5;
    railZ(x, 1.85, 3.35, .75);
    [3.3, .8].forEach(function (z) { pole(x, z, H - .02); });
    box(.6, .1, 2.4, M.marble, x - .05, 0, 2.0);
  })();
  (function () {
    var x = -1.95;
    railZ(x, 1.85, .25, -1.45);
    pole(x, .2, 2.05); pole(x, -1.4, 2.05);
    box(.6, .1, 1.6, M.marble, x, 0, -.6);
  })();
  box(.3, .45, .3, M.marble, -2.55 - .12, 0, -.05);
  (function () {
    var z = -HD + .55;
    railX(z, 1.75, -1.7, .3);
    [-1.7, .3].forEach(function (x) { pole(x, z, H - .02, M.brass); });
    box(2.4, .12, .45, M.marble, -.7, 0, -HD + .3);
  })();

  /* ---------- back wall: wood panels and fitting room ---------- */
  box(1.5, H, .3, M.wood, -HW + .75, 0, -HD + .15);
  box(.95, H, .45, M.wood, 1.05, 0, -HD + .225);
  (function () {
    var x0 = 1.5, x1 = HW, zf = -2.85;
    box(x1 - x0 - 1.05, H, .12, M.wood, x1 - (x1 - x0 - 1.05) / 2, 0, zf);
    box(.1, H, 1.65, M.wood, x0 + .05, 0, (zf - HD) / 2);
    var gx = x0 + .1 + .5;
    mesh(new THREE.PlaneGeometry(1.0, 2.5), M.glassFit, gx, 1.3, zf, null, false);
    box(.04, 2.55, .06, M.dark, gx - .5, 0, zf);
    box(.04, 2.55, .06, M.dark, gx + .5, 0, zf);
    box(1.04, .04, .06, M.dark, gx, 2.52, zf);
    box(1.04, .04, .06, M.dark, gx, 0, zf);
    cyl(.01, .01, .35, M.brass, gx + .4, 1.0, zf + .04, null, 10);
    var l = new THREE.PointLight(0xffd6a0, .5, 4, 2); l.position.set(2.5, 2.4, -3.7); addLight(l);
  })();

  /* ---------- furniture ---------- */
  (function () {
    var c = mesh(new THREE.CircleGeometry(1, 64), M.carpet, 0, .012, -.1, null, false);
    c.rotation.x = -Math.PI / 2; c.scale.set(1.75, 1.35, 1); c.receiveShadow = true;
  })();
  (function () {
    var g = new THREE.Group(); g.position.set(.1, 0, .55); root.add(g);
    cyl(.4, .4, .06, M.wood, 0, .36, 0, g, 40);
    for (var i = 0; i < 3; i++) { var a = i * Math.PI * 2 / 3 + .5; cyl(.075, .075, .36, M.wood, Math.cos(a) * .24, 0, Math.sin(a) * .24, g, 20); }
    box(.22, .025, .17, M.white, .14, .42, -.16, g).rotation.y = .2;
    box(.2, .02, .15, std(0x8f8578, .8), .14, .445, -.16, g).rotation.y = .35;
  })();
  (function () {
    var g = new THREE.Group(); g.position.set(.2, 0, -1.1); root.add(g);
    cyl(.42, .42, .025, M.black, 0, .6, 0, g, 40);
    cyl(.055, .07, .6, M.wood, 0, 0, 0, g, 20);
    cyl(.25, .25, .03, M.wood, 0, 0, 0, g, 32);
    cyl(.045, .04, .16, std(0x1b1b1c, .2, .3), -.12, .625, .0, g, 16);
    for (var i = 0; i < 6; i++) {
      var a = i * 1.05, tilt = .25 + R() * .3;
      var st = cyl(.004, .004, .34, M.stem, -.12 + Math.sin(a) * .04, .76, Math.cos(a) * .04, g, 5);
      st.rotation.z = Math.sin(a) * tilt; st.rotation.x = Math.cos(a) * tilt;
      mesh(new THREE.SphereGeometry(.028, 10, 8), M.bloom, -.12 + Math.sin(a) * .12, .97 + R() * .06, Math.cos(a) * .12, g, false);
    }
    box(.26, .02, .19, M.white, .14, .625, .08, g).rotation.y = .3;
    box(.24, .015, .18, std(0x77695a, .8), .14, .645, .08, g).rotation.y = .5;
  })();
  (function boucleChair(x, z, yaw) {
    var g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = yaw; root.add(g);
    cyl(.33, .33, .2, M.boucle, 0, .2, 0, g, 32);
    cyl(.3, .3, .1, M.boucle, 0, .4, .02, g, 32);
    mesh(new THREE.CylinderGeometry(.36, .36, .46, 36, 1, true, Math.PI * .45, Math.PI * 1.1), M.boucle, 0, .69, 0, g);
    [[.2, .2], [-.2, .2], [.2, -.2], [-.2, -.2]].forEach(function (p) { cyl(.022, .016, .22, M.wood, p[0], 0, p[1], g, 10); });
  })(1.0, -1.55, -.6);
  (function () {
    var g = new THREE.Group(); g.position.set(-1.85, 0, -3.3); g.rotation.y = .45; root.add(g);
    box(.56, .1, .5, M.taupe, 0, .42, 0, g);
    var bk = box(.56, .42, .07, M.taupe, 0, .5, -.25, g); bk.rotation.x = -.2;
    [-1, 1].forEach(function (s) {
      box(.045, .05, .5, M.wood, s * .3, .62, 0, g);
      box(.04, .22, .04, M.wood, s * .3, .42, .2, g);
      box(.04, .45, .04, M.wood, s * .3, 0, .2, g);
      box(.04, .7, .04, M.wood, s * .3, 0, -.24, g);
    });
    box(.6, .03, .04, M.wood, 0, .3, .2, g); box(.6, .03, .04, M.wood, 0, .3, -.24, g);
  })();
  cyl(.17, .17, .45, M.marble, -2.55, 0, -.15, null, 32);
  cyl(.17, .17, .45, M.marble, 2.3, 0, -.05, null, 32);
  (function () {
    var g = new THREE.Group(); g.name = 'Mannequin'; g.position.set(-1.45, 0, -2.0); root.add(g);
    var dk = std(0x4b4947, .7), body = std(0x6e6b66, .8);
    cyl(.2, .2, .02, dk, 0, 0, 0, g, 24);
    cyl(.012, .012, 1.0, dk, 0, 0, 0, g, 8);
    mesh(new THREE.CylinderGeometry(.16, .12, .55, 16), body, 0, 1.28, 0, g).scale.z = .55;
    mesh(new THREE.SphereGeometry(.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), body, 0, 1.55, 0, g).scale.set(1, .4, .55);
    cyl(.04, .04, .1, dk, 0, 1.58, 0, g, 10);
    mesh(new THREE.SphereGeometry(.085, 16, 12), dk, 0, 1.72, 0, g);
    [-1, 1].forEach(function (s) { mesh(new THREE.CylinderGeometry(.04, .032, .6, 8), body, s * .2, 1.22, 0, g).rotation.z = s * .08; });
  })();
  [[-HW + .1, H - .3, 1.6], [-HW + .1, H - .3, -1.2]].forEach(function (p) {
    mesh(new THREE.SphereGeometry(.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.white, p[0] + .02, p[1], p[2], null, false).rotation.z = -Math.PI / 2;
  });

  /* ---------- display slots ----------
     Where featured products hang, in the order they are filled.
     pos    = point on the rail the hanger hooks onto
     normal = direction pointing out of the rack into the room (where shoppers stand)
     along  = rail direction; a resting garment's front faces this way (sideways to the shopper) */
  var V = function (x, y, z) { return new THREE.Vector3(x, y, z); };
  var slots = [];
  [2.6, 1.8, 1.0, -.45, -1.25, -2.05, -2.85].forEach(function (z) {           // right wall rail
    slots.push({ pos: V(HW - .5, 1.85, z), normal: V(-1, 0, 0), along: V(0, 0, 1) });
  });
  [2.75, 1.95, 1.2].forEach(function (z) {                                      // left wall rail
    slots.push({ pos: V(-HW + .5, 1.85, z), normal: V(1, 0, 0), along: V(0, 0, 1) });
  });
  [-.2, -1.0].forEach(function (z) {                                            // free-standing rail
    slots.push({ pos: V(-1.95, 1.85, z), normal: V(1, 0, 0), along: V(0, 0, 1) });
  });
  [-1.25, -.35].forEach(function (x) {                                          // back niche rail
    slots.push({ pos: V(x, 1.75, -HD + .55), normal: V(0, 0, 1), along: V(1, 0, 0) });
  });

  return { root: root, ceilingGroup: ceilingGroup, facade: facade, lights: lights, setDoors: setDoors, slots: slots, materials: M, size: { W: W, D: D, H: H } };
}
