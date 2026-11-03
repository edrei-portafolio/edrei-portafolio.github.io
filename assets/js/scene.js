/* EJE Z · Escena 3D de portada
   Tren de engranajes planetario que cambia de estado:
   0 = Diseño (plano técnico) · 1 = Simulación (esfuerzos) · 2 = Fabricación (metal) */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

export { THREE };

/* ---------- Geometría de engranajes ---------- */
const inv = (a) => Math.tan(a) - a;

// Perfil de engranaje recto con flancos de evolvente (aprox. sin filete de raíz)
export function gearPoints({ teeth, module: m, pressureDeg = 20, addendum = 1, dedendum = 1.25, flankSteps = 6, phase = 0 }) {
  const z = teeth;
  const alpha = (pressureDeg * Math.PI) / 180;
  const rp = (m * z) / 2;
  const rb = rp * Math.cos(alpha);
  const ra = rp + addendum * m;
  const rf = rp - dedendum * m;
  const half = Math.PI / (2 * z) + inv(alpha); // semiespesor angular en la base
  const psi = (r) => {
    if (r <= rb) return half;
    return half - inv(Math.acos(rb / r));
  };
  const rStart = Math.max(rb, rf);
  const pts = [];
  const pitch = (2 * Math.PI) / z;
  for (let i = 0; i < z; i++) {
    const c = phase + i * pitch;
    // raíz -> flanco izquierdo
    const pRootL = psi(rStart);
    if (rStart - rf > 1e-6) pts.push([rf * Math.cos(c - pRootL), rf * Math.sin(c - pRootL)]);
    for (let k = 0; k <= flankSteps; k++) {
      const r = rStart + ((ra - rStart) * k) / flankSteps;
      const a = c - psi(r);
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    // punta
    const pt = psi(ra);
    for (let k = 1; k < 3; k++) {
      const a = c - pt + (2 * pt * k) / 3;
      pts.push([ra * Math.cos(a), ra * Math.sin(a)]);
    }
    for (let k = flankSteps; k >= 0; k--) {
      const r = rStart + ((ra - rStart) * k) / flankSteps;
      const a = c + psi(r);
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    if (rStart - rf > 1e-6) pts.push([rf * Math.cos(c + pRootL), rf * Math.sin(c + pRootL)]);
    // arco de raíz hasta el siguiente diente
    const a0 = c + pRootL, a1 = c + pitch - pRootL;
    for (let k = 1; k < 3; k++) {
      const a = a0 + ((a1 - a0) * k) / 3;
      pts.push([rf * Math.cos(a), rf * Math.sin(a)]);
    }
  }
  return { pts, rp, ra, rf, rb };
}

const toPath = (pts, PathCls = THREE.Shape) => {
  const s = new PathCls();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
};

const circlePath = (cx, cy, r, seg = 40, PathCls = THREE.Path, cw = true) => {
  const pts = [];
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2 * (cw ? -1 : 1);
    pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return toPath(pts, PathCls);
};

// Agujero con chavetero (eje)
const keyedBore = (r, kw, kd) => {
  const pts = [];
  const half = Math.asin(kw / 2 / r);
  const seg = 40;
  for (let i = 0; i <= seg; i++) {
    const a = half + (i / seg) * (Math.PI * 2 - 2 * half);
    pts.push([r * Math.cos(-a), r * Math.sin(-a)]);
  }
  pts.push([r + kd, -kw / 2]);
  pts.push([r + kd, kw / 2]);
  return toPath(pts.map(([x, y]) => [x, y]), THREE.Path);
};

function extrude(shape, depth, bevel = 0.018) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelOffset: -bevel,
    bevelSegments: 1,
    curveSegments: 24,
    steps: 1,
  });
  g.computeVertexNormals();
  return g;
}

