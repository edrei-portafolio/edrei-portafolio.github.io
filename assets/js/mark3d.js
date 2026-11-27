/* Edrei · símbolo Z en 3D (barra lateral, solo escritorio, PKG-A)
   Render bajo demanda: invalidate() agenda un cuadro y el bucle solo sigue
   mientras hay una interpolación activa. En reposo no corre ningún rAF.
   Estados: 'wire' (alámbrico), 'thermal' (térmico), 'solid' (sólido). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const PIECES = [
  [[9, 0], [86, 0], [86, 22], [0, 22], [0, 9]],
  [[81.2, 27], [69.6, 39], [37.6, 39], [49.2, 27]],
  [[64.8, 44], [53.2, 56], [21.2, 56], [32.8, 44]],
  [[48.4, 61], [36.8, 73], [4.8, 73], [16.4, 61]],
  [[0, 78], [86, 78], [86, 91], [77, 100], [0, 100]],
];
const ISO = { x: 0.52, y: -0.72 };
const RAMP = [[0, '#1d3a5a'], [0.3, '#2b6f92'], [0.6, '#4cdcf7'], [0.82, '#dff7f9'], [1, '#ff7a3d']].map(([t, c]) => [t, new THREE.Color(c)]);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const lin = (t) => t;

function rampColor(t, out) {
  for (let i = 1; i < RAMP.length; i++) {
    if (t <= RAMP[i][0]) {
      const [t0, c0] = RAMP[i - 1], [t1, c1] = RAMP[i];
      return out.copy(c0).lerp(c1, (t - t0) / (t1 - t0 || 1));
    }
  }
  return out.copy(RAMP[RAMP.length - 1][1]);
}
function paint(geo) {
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.pow(Math.min(1, Math.max(0, 1 - Math.abs(pos.getY(i)) / 50)), 1.2);
    rampColor(t, c).toArray(col, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return geo;
}

export function createMark(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  const pivot = new THREE.Group();
  scene.add(pivot);
  scene.add(new THREE.HemisphereLight(0xecf1ee, 0x0d0f12, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 1.1);
  sun.position.set(60, 90, 120);
  scene.add(sun);

  const WHITE = new THREE.Color(0xecf1ee), GREEN = new THREE.Color(0x0ae98a);
  const mask = new THREE.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const faceTh = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const faceSo = new THREE.MeshStandardMaterial({ color: 0x1d232d, metalness: 0.35, roughness: 0.55, transparent: true, opacity: 0, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const edge = new THREE.LineBasicMaterial({ color: WHITE.clone(), transparent: true, opacity: 0.92 });
  const accent = new THREE.LineBasicMaterial({ color: GREEN.clone(), transparent: true, opacity: 1 });
  const edgeTh = new THREE.LineBasicMaterial({ vertexColors: true, color: 0xffffff, transparent: true, opacity: 0 });
  const hidden = new THREE.LineBasicMaterial({ color: 0xecf1ee, transparent: true, opacity: 0.13, depthTest: false });

  const meshes = [];
  const layers = { faceTh: [], faceSo: [], edge: [], edgeTh: [], hidden: [] };
  PIECES.forEach((pts, i) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - 43, 50 - y)));
    const geo = paint(new THREE.ExtrudeGeometry(shape, { depth: 30, bevelEnabled: false }).translate(0, 0, -15));
    geo.computeVertexNormals();
    const eg = paint(new THREE.EdgesGeometry(geo, 20));
    const g = new THREE.Group();
    const m = new THREE.Mesh(geo, mask);
    const ft = new THREE.Mesh(geo, faceTh); ft.renderOrder = 1;
    const fs = new THREE.Mesh(geo, faceSo); fs.renderOrder = 1;
    const e = new THREE.LineSegments(eg, i > 0 && i < 4 ? accent : edge); e.renderOrder = 2;
    const et = new THREE.LineSegments(eg, edgeTh); et.renderOrder = 2;
    const h = new THREE.LineSegments(eg, hidden); h.renderOrder = -1;
    g.add(m, ft, fs, e, et, h);
    layers.faceTh.push(ft); layers.faceSo.push(fs); layers.edge.push(e); layers.edgeTh.push(et); layers.hidden.push(h);
    pivot.add(g);
    meshes.push(g);
  });

  // w: pesos de estado (0..1), intro: 0 = plano, 1 = extruido; flash: pulso verde
  const s = { w: { wire: 1, thermal: 0, solid: 0 }, intro: 1, flash: 0, state: 'wire' };
  pivot.rotation.set(ISO.x, ISO.y, 0);

  function sync() {
    const { wire, thermal, solid } = s.w;
    edge.opacity = 0.92 * wire + 0.55 * solid;
    accent.opacity = wire + solid;
    edgeTh.opacity = thermal;
    faceTh.opacity = 0.35 * thermal;
    faceSo.opacity = solid;
    hidden.opacity = 0.13 * (wire + thermal) * s.intro;
    edge.color.copy(WHITE).lerp(GREEN, s.flash);
    edgeTh.color.setRGB(1, 1, 1).lerp(GREEN, s.flash);
    const vis = (list, on) => list.forEach((o) => { o.visible = on; });
    vis(layers.edge, edge.opacity > 0.002 || accent.opacity > 0.002);
    vis(layers.edgeTh, thermal > 0.002);
    vis(layers.faceTh, thermal > 0.002);
    vis(layers.faceSo, solid > 0.002);
    vis(layers.hidden, hidden.opacity > 0.002);
  }

  /* ---------- render bajo demanda ---------- */
  const tweens = new Set();
  let raf = 0;
  const frame = (now) => {
    raf = 0;
    if (document.hidden) return;
    tweens.forEach((tw) => {
      if (tw.t0 == null) tw.t0 = now + tw.delay;
      const k = Math.min(1, Math.max(0, (now - tw.t0) / tw.dur));
      tw.set(tw.from + (tw.to - tw.from) * tw.ease(k));
      if (k >= 1) { tweens.delete(tw); tw.done && tw.done(); }
    });
    sync();
    renderer.render(scene, camera);
    if (tweens.size) raf = requestAnimationFrame(frame);
  };
  const invalidate = () => { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); };
  const tween = (from, to, dur, ease, set, delay = 0) => new Promise((done) => {
    if (reduced || dur <= 0) { set(to); invalidate(); done(); return; }
    tweens.add({ from, to, dur, ease, set, delay, done, t0: null });
    invalidate();
  });
  const onVis = () => { if (!document.hidden) invalidate(); };
  document.addEventListener('visibilitychange', onVis);

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    const half = 78, aspect = w / h;
    camera.left = -half * aspect; camera.right = half * aspect; camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
    invalidate();
  }

  let stateTok = 0;
  function setState(name, { instant = false } = {}) {
    if (!(name in s.w) || name === s.state) return;
    s.state = name;
    const tok = ++stateTok;
    const start = { ...s.w };
    tweens.forEach((tw) => { if (tw.kind === 'state') tweens.delete(tw); });
    if (instant || reduced) { Object.keys(s.w).forEach((k) => { s.w[k] = k === name ? 1 : 0; }); invalidate(); return; }
    const tw = { from: 0, to: 1, dur: 600, ease: easeInOut, delay: 0, t0: null, kind: 'state',
      set: (k) => { if (tok !== stateTok) return; Object.keys(s.w).forEach((key) => { s.w[key] = start[key] + ((key === name ? 1 : 0) - start[key]) * k; }); } };
    tweens.add(tw);
    invalidate();
  }

  let scaleNow = 1;
  function setScale(v) {
    tweens.forEach((tw) => { if (tw.kind === 'scale') tweens.delete(tw); });
    if (reduced) { scaleNow = v; pivot.scale.setScalar(v); invalidate(); return; }
    const from = scaleNow;
    tweens.add({ from, to: v, dur: 700, ease: easeInOut, delay: 0, t0: null, kind: 'scale', set: (x) => { scaleNow = x; pivot.scale.setScalar(x); } });
    invalidate();
  }

  // Plano 2D → extrusión: pose frontal, profundidad casi nula, sin aristas ocultas
  function intro() {
    if (reduced) { invalidate(); return Promise.resolve(); }
    pivot.rotation.set(0, 0, 0);
    meshes.forEach((m) => { m.scale.z = 0.001; });
    s.intro = 0;
    sync();
    renderer.render(scene, camera);
    const rot = tween(0, 1, 1200, easeInOut, (k) => { pivot.rotation.x = ISO.x * k; pivot.rotation.y = ISO.y * k; });
    const ext = meshes.map((m, i) => tween(0.001, 1, 900, easeExpo, (z) => { m.scale.z = z; }, i * 60));
    const hid = tween(0, 1, 500, lin, (v) => { s.intro = v; }, 700);
    return Promise.all([rot, hid, ...ext]);
  }

  function pulse() {
    if (reduced) return;
    tween(0, 1, 300, lin, (k) => { s.flash = Math.sin(k * Math.PI); });
  }

  resize();
  sync();
  return {
    resize,
    setState,
    setScale,
    intro,
    pulse,
    renderOnce() { sync(); renderer.render(scene, camera); },
    get state() { return s.state; },
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      tweens.clear();
      document.removeEventListener('visibilitychange', onVis);
      renderer.dispose();
    },
  };
}
