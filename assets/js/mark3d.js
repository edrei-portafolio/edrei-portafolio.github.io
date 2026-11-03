/* Edrei · Símbolo Z en 3D dibujado en líneas (barra lateral) */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const PIECES = [
  [[9, 0], [86, 0], [86, 22], [0, 22], [0, 9]],
  [[81.2, 27], [69.6, 39], [37.6, 39], [49.2, 27]],
  [[64.8, 44], [53.2, 56], [21.2, 56], [32.8, 44]],
  [[48.4, 61], [36.8, 73], [4.8, 73], [16.4, 61]],
  [[0, 78], [86, 78], [86, 91], [77, 100], [0, 100]],
];

export function createMark(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -500, 500);
  const pivot = new THREE.Group();
  const model = new THREE.Group();
  pivot.add(model);
  scene.add(pivot);

  // Relleno invisible que tapa las aristas ocultas; aristas nítidas + aristas ocultas tenues
  const fill = new THREE.MeshBasicMaterial({ color: 0x000000, colorWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  const edge = new THREE.LineBasicMaterial({ color: 0xecf1ee, transparent: true, opacity: 0.92 });
  const accent = new THREE.LineBasicMaterial({ color: 0x0ae98a, transparent: true, opacity: 1 });
  const hidden = new THREE.LineBasicMaterial({ color: 0xecf1ee, transparent: true, opacity: 0.13, depthTest: false });

  PIECES.forEach((pts, i) => {
    const shape = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x - 43, 50 - y)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 30, bevelEnabled: false });
    geo.translate(0, 0, -15);
    const mesh = new THREE.Mesh(geo, fill);
    const eg = new THREE.EdgesGeometry(geo, 20);
    const lines = new THREE.LineSegments(eg, i > 0 && i < 4 ? accent : edge);
    const back = new THREE.LineSegments(eg, hidden);
    back.renderOrder = -1;
    mesh.add(lines, back);
    model.add(mesh);
  });
  pivot.rotation.set(0.52, -0.72, 0);

  const state = { w: 1, h: 1, spin: 0, spinTarget: 0, t: 0, running: false, raf: 0 };

  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    state.w = w; state.h = h;
    renderer.setSize(w, h, false);
    const half = 78;
    const aspect = w / h;
    camera.left = -half * aspect; camera.right = half * aspect;
    camera.top = half; camera.bottom = -half;
    camera.updateProjectionMatrix();
  }

  const clock = new THREE.Clock();
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    state.t += dt;
    state.spin += (state.spinTarget - state.spin) * (1 - Math.exp(-dt * 4));
    model.rotation.y = state.spin + (reduced ? 0 : Math.sin(state.t * 0.45) * 0.12);
    model.position.y = reduced ? 0 : Math.sin(state.t * 0.8) * 2;
    renderer.render(scene, camera);
    if (state.running) state.raf = requestAnimationFrame(frame);
  }

  resize();
  return {
    resize,
    setProgress(p) { state.spinTarget = Math.sin(p * Math.PI * 3) * 0.55; },
    start() { if (!state.running) { state.running = true; clock.getDelta(); state.raf = requestAnimationFrame(frame); } },
    stop() { state.running = false; cancelAnimationFrame(state.raf); },
    renderOnce() { frame(); },
  };
}