// Aristas de contorno: solo bordes compartidos por 2 caras con ángulo > umbral
export function featureEdges(geometry, thresholdDeg = 28) {
  const pos = geometry.attributes.position;
  const idx = geometry.index;
  const n = idx ? idx.count : pos.count;
  const cosT = Math.cos((thresholdDeg * Math.PI) / 180);
  const map = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const key = (v) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(pos, idx ? idx.getX(i) : i);
    b.fromBufferAttribute(pos, idx ? idx.getX(i + 1) : i + 1);
    c.fromBufferAttribute(pos, idx ? idx.getX(i + 2) : i + 2);
    const nrm = ab.subVectors(b, a).clone().cross(ac.subVectors(c, a));
    const len = nrm.length();
    const e2 = Math.max(a.distanceToSquared(b), b.distanceToSquared(c), c.distanceToSquared(a));
    if (len < 1e-7 || len < e2 * 2e-4) continue; // triángulos degenerados o astillas
    nrm.divideScalar(len);
    const ka = key(a), kb = key(b), kc = key(c);
    if (ka === kb || kb === kc || ka === kc) continue;
    for (const [k1, k2, v1, v2] of [[ka, kb, a, b], [kb, kc, b, c], [kc, ka, c, a]]) {
      const k = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
      const e = map.get(k);
      if (e) e.n.push(nrm);
      else map.set(k, { p: [v1.x, v1.y, v1.z, v2.x, v2.y, v2.z], n: [nrm] });
    }
  }
  const out = [];
  for (const e of map.values()) if (e.n.length === 2 && e.n[0].dot(e.n[1]) <= cosT) out.push(...e.p);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return g;
}

/* ---------- Ensamble planetario ---------- */
export const PLANET = { zs: 24, zp: 12, zr: 48, m: 0.1, depth: 0.62 };

export function buildPlanetaryGeometries() {
  const { zs, zp, zr, m, depth } = PLANET;
  // Sol: diente centrado en 0 rad
  const sun = gearPoints({ teeth: zs, module: m, phase: 0 });
  const sunShape = toPath(sun.pts);
  sunShape.holes.push(keyedBore(0.2, 0.09, 0.05));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    sunShape.holes.push(circlePath(0.62 * Math.cos(a), 0.62 * Math.sin(a), 0.13, 28));
  }
  // Satélite: diente desfasado para engranar (ver cinemática)
  const pl = gearPoints({ teeth: zp, module: m, phase: 0 });
  const plShape = toPath(pl.pts);
  plShape.holes.push(circlePath(0, 0, 0.17, 36));
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    plShape.holes.push(circlePath(0.33 * Math.cos(a), 0.33 * Math.sin(a), 0.055, 20));
  }
  // Corona (dentado interior): el hueco es un perfil exterior con los dientes en los vanos
  const ringHole = gearPoints({ teeth: zr, module: m, addendum: 1.25, dedendum: 1.0, phase: Math.PI / zr });
  const ringOuterR = (m * zr) / 2 + 0.52;
  const ringShape = new THREE.Shape();
  {
    const seg = 160;
    ringShape.moveTo(ringOuterR, 0);
    for (let i = 1; i <= seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      ringShape.lineTo(ringOuterR * Math.cos(a), ringOuterR * Math.sin(a));
    }
    ringShape.closePath();
  }
  ringShape.holes.push(toPath(ringHole.pts.slice().reverse(), THREE.Path));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    const rr = (m * zr) / 2 + 0.31;
    ringShape.holes.push(circlePath(rr * Math.cos(a), rr * Math.sin(a), 0.07, 20));
  }
  // Porta-satélites (detrás)
  const a = sun.rp + pl.rp;
  const carrierShape = new THREE.Shape();
  {
    const pts = [];
    const seg = 180;
    for (let i = 0; i < seg; i++) {
      const t = (i / seg) * Math.PI * 2;
      // lóbulo suave de 3 brazos
      const r = 0.95 + 0.78 * Math.pow(Math.max(0, Math.cos(1.5 * t)), 2) * 1.0 + 0.32 * Math.pow(Math.max(0, Math.cos(1.5 * t)), 18);
      pts.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    carrierShape.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(([x, y]) => carrierShape.lineTo(x, y));
    carrierShape.closePath();
    carrierShape.holes.push(circlePath(0, 0, 0.32, 36));
  }
  return {
    sun: extrude(sunShape, depth),
    planet: extrude(plShape, depth),
    ring: extrude(ringShape, depth, 0.022),
    carrier: extrude(carrierShape, 0.14, 0.02),
    centerDistance: a,
    radii: { sun, planet: pl, ring: ringHole, ringOuterR },
  };
}

/* ---------- Materiales con 3 estados ---------- */
const SHARED = {
  uBlue: { value: 1 },
  uSim: { value: 0 },
  uLoad: { value: 0 },
  uTime: { value: 0 },
  uContacts: { value: Array.from({ length: 6 }, () => new THREE.Vector3(99, 99, 0)) },
  uBlueFill: { value: new THREE.Color(0x0b1628) },
  uCyan: { value: new THREE.Color(0x4cdcf7) },
  uRevealY: { value: 99 },
  uScan: { value: 0 },
};
// Plano de revelado (barrido tipo escáner durante la intro)
const REVEAL_PLANE = new THREE.Plane(new THREE.Vector3(0, -1, 0), 99);

const VERT_HEAD = /* glsl */ `
uniform mat4 uLocalToAsm;
varying vec3 vAsm;
varying vec3 vLocal;
`;
const FRAG_HEAD = /* glsl */ `
uniform float uBlue;
uniform float uSim;
uniform float uLoad;
uniform float uTime;
uniform vec3 uContacts[6];
uniform vec3 uBlueFill;
uniform vec3 uCyan;
uniform float uRevealY;
uniform float uScan;
uniform float uTeeth;
uniform float uRootR;
uniform float uBoreR;
uniform float uStressGain;
uniform float uMeshScale;
varying vec3 vAsm;
varying vec3 vLocal;

vec3 ezHeat(float t) {
  vec3 c0 = vec3(0.07, 0.20, 0.86);
  vec3 c1 = vec3(0.02, 0.70, 0.96);
  vec3 c2 = vec3(0.18, 0.84, 0.38);
  vec3 c3 = vec3(0.98, 0.88, 0.12);
  vec3 c4 = vec3(0.98, 0.27, 0.10);
  t = clamp(t, 0.0, 1.0);
  if (t < 0.25) return mix(c0, c1, t / 0.25);
  if (t < 0.5) return mix(c1, c2, (t - 0.25) / 0.25);
  if (t < 0.75) return mix(c2, c3, (t - 0.5) / 0.25);
  return mix(c3, c4, (t - 0.75) / 0.25);
}
float ezLine(float x, float spacing) {
  float f = x / spacing;
  float d = abs(fract(f - 0.5) - 0.5);
  float w = fwidth(f);
  // se desvanece cuando las líneas se apiñan (evita el moiré en ángulos rasantes)
  return (1.0 - smoothstep(0.0, w * 1.15, d)) * (1.0 - smoothstep(0.18, 0.45, w));
}
#ifndef EZ_CUSTOM_STRESS
float ezStress() {
  float s = 0.06;
  float near = 0.0;
  for (int i = 0; i < 6; i++) {
    vec2 d = vAsm.xy - uContacts[i].xy;
    float dd = dot(d, d);
    s += 0.92 * exp(-dd / 0.010) + 0.30 * exp(-dd / 0.055);
    near += exp(-dd / 0.11);
  }
  float r = length(vLocal.xy);
  float rootBand = exp(-pow((r - uRootR) / 0.045, 2.0));
  s += rootBand * 0.42 * clamp(near, 0.0, 1.0);
  s += 0.22 * (1.0 - smoothstep(uBoreR, uBoreR + 0.28, r));
  return clamp(s * uStressGain * uLoad, 0.0, 1.0);
}
#endif
`;

const FRAG_TAIL = /* glsl */ `
{
  vec3 ezN = normalize(normal);
  vec3 ezV = normalize(vViewPosition);
  float ezNdv = clamp(dot(ezN, ezV), 0.0, 1.0);
  float ezFres = pow(1.0 - ezNdv, 2.4);
  float ezLam = clamp(dot(ezN, normalize(vec3(0.35, 0.75, 0.55))), 0.0, 1.0);
  vec3 ezDesign = uBlueFill * (0.7 + 0.75 * ezLam) + uCyan * ezFres * 0.85;

  float ezS = ezStress();
  float ezBand = floor(ezS * 10.0 + 0.0001) / 10.0;
  vec3 ezSimCol = ezHeat(ezBand) * (0.58 + 0.42 * ezLam + 0.12 * ezFres);
  float ezR = length(vLocal.xy);
  float ezT = atan(vLocal.y, vLocal.x);
  float ezMesh = uMeshScale < 0.0
    ? max(max(ezLine(vLocal.x, -uMeshScale), ezLine(vLocal.y, -uMeshScale)), ezLine(vLocal.z, -uMeshScale))
    : max(max(ezLine(ezR, 0.055 * uMeshScale), ezLine(ezT, 6.2831853 / max(uTeeth * 4.0, 24.0))), ezLine(vLocal.z + 0.0625 * uMeshScale, 0.125 * uMeshScale));
  ezSimCol = mix(ezSimCol, ezSimCol * 0.38, ezMesh * 0.55);

  gl_FragColor.rgb = mix(gl_FragColor.rgb, ezSimCol, uSim);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, ezDesign, uBlue);
  float ezScan = (1.0 - smoothstep(0.0, 0.07, abs(vAsm.y - uRevealY))) * uScan;
  gl_FragColor.rgb += uCyan * ezScan * 1.4;
}
`;

// Cada malla necesita su propio material: los uniformes por pieza (uLocalToAsm) no se re-suben
// entre dibujos consecutivos que comparten material.
export function cloneStateMaterial(m) {
  return makeStateMaterial(m.userData.params);
}

export function makeStateMaterial({ color, metalness = 1, roughness = 0.3, teeth = 24, rootR = 1, boreR = 0.2, stressGain = 1, envMapIntensity = 1, stressGLSL = '', meshScale = 1, extra = {} }) {
  const mat = new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    envMapIntensity,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    clippingPlanes: [REVEAL_PLANE],
    ...extra,
  });
  const own = {
    uLocalToAsm: { value: new THREE.Matrix4() },
    uTeeth: { value: teeth },
    uRootR: { value: rootR },
    uBoreR: { value: boreR },
    uStressGain: { value: stressGain },
    uMeshScale: { value: meshScale },
  };
  mat.userData.uniforms = own;
  mat.userData.params = { color, metalness, roughness, teeth, rootR, boreR, stressGain, envMapIntensity, stressGLSL, meshScale, extra };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, SHARED, own);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n vLocal = transformed; vAsm = (uLocalToAsm * vec4(transformed, 1.0)).xyz;'
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + (stressGLSL ? '#define EZ_CUSTOM_STRESS\n' : '') + FRAG_HEAD + (stressGLSL ? '\nfloat ezStress() {\n' + stressGLSL + '\n}\n' : ''))
      .replace('#include <colorspace_fragment>', '#include <colorspace_fragment>\n' + FRAG_TAIL);
  };
  mat.customProgramCacheKey = () => 'ezStateMat' + stressGLSL.length + stressGLSL.slice(0, 40);
  return mat;
}

/* ---------- Entorno de estudio para el metal ---------- */
// Estudio neutro (adaptado de RoomEnvironment de three.js, licencia MIT)
export function studioEnvironment(renderer) {
  const env = new THREE.Scene();
  const geometry = new THREE.BoxGeometry();
  geometry.deleteAttribute('uv');
  const roomMaterial = new THREE.MeshStandardMaterial({ side: THREE.BackSide, color: 0x9aa3b2 });
  const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x8890a0 });
  const mainLight = new THREE.PointLight(0xffffff, 700, 28, 2);
  mainLight.position.set(0.418, 16.199, 0.3);
  env.add(mainLight);
  const room = new THREE.Mesh(geometry, roomMaterial);
  room.position.set(-0.757, 13.219, 0.717);
  room.scale.set(31.713, 28.305, 28.591);
  env.add(room);
  const boxes = [
    [[-10.906, 2.009, 1.846], -0.195, [2.328, 7.905, 4.651]],
    [[-5.607, -0.754, -0.758], 0.994, [1.97, 1.534, 3.955]],
    [[6.167, 0.857, 7.803], 0.561, [3.927, 6.285, 3.687]],
    [[-2.017, 0.018, 6.124], 0.333, [2.002, 4.566, 2.064]],
    [[2.291, -0.756, -2.621], -0.286, [1.546, 1.552, 1.496]],
    [[-2.193, -0.369, -5.547], 0.516, [3.875, 3.487, 2.986]],
  ];
  for (const [p, ry, sc] of boxes) {
    const b = new THREE.Mesh(geometry, boxMaterial);
    b.position.set(...p); b.rotation.set(0, ry, 0); b.scale.set(...sc);
    env.add(b);
  }
  const area = (intensity, p, sc, tint = 0xffffff) => {
    const m = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity) }));
    m.position.set(...p); m.scale.set(...sc);
    env.add(m);
  };
  area(50, [-16.116, 14.37, 8.208], [0.1, 2.428, 2.739]);
  area(50, [-16.109, 18.021, -8.207], [0.1, 2.425, 2.751]);
  area(17, [14.904, 12.198, -1.832], [0.15, 4.265, 6.331], 0xffd2b4);
  area(43, [-0.462, 8.89, 14.52], [4.38, 5.441, 0.088], 0xd6ecff);
  area(20, [3.235, 11.486, -12.541], [2.5, 2.0, 0.1]);
  area(100, [0.0, 20.0, 0.0], [1.0, 0.1, 1.0]);
  const pm = new THREE.PMREMGenerator(renderer);
  const rt = pm.fromScene(env, 0.04);
  pm.dispose();
  return rt.texture;
}

/* ---------- Partículas (intro) ---------- */
function samplePoints(geoms, count) {
  // geoms: [{ geometry, matrix }]
  const tris = [];
  let total = 0;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (const { geometry, matrix } of geoms) {
    const pos = geometry.attributes.position;
    const idx = geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i += 3) {
      const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
      a.fromBufferAttribute(pos, i0).applyMatrix4(matrix);
      b.fromBufferAttribute(pos, i1).applyMatrix4(matrix);
      c.fromBufferAttribute(pos, i2).applyMatrix4(matrix);
      const area = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a)).length() * 0.5;
      if (area <= 0) continue;
      total += area;
      tris.push({ a: a.clone(), b: b.clone(), c: c.clone(), cum: total });
    }
  }
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.random() * total;
    let lo = 0, hi = tris.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (tris[mid].cum < r) lo = mid + 1; else hi = mid;
    }
    const t = tris[lo];
    let u = Math.random(), v = Math.random();
    if (u + v > 1) { u = 1 - u; v = 1 - v; }
    const p = t.a.clone().addScaledVector(new THREE.Vector3().subVectors(t.b, t.a), u).addScaledVector(new THREE.Vector3().subVectors(t.c, t.a), v);
    out.set([p.x, p.y, p.z], i * 3);
  }
  return out;
}

function makeParticles(targets, pixelRatio) {
  const count = targets.length / 3;
  const g = new THREE.BufferGeometry();
  const starts = new Float32Array(count * 3);
  const delays = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const dir = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
    const r = 3.5 + Math.random() * 5.5;
    starts.set([dir.x * r, dir.y * r, dir.z * r + 2.0], i * 3);
    const tx = targets[i * 3], ty = targets[i * 3 + 1];
    delays[i] = Math.min(0.55, (Math.sqrt(tx * tx + ty * ty) / 3.0) * 0.35 + Math.random() * 0.2);
  }
  g.setAttribute('position', new THREE.BufferAttribute(targets, 3));
  g.setAttribute('aStart', new THREE.BufferAttribute(starts, 3));
  g.setAttribute('aDelay', new THREE.BufferAttribute(delays, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uProgress: { value: 0 },
      uAlpha: { value: 1 },
      uSize: { value: 2.4 * pixelRatio },
      uColor: { value: new THREE.Color(0x7ff0c4) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aStart; attribute float aDelay;
      uniform float uProgress; uniform float uSize;
      varying float vK;
      void main() {
        float k = clamp((uProgress - aDelay) / 0.45, 0.0, 1.0);
        k = 1.0 - pow(1.0 - k, 3.0);
        vK = k;
        vec3 p = mix(aStart, position, k);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = uSize * (12.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor; uniform float uAlpha; varying float vK;
      void main() {
        vec2 d = gl_PointCoord - 0.5;
        float a = smoothstep(0.5, 0.1, length(d));
        gl_FragColor = vec4(uColor, a * uAlpha * (0.35 + 0.65 * vK));
      }`,
  });
  return new THREE.Points(g, mat);
}

/* ---------- Escena principal ---------- */
export function createGearScene(canvas, opts = {}) {
  const {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75),
    alpha = true,
    preserveDrawingBuffer = false,
    particles = true,
  } = opts;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha, preserveDrawingBuffer, powerPreference: 'high-performance' });
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.setClearColor(0x000000, 0);
  renderer.localClippingEnabled = true;

  const scene = new THREE.Scene();
  scene.environment = studioEnvironment(renderer);
  scene.environmentIntensity = 1;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 0, 14.5);

  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 7, 9);
  if (opts.shadows !== false) {
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -4; key.shadow.camera.right = 4;
    key.shadow.camera.top = 4; key.shadow.camera.bottom = -4;
    key.shadow.camera.near = 1; key.shadow.camera.far = 30;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.02;
  }
  scene.add(key);
  scene.add(new THREE.AmbientLight(0x8899bb, 0.25));

  // Pivotes: tilt (pose) > spin (interacción) > asm (ensamble)
  const pose = new THREE.Group();
  const spin = new THREE.Group();
  const asm = new THREE.Group();
  scene.add(pose);
  pose.add(spin);
  spin.add(asm);
  pose.rotation.set(-0.9, -0.42, -0.18, 'YXZ');
  spin.rotation.set(0, 0, 0);

  const G = buildPlanetaryGeometries();
  const { zs, zp, zr, depth } = PLANET;
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x4cdcf7, transparent: true, opacity: 1, depthWrite: false, clippingPlanes: [REVEAL_PLANE] });

  const parts = [];
  const addPart = (geometry, material, z = 0, edges = true) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.z = z;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (edges) {
      const e = new THREE.LineSegments(featureEdges(geometry, 28), edgeMat);
      mesh.add(e);
    }
    asm.add(mesh);
    parts.push(mesh);
    return mesh;
  };

  const sunMat = makeStateMaterial({ color: 0x14d98c, metalness: 0.55, roughness: 0.3, teeth: zs, rootR: G.radii.sun.rf, boreR: 0.22 });
  const planetMat = makeStateMaterial({ color: 0xdde2e8, metalness: 1, roughness: 0.15, teeth: zp, rootR: G.radii.planet.rf, boreR: 0.17 });
  const ringMat = makeStateMaterial({ color: 0x5f6772, metalness: 1, roughness: 0.42, teeth: zr, rootR: G.radii.ring.ra, boreR: 0.0, stressGain: 0.95 });
  const carrierMat = makeStateMaterial({ color: 0x5b636e, metalness: 1, roughness: 0.48, teeth: 3, rootR: 9, boreR: 0.32, stressGain: 0.6 });
  const pinMat = makeStateMaterial({ color: 0xe3e7ec, metalness: 1, roughness: 0.14, teeth: 1, rootR: 9, boreR: 0, stressGain: 0.5 });

  const sun = addPart(G.sun, sunMat, 0);
  const ring = addPart(G.ring, ringMat, 0);
  const planets = [0, 1, 2].map((k) => addPart(G.planet, k ? cloneStateMaterial(planetMat) : planetMat, 0));
  const carrier = addPart(G.carrier, carrierMat, -0.3);
  const shaftGeo = new THREE.CylinderGeometry(0.2, 0.2, 1.8, 40, 1);
  shaftGeo.rotateX(Math.PI / 2);
  const shaft = addPart(shaftGeo, pinMat, 0.16);
  const pinGeo = new THREE.CylinderGeometry(0.165, 0.165, 1.08, 32, 1);
  pinGeo.rotateX(Math.PI / 2);
  const pins = [0, 1, 2].map(() => addPart(pinGeo, cloneStateMaterial(pinMat), 0.24));

  // Centrar el ensamble en profundidad
  asm.position.z = -0.16;

  // Cinemática (corona fija): sol = 3·φc, satélites = −3·φc (para zs=24, zp=12, zr=48)
  const kSun = 1 + zr / zs;
  const kPl = 1 - zr / zp;
  const plPhase = Math.PI / zp; // vano frente al sol en t = 0
  let carrierAngle = 0;
  const contacts = SHARED.uContacts.value;
  const a = G.centerDistance;
  const rpS = G.radii.sun.rp, rpR = (PLANET.m * zr) / 2;

  function updateKinematics() {
    sun.rotation.z = kSun * carrierAngle;
    carrier.rotation.z = carrierAngle;
    for (let k = 0; k < 3; k++) {
      const phi = carrierAngle + (k * 2 * Math.PI) / 3;
      planets[k].position.set(a * Math.cos(phi), a * Math.sin(phi), 0);
      // Con φk múltiplo de 120° la fase de engrane es la misma en los tres satélites
      planets[k].rotation.z = plPhase + kPl * carrierAngle;
      pins[k].position.set(a * Math.cos(phi), a * Math.sin(phi), 0.24);
      contacts[k].set(rpS * Math.cos(phi), rpS * Math.sin(phi), 0);
      contacts[k + 3].set(rpR * Math.cos(phi), rpR * Math.sin(phi), 0);
    }
    for (const p of parts) {
      p.updateMatrix();
      p.material.userData.uniforms && p.material.userData.uniforms.uLocalToAsm.value.copy(p.matrix);
    }
  }
  // Partículas
  let points = null;
  if (particles) {
    asm.updateMatrixWorld(true);
    updateKinematics();
    asm.updateMatrixWorld(true);
    const list = [sun, ring, ...planets].map((m) => ({ geometry: m.geometry, matrix: m.matrix.clone() }));
    const targets = samplePoints(list, window.innerWidth < 700 ? 3600 : 6500);
    points = makeParticles(targets, pixelRatio);
    asm.add(points);
  }

  /* ----- Estado ----- */
  const state = {
    mode: 0,
    modeTarget: 0,
    load: 0,
    intro: particles ? 0 : 1,
    introPlaying: false,
    autoSpin: true,
    speed: 0.075,
    pointer: new THREE.Vector2(),
    pointerSmooth: new THREE.Vector2(),
    offsetX: 0,
    offsetY: 0,
    offsetXTarget: 0,
    offsetYTarget: 0,
    scale: 1,
    scaleTarget: 1,
    scrollRot: 0,
    scrollRotTarget: 0,
    w: 1,
    h: 1,
  };

  const localReveal = new THREE.Plane();
  function applyModeWeights() {
    const m = state.mode;
    const wD = THREE.MathUtils.clamp(1 - m, 0, 1);
    const wF = THREE.MathUtils.clamp(m - 1, 0, 1);
    const wS = 1 - wD - wF;
    SHARED.uBlue.value = wD;
    SHARED.uSim.value = wS;
    edgeMat.opacity = wD * 0.95 + wS * 0.12;
    edgeMat.visible = edgeMat.opacity > 0.01;
    // Barrido de revelado en el eje Y del ensamble
    const rv = THREE.MathUtils.smoothstep(state.intro, 0.5, 0.97);
    const y = THREE.MathUtils.lerp(-3.3, 3.3, rv);
    SHARED.uRevealY.value = y;
    SHARED.uScan.value = rv > 0 && rv < 1 ? 1 : 0;
    localReveal.set(new THREE.Vector3(0, -1, 0), rv >= 1 ? 99 : y);
    asm.updateMatrixWorld();
    REVEAL_PLANE.copy(localReveal).applyMatrix4(asm.matrixWorld);
  }

  function resize(w, h) {
    state.w = w; state.h = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Encadre: el ensamble mide ~6 u de diámetro
    const fit = w / h < 0.9 ? 18.5 : 14.2;
    camera.position.z = fit;
    camera.updateProjectionMatrix();
  }

  function setViewOffset() {
    const { w, h } = state;
    camera.setViewOffset(w, h, -state.offsetX * w, -state.offsetY * h, w, h);
  }

  const clock = new THREE.Clock();
  let raf = 0;
  let running = false;
  const listeners = new Set();
  let lastModeIdx = -1;

  function tick() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    SHARED.uTime.value = t;

    // Intro
    if (state.introPlaying) {
      state.intro = Math.min(1, state.intro + dt / 2.6);
      if (state.intro >= 1) state.introPlaying = false;
    }
    if (points) {
      points.material.uniforms.uProgress.value = Math.min(1, state.intro / 0.82);
      points.material.uniforms.uAlpha.value = 1 - THREE.MathUtils.smoothstep(state.intro, 0.8, 1.0);
      points.visible = points.material.uniforms.uAlpha.value > 0.01;
    }

    // Modo con amortiguación
    const k = 1 - Math.exp(-dt * 3.2);
    state.mode += (state.modeTarget - state.mode) * k;
    if (Math.abs(state.modeTarget - state.mode) < 0.002) state.mode = state.modeTarget;
    const simW = 1 - Math.abs(state.mode - 1);
    state.load += ((simW > 0.5 ? 1 : 0) - state.load) * (1 - Math.exp(-dt * 1.6));
    SHARED.uLoad.value = 0.15 + 0.85 * state.load;
    applyModeWeights();

    const idx = Math.round(state.mode);
    if (idx !== lastModeIdx) {
      lastModeIdx = idx;
      listeners.forEach((fn) => fn(idx));
    }

    // Giro del tren planetario
    if (state.autoSpin && state.intro >= 1) carrierAngle += dt * state.speed;
    updateKinematics();

    // Pose + interacción
    state.pointerSmooth.lerp(state.pointer, 1 - Math.exp(-dt * 3));
    state.scrollRot += (state.scrollRotTarget - state.scrollRot) * (1 - Math.exp(-dt * 4));
    spin.rotation.x = state.pointerSmooth.y * 0.12;
    spin.rotation.y = state.pointerSmooth.x * 0.18;
    spin.rotation.z = state.scrollRot + (state.autoSpin ? Math.sin(t * 0.25) * 0.04 : 0);

    const ko = 1 - Math.exp(-dt * 3.5);
    state.offsetX += (state.offsetXTarget - state.offsetX) * ko;
    state.offsetY += (state.offsetYTarget - state.offsetY) * ko;
    state.scale += (state.scaleTarget - state.scale) * ko;
    pose.scale.setScalar(state.scale);
    setViewOffset();

    renderer.render(scene, camera);
    if (running) raf = requestAnimationFrame(tick);
  }

  return {
    renderer,
    scene,
    camera,
    pose,
    state,
    resize,
    start() { if (!running) { running = true; clock.getDelta(); raf = requestAnimationFrame(tick); } },
    stop() { running = false; cancelAnimationFrame(raf); },
    get running() { return running; },
    playIntro() { state.intro = 0; state.introPlaying = true; },
    skipIntro() { state.intro = 1; state.introPlaying = false; },
    setMode(m, immediate = false) { state.modeTarget = m; if (immediate) { state.mode = m; state.load = Math.abs(m - 1) < 0.5 ? 1 : 0; } },
    setLayout({ x = 0, y = 0, scale = 1 } = {}, immediate = false) {
      state.offsetXTarget = x; state.offsetYTarget = y; state.scaleTarget = scale;
      if (immediate) { state.offsetX = x; state.offsetY = y; state.scale = scale; }
    },
    setPointer(x, y) { state.pointer.set(x, y); },
    setScrollRotation(r) { state.scrollRotTarget = r; },
    setCarrierAngle(r) { carrierAngle = r; },
    setAutoSpin(v) { state.autoSpin = v; },
    onMode(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    renderFrame(dt = 1 / 60) {
      // Render determinista (para capturas)
      clock.elapsedTime += dt;
      const was = running; running = false; tick(); running = was;
    },
    dispose() { this.stop(); renderer.dispose(); },
  };
}

// Acceso a los uniformes de estado (usado por la herramienta de renders)
export const STATE_UNIFORMS = SHARED;
export { REVEAL_PLANE };
