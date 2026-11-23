// ═══════════════════════════════════════════════════════════════════════
// HERO: запуск ракеты с космодрома → полёт сквозь атмосферу → открытый
// космос → астронавт выпускает еду из тюбика → еда складывается в
// желейное 3D-слово «Space Reacher».
// Стиль: между low-poly и casual. Свет — от Солнца (слева сверху),
// теневая сторона уходит в космическую темноту.
// ═══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ─── Утилиты ──────────────────────────────────────────────────────────
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
const easeOutBack = (t, s = 1.7) => { t = clamp(t) - 1; return t * t * ((s + 1) * t + s) + 1; };
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp(t), 3);
const easeInOutSine = (t) => -(Math.cos(Math.PI * clamp(t)) - 1) / 2;
const easeOutElastic = (t) => {
  t = clamp(t);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
};
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Сценарий (секунды) ───────────────────────────────────────────────
const T = {
  IGNITE: 0.7,       // зажигание, начинает валить дым
  LIFT: 3.3,         // отрыв от стола
  CUTOFF: 8.9,       // отсечка двигателя
  STOP: 10.0,        // ракета остановилась
  HATCH: 10.05,      // открывается иллюминатор
  OUT0: 10.45,       // астронавт вылетает
  OUT1: 12.0,        // астронавт на месте
  CAP: 12.25,        // откручивает крышку тюбика
  CAP_OFF: 12.6,
  SQUEEZE: 12.85,    // еда вылетает
  BLOB_GAP: 0.046,
  DONE: 17.9,
};
const SY = 220;          // высота «космической сцены»
const CAM_Z = 16;
const FOV = 35;
const CAM_START_Y = 3.0;
const SUN_DIR = new THREE.Vector3(-0.62, 0.5, 0.6).normalize();
const Z_AXIS = new THREE.Vector3(0, 0, 1);

// Цвета еды/букв: оранжевый → розовый → фиолетовый → голубой
const PASTE = ['#ff9f43', '#ff7a52', '#ff5e7e', '#f251a8', '#d65cd8', '#b26bff', '#8f7bff', '#6f8dff', '#58a8ff', '#48c6ff', '#45d6e6', '#5fe0c9'];

// ─── Небо по высоте ──────────────────────────────────────────────────
const SKY = [
  { a: 0.00, top: '#4a93ff', bot: '#cde6ff', hs: '#cfe3ff', hg: '#6d7a52', hi: 1.15, glow: 0.65, gsize: 0.42, stars: 0, sun: 3.1 },
  { a: 0.22, top: '#2a63d8', bot: '#8cc0ff', hs: '#a9c8ff', hg: '#4a5a6a', hi: 1.0, glow: 0.55, gsize: 0.34, stars: 0, sun: 3.2 },
  { a: 0.46, top: '#0f2766', bot: '#3a72cf', hs: '#7b95d6', hg: '#243150', hi: 0.75, glow: 0.42, gsize: 0.24, stars: 0.05, sun: 3.3 },
  { a: 0.70, top: '#040820', bot: '#14306b', hs: '#4a5b9a', hg: '#121a33', hi: 0.5, glow: 0.38, gsize: 0.16, stars: 0.55, sun: 3.4 },
  { a: 1.00, top: '#010208', bot: '#050a1c', hs: '#36447e', hg: '#05060d', hi: 0.32, glow: 0.42, gsize: 0.11, stars: 1, sun: 3.6 },
].map((k) => ({
  ...k, top: new THREE.Color(k.top), bot: new THREE.Color(k.bot), hs: new THREE.Color(k.hs), hg: new THREE.Color(k.hg),
}));
const _sky = { top: new THREE.Color(), bot: new THREE.Color(), hs: new THREE.Color(), hg: new THREE.Color() };
function sampleSky(alt) {
  let i = 0;
  while (i < SKY.length - 2 && alt > SKY[i + 1].a) i++;
  const A = SKY[i], B = SKY[i + 1];
  const t = clamp((alt - A.a) / (B.a - A.a));
  _sky.top.copy(A.top).lerp(B.top, t);
  _sky.bot.copy(A.bot).lerp(B.bot, t);
  _sky.hs.copy(A.hs).lerp(B.hs, t);
  _sky.hg.copy(A.hg).lerp(B.hg, t);
  _sky.hi = lerp(A.hi, B.hi, t);
  _sky.glow = lerp(A.glow, B.glow, t);
  _sky.gsize = lerp(A.gsize, B.gsize, t);
  _sky.stars = lerp(A.stars, B.stars, t);
  _sky.sun = lerp(A.sun, B.sun, t);
  return _sky;
}

// ─── Материалы ────────────────────────────────────────────────────────
const lowpoly = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.62, metalness: 0.04, ...o });

function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, inner);
  grd.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.45)'));
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Желейный материал: вершины колышутся и сплющиваются пружиной
function jellyMaterial(color, phase) {
  const c = new THREE.Color(color);
  const mat = new THREE.MeshPhysicalMaterial({
    color: c,
    roughness: 0.3,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.22,
    sheen: 0.6,
    sheenRoughness: 0.5,
    sheenColor: c.clone().lerp(new THREE.Color('#ffffff'), 0.55),
    emissive: c.clone().multiplyScalar(0.06),
  });
  const u = {
    uTime: { value: 0 },
    uSquash: { value: 0 },
    uPhase: { value: phase },
    uHeight: { value: 0.72 },
    uWob: { value: 1 },
  };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = 'uniform float uTime;\nuniform float uSquash;\nuniform float uPhase;\nuniform float uHeight;\nuniform float uWob;\n'
      + shader.vertexShader.replace('#include <begin_vertex>', `
        vec3 transformed = vec3(position);
        float hN = clamp(transformed.y / uHeight, 0.0, 1.25);
        transformed.y *= (1.0 + uSquash);
        transformed.xz *= (1.0 - uSquash * 0.5 * (0.35 + hN));
        transformed.x += sin(uTime * 2.4 + uPhase + transformed.y * 1.7) * 0.05 * uWob * hN;
        transformed.z += cos(uTime * 1.9 + uPhase * 1.3 + transformed.x * 2.2) * 0.035 * uWob * hN;
        transformed.y += sin(uTime * 3.1 + uPhase * 0.7 + transformed.x * 3.0) * 0.018 * uWob * hN;
      `);
  };
  mat.userData.u = u;
  return mat;
}

// Еда в невесомости: бесформенные пульсирующие капли
function blobMaterial(color) {
  const c = new THREE.Color(color);
  const mat = new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.2,
    sheen: 0.6, sheenColor: c.clone().lerp(new THREE.Color('#fff'), 0.5),
    emissive: c.clone().multiplyScalar(0.08),
  });
  const u = { uTime: { value: 0 } };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace('#include <begin_vertex>', `
      vec3 transformed = vec3(position);
      float ph = modelMatrix[3].x * 1.7 + modelMatrix[3].y * 1.3;
      float n = sin(position.x * 2.1 + uTime * 4.2 + ph) * 0.55 + sin(position.y * 2.4 + uTime * 3.6 + ph * 1.7) * 0.45 + sin(position.z * 2.7 + uTime * 3.1 + ph * 0.6) * 0.35;
      transformed += normal * n * 0.2;
    `);
  };
  mat.userData.u = u;
  return mat;
}

// ═══════════════════ ПОСТРОЕНИЕ ОБЪЕКТОВ ═══════════════════════════════
function buildRocket() {
  const root = new THREE.Group();
  const shake = new THREE.Group();
  const body = new THREE.Group();
  root.add(shake);
  shake.add(body);

  const white = lowpoly(0xf4f1ea, { roughness: 0.48 });
  const red = lowpoly(0xff5a4e, { roughness: 0.5 });
  const dark = lowpoly(0x3b4050, { roughness: 0.35, metalness: 0.55 });
  const metal = lowpoly(0xa9b6c8, { roughness: 0.28, metalness: 0.75 });

  const lathe = (pts, mat, seg = 12) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg), mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };
  body.add(lathe([[0, 0.42], [0.4, 0.42], [0.55, 0.6], [0.66, 0.95], [0.72, 1.4], [0.72, 1.95], [0.66, 2.45], [0.55, 2.8]], white));
  body.add(lathe([[0.55, 2.8], [0.45, 3.1], [0.3, 3.4], [0.12, 3.63], [0.0, 3.72]], red));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.712, 0.68, 0.2, 12, 1, true), red);
  band.position.y = 1.07;
  band.castShadow = true;
  body.add(band);
  const tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), metal);
  tip.position.y = 3.74;
  body.add(tip);

  // сопло
  const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.44, 0.36, 10, 1, true), dark);
  nozzle.position.y = 0.25;
  nozzle.castShadow = true;
  body.add(nozzle);
  const nozzleIn = new THREE.Mesh(new THREE.CircleGeometry(0.3, 10), new THREE.MeshBasicMaterial({ color: 0x14161c }));
  nozzleIn.rotation.x = Math.PI / 2;
  nozzleIn.position.y = 0.4;
  body.add(nozzleIn);

  // стабилизаторы
  const fs = new THREE.Shape();
  fs.moveTo(0, 1.25);
  fs.quadraticCurveTo(0.5, 0.95, 0.78, 0.25);
  fs.lineTo(0.8, -0.02);
  fs.lineTo(0.55, 0.06);
  fs.lineTo(0, 0.5);
  fs.closePath();
  const finGeo = new THREE.ExtrudeGeometry(fs, { depth: 0.09, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 1, curveSegments: 5 });
  finGeo.translate(0, 0, -0.045);
  for (const a of [0, Math.PI, -Math.PI / 2]) {
    const holder = new THREE.Group();
    holder.rotation.y = a;
    const fin = new THREE.Mesh(finGeo, red);
    fin.position.x = 0.46;
    fin.castShadow = true;
    holder.add(fin);
    body.add(holder);
  }

  // иллюминатор с откидной крышкой
  const portY = 1.92;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.06, 6, 16), metal);
  ring.position.set(0, portY, 0.705);
  ring.castShadow = true;
  body.add(ring);
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.255, 16), new THREE.MeshBasicMaterial({ color: 0x0c1020 }));
  hole.position.set(0, portY, 0.7);
  body.add(hole);
  const cabin = new THREE.Mesh(new THREE.CircleGeometry(0.16, 12), new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0 }));
  cabin.position.set(0, portY - 0.05, 0.702);
  body.add(cabin);
  const hinge = new THREE.Group();
  hinge.position.set(-0.27, portY, 0.75);
  const door = new THREE.Group();
  door.position.x = 0.27;
  hinge.add(door);
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.235, 0.235, 0.05, 16),
    new THREE.MeshStandardMaterial({ color: 0x86dcff, emissive: 0x1d6c9c, emissiveIntensity: 0.7, roughness: 0.12, metalness: 0.25, flatShading: true }),
  );
  glass.rotation.x = Math.PI / 2;
  door.add(glass);
  const doorRing = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.04, 6, 16), metal);
  doorRing.position.z = 0.02;
  door.add(doorRing);
  const shine = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.2), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }));
  shine.position.set(-0.08, 0.06, 0.03);
  shine.rotation.z = -0.6;
  door.add(shine);
  body.add(hinge);

  // пламя
  const flame = new THREE.Group();
  flame.position.y = 0.1;
  shake.add(flame);
  const fGeo = new THREE.ConeGeometry(0.42, 2.3, 12, 1, true);
  fGeo.rotateX(Math.PI);
  fGeo.translate(0, -1.15, 0);
  const outer = new THREE.Mesh(fGeo, new THREE.MeshBasicMaterial({
    color: 0xff7a2a, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  const iGeo = new THREE.ConeGeometry(0.25, 1.35, 10, 1, true);
  iGeo.rotateX(Math.PI);
  iGeo.translate(0, -0.67, 0);
  const inner = new THREE.Mesh(iGeo, new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
  }));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture('rgba(255,170,80,1)', 'rgba(255,90,20,0)'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  glow.position.y = -0.5;
  glow.scale.set(3.4, 3.4, 1);
  const light = new THREE.PointLight(0xff8a3a, 0, 28, 1.6);
  light.position.y = -0.6;
  flame.add(outer, inner, glow, light);

  return { root, shake, body, flame, outer, inner, glow, light, hinge, cabin, portLocal: new THREE.Vector3(0, portY, 0.75) };
}

function buildLaunchSite(rnd) {
  const g = new THREE.Group();

  // земля: ровная у стартового стола, холмы и горы вдали
  const geo = new THREE.PlaneGeometry(900, 900, 110, 110);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const d = Math.hypot(x, z);
    const hill = Math.sin(x * 0.045) * Math.cos(z * 0.05) * 3 + Math.sin(x * 0.011 + z * 0.017) * 9 + Math.cos(z * 0.021 - x * 0.006) * 5;
    const k = smooth(28, 120, d);
    const mount = z < -150 ? smooth(150, 330, -z) * (20 + Math.abs(Math.sin(x * 0.02)) * 55) : 0;
    pos.setY(i, (hill * k + mount) * (d < 26 ? 0 : 1) + (rnd() - 0.5) * 0.6 * k);
  }
  const ng = geo.toNonIndexed();
  const p2 = ng.attributes.position;
  const colors = new Float32Array(p2.count * 3);
  const cA = new THREE.Color('#8fae5d'), cB = new THREE.Color('#b3a76b'), cC = new THREE.Color('#6f9a55'), cR = new THREE.Color('#9aa0a8');
  const tmp = new THREE.Color();
  for (let i = 0; i < p2.count; i += 3) {
    const x = (p2.getX(i) + p2.getX(i + 1) + p2.getX(i + 2)) / 3;
    const y = (p2.getY(i) + p2.getY(i + 1) + p2.getY(i + 2)) / 3;
    const z = (p2.getZ(i) + p2.getZ(i + 1) + p2.getZ(i + 2)) / 3;
    const n = Math.sin(x * 0.09) * Math.cos(z * 0.07) + Math.sin(x * 0.031 + z * 0.05);
    tmp.copy(cA).lerp(n > 0.4 ? cB : cC, Math.abs(n) * 0.5);
    if (y > 26) tmp.lerp(cR, smooth(26, 50, y));
    if (y > 52) tmp.set('#f2f5fa');
    for (let k = 0; k < 3; k++) tmp.toArray(colors, (i + k) * 3);
  }
  ng.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  ng.computeVertexNormals();
  const ground = new THREE.Mesh(ng, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  g.add(ground);

  // бетонная площадка
  const concrete = lowpoly(0xb9bcc4, { roughness: 0.95 });
  const apron = new THREE.Mesh(new THREE.CylinderGeometry(9, 9.5, 0.12, 14), lowpoly(0xa6aab2, { roughness: 1 }));
  apron.position.y = 0.06;
  apron.receiveShadow = true;
  g.add(apron);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.95, 0.32, 10), concrete);
  pad.position.y = 0.16;
  pad.castShadow = true;
  pad.receiveShadow = true;
  g.add(pad);
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(2.35, 0.06, 4, 24), lowpoly(0xffc533, { roughness: 0.8 }));
  stripe.rotation.x = Math.PI / 2;
  stripe.position.y = 0.33;
  g.add(stripe);
  const trench = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.34, 4.2), lowpoly(0x5b5f68));
  trench.position.set(0, 0.17, -3.6);
  trench.receiveShadow = true;
  g.add(trench);

  // башня обслуживания
  const tower = new THREE.Group();
  tower.position.set(-1.95, 0.32, -0.2);
  const tRed = lowpoly(0xe2513f);
  const tWhite = lowpoly(0xf1eee8);
  const H = 5.4;
  for (const [x, z] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(0.09, H, 0.09), tRed);
    p.position.set(x, H / 2, z);
    p.castShadow = true;
    tower.add(p);
  }
  for (let y = 0.5; y < H; y += 0.62) {
    const mat = Math.round(y / 0.62) % 2 ? tWhite : tRed;
    for (const [x, z, ry] of [[0, -0.3, 0], [0, 0.3, 0], [-0.3, 0, Math.PI / 2], [0.3, 0, Math.PI / 2]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.06, 0.06), mat);
      b.position.set(x, y, z);
      b.rotation.y = ry;
      b.castShadow = true;
      tower.add(b);
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.035, 0.035), mat);
      d.position.set(x, y + 0.31, z);
      d.rotation.y = ry;
      d.rotation.z = (ry ? 1 : -1) * 0.78;
      tower.add(d);
    }
  }
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.09, 0.95), tWhite);
  top.position.y = H + 0.04;
  top.castShadow = true;
  tower.add(top);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3b30 }));
  beacon.position.y = H + 0.22;
  tower.add(beacon);
  const armPivot = new THREE.Group();
  armPivot.position.set(0.3, 3.15, 0);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.11, 0.2), tWhite);
  arm.position.x = 0.5;
  arm.castShadow = true;
  armPivot.add(arm);
  tower.add(armPivot);
  g.add(tower);

  // осветительные мачты
  for (const [px, pz] of [[-6.5, -5], [6.5, -5], [-10, -13], [10, -13]]) {
    const m = new THREE.Group();
    m.position.set(px, 0, pz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 7, 5), lowpoly(0x8e949e));
    pole.position.y = 3.5;
    pole.castShadow = true;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.25, 0.2), lowpoly(0xfff7d0, { emissive: 0xfff2b0, emissiveIntensity: 0.5 }));
    lamp.position.y = 7.05;
    m.add(pole, lamp);
    g.add(m);
  }

  // ангар, корпус управления, резервуары
  const hangar = new THREE.Group();
  hangar.position.set(-21, 0, -30);
  const hb = new THREE.Mesh(new THREE.BoxGeometry(7, 3, 5), lowpoly(0xe9e6df));
  hb.position.y = 1.5;
  const roof2 = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 2.5, 7, 8, 1, false, 0, Math.PI), lowpoly(0x6f88b8));
  roof2.rotation.z = Math.PI / 2;
  roof2.position.y = 3;
  const gate = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 3), lowpoly(0x4c5566));
  gate.position.set(3.52, 1.1, 0);
  hangar.add(hb, roof2, gate);
  hangar.rotation.y = 0.35;
  hangar.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(hangar);

  const ctrl = new THREE.Group();
  ctrl.position.set(19, 0, -24);
  const c1 = new THREE.Mesh(new THREE.BoxGeometry(4, 2, 3), lowpoly(0xf0ede6));
  c1.position.y = 1;
  const c2 = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 2), lowpoly(0xdcd8cf));
  c2.position.set(0.6, 2.6, 0);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2.4), lowpoly(0xf6f6f6, { side: THREE.DoubleSide }));
  dish.position.set(-1, 3.1, 0);
  dish.rotation.x = -2.2;
  ctrl.add(c1, c2, dish);
  ctrl.rotation.y = -0.4;
  ctrl.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  g.add(ctrl);

  for (let i = 0; i < 3; i++) {
    const tank = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 7), lowpoly(0xf4f4f4, { roughness: 0.4 }));
    tank.position.set(12 + i * 2.6, 1.5, -16 - i * 1.2);
    tank.castShadow = true;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.8, 6), lowpoly(0x9aa0a8));
    leg.position.set(tank.position.x, 0.4, tank.position.z);
    g.add(tank, leg);
  }

  // деревья и кусты
  const leaf = [lowpoly(0x4f8a4a), lowpoly(0x5d9a4f), lowpoly(0x3f7a45)];
  const trunk = lowpoly(0x7a5a3c);
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2;
    const d = 18 + rnd() * 70;
    const x = Math.cos(a) * d, z = Math.sin(a) * d - 10;
    if (z > 8) continue;
    const tr = new THREE.Group();
    const s = 0.7 + rnd() * 1.1;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9 * s, 2.4 * s, 6), leaf[i % 3]);
    cone.position.y = 1.7 * s;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.16 * s, 0.8 * s, 5), trunk);
    st.position.y = 0.4 * s;
    cone.castShadow = true;
    tr.add(cone, st);
    tr.position.set(x, 0, z);
    g.add(tr);
  }
  return { group: g, armPivot, beacon };
}

// Кучевое облако: несколько сплюснутых икосаэдров с плоским низом
function cloudGeometry(rnd, scale, ox = 0, oy = 0, oz = 0) {
  const parts = [];
  const n = 7 + Math.floor(rnd() * 5);
  for (let i = 0; i < n; i++) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const k = i / (n - 1) - 0.5;
    const s = (0.55 + rnd() * 0.55) * scale * (1 - Math.abs(k) * 0.9);
    const x = k * 3 * scale + (rnd() - 0.5) * 0.5 * scale;
    const y = (0.5 - Math.abs(k)) * 0.7 * scale + rnd() * 0.2 * scale;
    const z = (rnd() - 0.5) * 1.1 * scale;
    g.scale(s * 1.3, s * 0.82, s);
    g.translate(x, y, z);
    const pos = g.attributes.position;
    for (let v = 0; v < pos.count; v++) {
      if (pos.getY(v) < 0) pos.setY(v, pos.getY(v) * 0.22);
    }
    g.translate(ox, oy, oz);
    parts.push(g);
  }
  const merged = mergeGeometries(parts);
  merged.computeVertexNormals();
  return merged;
}
const cloudMat = () => new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0xbac8e2, emissiveIntensity: 0.42, flatShading: true, roughness: 1,
});

function buildAstronaut() {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const suit = lowpoly(0xf3f4f7, { roughness: 0.55 });
  const suit2 = lowpoly(0xdfe3ea, { roughness: 0.6 });
  const grey = lowpoly(0x9da5b4, { roughness: 0.5, metalness: 0.2 });
  const accent = lowpoly(0xff7a52, { roughness: 0.5 });
  const gold = lowpoly(0xf2b544, { roughness: 0.25, metalness: 1 });

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.3, 3, 9), suit);
  torso.scale.z = 0.82;
  torso.castShadow = true;
  body.add(torso);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 5, 12), grey);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = -0.12;
  belt.scale.y = 0.82;
  body.add(belt);
  const panel = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.2, 0.08, 2, 0.02), suit2);
  panel.position.set(0, 0.06, 0.25);
  body.add(panel);
  [[-0.08, 0xff5e7e], [0, 0xffc533], [0.08, 0x48c6ff]].forEach(([x, c]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.6 }));
    b.position.set(x, 0.07, 0.295);
    body.add(b);
  });
  const patch = new THREE.Mesh(new THREE.CircleGeometry(0.06, 8), accent);
  patch.position.set(0.21, 0.18, 0.2);
  patch.rotation.y = 0.6;
  body.add(patch);

  const pack = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.6, 0.26, 2, 0.05), suit2);
  pack.position.set(0, 0.06, -0.32);
  pack.castShadow = true;
  body.add(pack);
  const pack2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 6), grey);
  pack2.position.set(0.18, 0.06, -0.46);
  const pack3 = pack2.clone();
  pack3.position.x = -0.18;
  body.add(pack2, pack3);

  // шлем
  const head = new THREE.Group();
  head.position.y = 0.6;
  body.add(head);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 9), suit);
  helmet.castShadow = true;
  head.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 18, 12, -Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.26, Math.PI * 0.42),
    new THREE.MeshStandardMaterial({ color: 0x1b2844, roughness: 0.08, metalness: 0.9, emissive: 0x0b1430, emissiveIntensity: 0.6 }),
  );
  visor.scale.set(1.04, 1.02, 1.08);
  visor.position.z = 0.04;
  head.add(visor);
  const visorRim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.028, 5, 18, Math.PI * 2), gold);
  visorRim.position.set(0, 0.0, 0.255);
  visorRim.scale.set(1.08, 0.86, 1);
  head.add(visorRim);
  const refl = new THREE.Mesh(new THREE.PlaneGeometry(0.06, 0.15), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 }));
  refl.position.set(-0.12, 0.07, 0.345);
  refl.rotation.set(0, -0.35, -0.5);
  head.add(refl);
  const neck = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 5, 12), grey);
  neck.rotation.x = Math.PI / 2;
  neck.position.y = -0.3;
  head.add(neck);
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.08), grey);
  lamp.position.set(0.28, 0.12, 0.1);
  head.add(lamp);

  // руки
  const mkArm = (side) => {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.36, 0.2, 0);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 2, 7), suit);
    upper.position.y = -0.16;
    upper.castShadow = true;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.32;
    shoulder.add(elbow);
    const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.18, 2, 7), suit);
    fore.position.y = -0.13;
    fore.castShadow = true;
    elbow.add(fore);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.025, 4, 10), accent);
    cuff.rotation.x = Math.PI / 2;
    cuff.position.y = -0.24;
    elbow.add(cuff);
    const hand = new THREE.Group();
    hand.position.y = -0.31;
    elbow.add(hand);
    const glove = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), grey);
    glove.scale.set(1, 1.15, 0.9);
    glove.castShadow = true;
    hand.add(glove);
    body.add(shoulder);
    return { shoulder, elbow, hand };
  };
  const armR = mkArm(-1); // правая рука астронавта (слева для зрителя)
  const armL = mkArm(1);

  const mkLeg = (side) => {
    const hip = new THREE.Group();
    hip.position.set(side * 0.15, -0.34, 0);
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.2, 2, 7), suit);
    thigh.position.y = -0.17;
    thigh.castShadow = true;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.34;
    hip.add(knee);
    const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.18, 2, 7), suit);
    shin.position.y = -0.13;
    shin.castShadow = true;
    knee.add(shin);
    const boot = new THREE.Mesh(new RoundedBoxGeometry(0.22, 0.14, 0.3, 2, 0.05), grey);
    boot.position.set(0, -0.3, 0.04);
    boot.castShadow = true;
    knee.add(boot);
    body.add(hip);
    return { hip, knee };
  };
  const legR = mkLeg(-1);
  const legL = mkLeg(1);

  // тюбик космической еды в правой руке
  const tube = new THREE.Group();
  const tubeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.32, 8), lowpoly(0xd7dde7, { roughness: 0.25, metalness: 0.7 }));
  const label = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.12, 8), accent);
  label.position.y = 0.02;
  const crimp = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.04), lowpoly(0xc2c9d4, { metalness: 0.6, roughness: 0.3 }));
  crimp.position.y = 0.17;
  const neckT = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.045, 0.06, 8), lowpoly(0xc2c9d4, { metalness: 0.6, roughness: 0.3 }));
  neckT.position.y = -0.19;
  const nozzle = new THREE.Object3D();
  nozzle.position.y = -0.25;
  tube.add(tubeBody, label, crimp, neckT, nozzle);
  tube.position.set(0, -0.06, 0.04);
  armR.hand.add(tube);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), lowpoly(0xff5e7e));
  cap.position.y = -0.245;
  tube.add(cap);

  root.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
  return { root, body, head, armR, armL, legR, legL, tube, tubeBody, nozzle, cap };
}

function buildEarth() {
  const R = 60;
  const geo = new THREE.IcosahedronGeometry(R, 22);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const ocean = new THREE.Color('#2e6fd6'), deep = new THREE.Color('#214fa8'), land = new THREE.Color('#5e9e52'), sand = new THREE.Color('#c8b778');
  const tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    const x = (pos.getX(i) + pos.getX(i + 1) + pos.getX(i + 2)) / 3 / R;
    const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 / R;
    const z = (pos.getZ(i) + pos.getZ(i + 1) + pos.getZ(i + 2)) / 3 / R;
    const n = Math.sin(x * 5.1 + 1.3) * Math.cos(z * 4.3 - 0.4) + Math.sin(y * 6.2 + x * 2.1) * 0.6 + Math.sin(z * 9 + y * 3) * 0.25;
    if (n > 0.55) tmp.copy(land).lerp(sand, clamp((n - 0.9) * 1.6));
    else tmp.copy(ocean).lerp(deep, clamp(-n * 0.5));
    for (let k = 0; k < 3; k++) tmp.toArray(colors, (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.75, transparent: true, opacity: 0, fog: false });
  const earth = new THREE.Mesh(geo, mat);
  const atmo = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.035, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color('#5aa8ff') }, uOpacity: { value: 0 } },
      vertexShader: `varying vec3 vN; varying vec3 vV;
        void main(){ vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV;
        void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.2); gl_FragColor = vec4(uColor * f * 1.6, f * uOpacity); }`,
      side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    }),
  );
  const grp = new THREE.Group();
  grp.add(earth, atmo);
  grp.rotation.set(0.35, 0, 1.25);
  return { group: grp, earth, atmo };
}

// ═══════════════════ ОСНОВНАЯ ФУНКЦИЯ ═════════════════════════════════
export async function initHero({ canvas, header, tagline, skipBtn, replayBtn, cue }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.autoClear = false;

  const fontJson = await fetch('assets/fonts/fredoka_bold.typeface.json').then((r) => r.json());
  const font = new FontLoader().parse(fontJson);

  const rnd = mulberry32(7);
  let camDist = CAM_Z;
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0xcde6ff, 40, 360);
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 2000);
  camera.position.set(0, CAM_START_Y, camDist);

  // ─── небо (полноэкранный квад) ──────────────────────────────────────
  const skyScene = new THREE.Scene();
  const skyCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const skyU = {
    uTop: { value: new THREE.Color() },
    uBot: { value: new THREE.Color() },
    uSun: { value: new THREE.Vector2(0.06, 0.95) },
    uAspect: { value: 1 },
    uGlow: { value: 0.5 },
    uGSize: { value: 0.3 },
    uStars: { value: 0 },
    uTime: { value: 0 },
    uDisk: { value: 0 },
  };
  skyScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
    uniforms: skyU,
    depthWrite: false,
    depthTest: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 uTop, uBot;
      uniform vec2 uSun;
      uniform float uAspect, uGlow, uGSize, uStars, uTime, uDisk;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float y = vUv.y;
        vec3 col = mix(uBot, uTop, smoothstep(0.0, 1.0, pow(y, 0.85)));
        vec2 d = (vUv - uSun) * vec2(uAspect, 1.0);
        float r = length(d);
        vec3 sunCol = vec3(1.0, 0.93, 0.78);
        col += sunCol * exp(-r / uGSize) * uGlow;
        col += sunCol * smoothstep(0.036, 0.027, r) * uDisk * 1.3;
        col += vec3(1.0, 0.78, 0.5) * exp(-r / 0.035) * uDisk * 0.55;
        // звёзды
        vec2 g = vUv * vec2(uAspect, 1.0) * 150.0;
        vec2 id = floor(g);
        vec2 f = fract(g) - 0.5;
        float h = hash(id);
        vec2 o = vec2(hash(id + 3.7), hash(id + 9.1)) - 0.5;
        float s = step(0.972, h) * smoothstep(0.11, 0.0, length(f - o * 0.6)) * (0.4 + 0.6 * hash(id + 1.1));
        float tw = 0.65 + 0.35 * sin(uTime * (1.0 + h * 3.0) + h * 80.0);
        vec3 sc = mix(vec3(1.0), vec3(0.7, 0.82, 1.0), hash(id + 5.5));
        col += sc * s * tw * uStars * (1.0 - exp(-r / 0.12) * 0.9);
        gl_FragColor = vec4(col, 1.0);
      }`,
  })));

  // ─── свет ──────────────────────────────────────────────────────────
  const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x6d7a52, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0d8, 3.1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -15; sc.right = 15; sc.top = 15; sc.bottom = -15; sc.near = 1; sc.far = 90;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const rim = new THREE.DirectionalLight(0x7d96ff, 0);
  scene.add(rim, rim.target);

  // ─── объекты ───────────────────────────────────────────────────────
  const site = buildLaunchSite(rnd);
  scene.add(site.group);

  const rocket = buildRocket();
  scene.add(rocket.root);
  const ROCKET_SCALE = 0.92;
  rocket.root.scale.setScalar(ROCKET_SCALE);

  const clouds = [];
  const cMat = cloudMat();
  for (let i = 0; i < 14; i++) {
    const s = 1.1 + rnd() * 1.6;
    const c = new THREE.Mesh(cloudGeometry(rnd, s), cMat);
    const y = 20 + i * 7.5 + rnd() * 5;
    let x = (rnd() - 0.5) * 56;
    let z = -55 + rnd() * 40;
    if (i % 3 === 1) { z = 1 + rnd() * 4; x = (rnd() < 0.5 ? -1 : 1) * (4 + rnd() * 6); }
    c.position.set(x, y, z);
    c.userData.drift = (rnd() - 0.5) * 0.5;
    scene.add(c);
    clouds.push(c);
  }
  // «море облаков» — сплошной слой, который после пролёта закрывает землю
  const deckParts = [];
  for (let i = 0; i < 46; i++) {
    const s = 2.5 + rnd() * 3.5;
    deckParts.push(cloudGeometry(rnd, s, (rnd() - 0.5) * 320, 30 + rnd() * 6, -30 - rnd() * 240));
  }
  const deck = new THREE.Mesh(mergeGeometries(deckParts), cMat);
  scene.add(deck);

  // звёзды с параллаксом во время подъёма
  const starGeo = new THREE.BufferGeometry();
  const sp = new Float32Array(1600 * 3);
  for (let i = 0; i < 1600; i++) {
    sp[i * 3] = (rnd() - 0.5) * 220;
    sp[i * 3 + 1] = 70 + rnd() * 300;
    sp[i * 3 + 2] = -60 - rnd() * 90;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.42, transparent: true, opacity: 0, depthWrite: false, fog: false });
  scene.add(new THREE.Points(starGeo, starMat));

  const earth = buildEarth();
  scene.add(earth.group);

  const astro = buildAstronaut();
  astro.root.visible = false;
  scene.add(astro.root);
  const capWorld = new THREE.Group();
  scene.add(capWorld);

  // ─── слово «Space Reacher» ─────────────────────────────────────────
  const word = new THREE.Group();
  scene.add(word);
  const letters = [];
  const LINES = ['Space', 'Reacher'];
  const LINE_H = 1.2;
  const fscale = 1 / fontJson.resolution;
  let li = 0;
  const lineWidths = [];
  LINES.forEach((line, row) => {
    let x = 0;
    for (const ch of line) {
      const glyph = fontJson.glyphs[ch];
      const adv = (glyph ? glyph.ha : 500) * fscale;
      const geo = new TextGeometry(ch, {
        font, size: 1, height: 0.36, curveSegments: 9,
        bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.06, bevelSegments: 5,
      });
      geo.computeBoundingBox();
      const bb = geo.boundingBox;
      const cx = (bb.min.x + bb.max.x) / 2;
      const cz = (bb.min.z + bb.max.z) / 2;
      geo.translate(-cx, 0, -cz);
      const mat = jellyMaterial(PASTE[li % PASTE.length], li * 1.37);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.visible = false;
      mesh.userData.index = li;
      letters.push({
        mesh, mat, row, baseX: x + cx, cy: (bb.min.y + bb.max.y) / 2,
        spring: 0, vel: 0, arrivals: [], color: PASTE[li % PASTE.length],
      });
      word.add(mesh);
      x += adv + 0.015;
      li++;
    }
    lineWidths[row] = x;
  });
  const wordW = Math.max(...lineWidths);

  // ─── еда: капли, летящие из тюбика к буквам ────────────────────────
  const BLOBS_PER = 4;
  const blobGeo = new THREE.IcosahedronGeometry(1, 3);
  const blobs = [];
  const blobMats = letters.map((l) => blobMaterial(l.color));
  for (let j = 0; j < letters.length * BLOBS_PER; j++) {
    const L = Math.floor(j / BLOBS_PER);
    const e = T.SQUEEZE + j * T.BLOB_GAP + rnd() * 0.02;
    const D = 1.35 + rnd() * 0.6;
    const m = new THREE.Mesh(blobGeo, blobMats[L]);
    m.visible = false;
    m.castShadow = true;
    scene.add(m);
    const b = {
      mesh: m, L, e, a: e + D, D,
      size: 0.2 + rnd() * 0.12,
      r: [rnd(), rnd(), rnd(), rnd(), rnd(), rnd()],
      p0: null, spin: (rnd() - 0.5) * 6,
    };
    letters[L].arrivals.push(b.a);
    blobs.push(b);
  }

  // ─── дым: инстансы low-poly клубов ─────────────────────────────────
  const SMOKE_N = 640;
  const smokeMesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, roughness: 1, emissive: 0xa9b3c6, emissiveIntensity: 0.4 }),
    SMOKE_N,
  );
  smokeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  smokeMesh.frustumCulled = false;
  scene.add(smokeMesh);
  const S = {
    p: new Float32Array(SMOKE_N * 3), v: new Float32Array(SMOKE_N * 3),
    age: new Float32Array(SMOKE_N), life: new Float32Array(SMOKE_N), size: new Float32Array(SMOKE_N),
    drag: new Float32Array(SMOKE_N), rot: new Float32Array(SMOKE_N * 3), next: 0,
  };
  const smokeCol = new THREE.Color();
  for (let i = 0; i < SMOKE_N; i++) {
    S.life[i] = 0;
    smokeCol.setScalar(0.82 + rnd() * 0.18);
    smokeMesh.setColorAt(i, smokeCol);
  }
  const _m4 = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _e = new THREE.Euler();
  const _v = new THREE.Vector3();
  const _v2 = new THREE.Vector3();
  const _s = new THREE.Vector3();
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < SMOKE_N; i++) smokeMesh.setMatrixAt(i, ZERO);

  function emitSmoke(x, y, z, vx, vy, vz, size, life, drag) {
    const i = S.next;
    S.next = (S.next + 1) % SMOKE_N;
    S.p[i * 3] = x; S.p[i * 3 + 1] = y; S.p[i * 3 + 2] = z;
    S.v[i * 3] = vx; S.v[i * 3 + 1] = vy; S.v[i * 3 + 2] = vz;
    S.age[i] = 0; S.life[i] = life; S.size[i] = size; S.drag[i] = drag;
    S.rot[i * 3] = Math.random() * 6; S.rot[i * 3 + 1] = Math.random() * 6; S.rot[i * 3 + 2] = Math.random() * 6;
  }
  function clearSmoke() {
    S.life.fill(0);
    for (let i = 0; i < SMOKE_N; i++) smokeMesh.setMatrixAt(i, ZERO);
    smokeMesh.instanceMatrix.needsUpdate = true;
  }
  function updateSmoke(dt) {
    for (let i = 0; i < SMOKE_N; i++) {
      if (S.life[i] <= 0) continue;
      S.age[i] += dt;
      const k = S.age[i] / S.life[i];
      if (k >= 1) { S.life[i] = 0; smokeMesh.setMatrixAt(i, ZERO); continue; }
      const dr = Math.exp(-S.drag[i] * dt);
      S.v[i * 3] *= dr; S.v[i * 3 + 1] = S.v[i * 3 + 1] * dr + 0.35 * dt; S.v[i * 3 + 2] *= dr;
      S.p[i * 3] += S.v[i * 3] * dt; S.p[i * 3 + 1] += S.v[i * 3 + 1] * dt; S.p[i * 3 + 2] += S.v[i * 3 + 2] * dt;
      if (S.p[i * 3 + 1] < 0.4) S.p[i * 3 + 1] = 0.4;
      const grow = 0.35 + 0.65 * easeOutCubic(k / 0.4);
      const fade = k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
      const sc = S.size[i] * grow * fade;
      _e.set(S.rot[i * 3] + S.age[i] * 0.3, S.rot[i * 3 + 1], S.rot[i * 3 + 2]);
      _q.setFromEuler(_e);
      _v.set(S.p[i * 3], S.p[i * 3 + 1], S.p[i * 3 + 2]);
      _s.set(sc, sc * 0.86, sc);
      _m4.compose(_v, _q, _s);
      smokeMesh.setMatrixAt(i, _m4);
    }
    smokeMesh.instanceMatrix.needsUpdate = true;
  }

  // ─── раскладка под размер экрана ──────────────────────────────────
  const L = {
    rocket: new THREE.Vector3(), rocketScale: ROCKET_SCALE, astro: new THREE.Vector3(), astroScale: 1,
    wordScale: 1, portrait: false, halfW: 8, halfH: 5,
  };
  let W = 1, H = 1;
  const _proj = new THREE.Vector3();

  function layout() {
    W = header.clientWidth || window.innerWidth;
    H = header.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    skyU.uAspect.value = W / H;
    // в портретной ориентации камера отъезжает, чтобы сцена помещалась по ширине
    camDist = camera.aspect < 0.95 ? CAM_Z * clamp(0.95 / camera.aspect, 1, 1.75) : CAM_Z;
    const halfH = camDist * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const halfW = halfH * camera.aspect;
    L.halfW = halfW; L.halfH = halfH;
    L.portrait = camera.aspect < 0.95;
    const wordTop = 0.78, wordBottom = -LINE_H - 0.28;
    const wordH = wordTop - wordBottom;
    let s, wx, wy;
    if (!L.portrait) {
      s = Math.min((halfW * 0.98) / wordW, (halfH * 1.32) / wordH, 2.6);
      wx = -halfW * 0.9;
      wy = SY + 0.25 - (wordTop + wordBottom) / 2 * s;
      L.rocket.set(halfW * 0.66, SY - 1.55, -2.2);
      L.rocketScale = ROCKET_SCALE;
      L.astro.set(halfW * 0.3, SY - 1.25, 2.4);
      L.astroScale = 1.05;
    } else {
      s = Math.min((halfW * 1.72) / wordW, (halfH * 0.7) / wordH);
      wx = -wordW * s / 2;
      wy = SY + halfH * 0.42 - (wordTop + wordBottom) / 2 * s;
      L.rocket.set(halfW * 0.48, SY - halfH * 0.6, -2.6);
      L.rocketScale = ROCKET_SCALE;
      L.astro.set(-halfW * 0.3, SY - halfH * 0.36, 2.2);
      L.astroScale = 1.15;
    }
    L.wordScale = s;
    word.scale.setScalar(s);
    word.position.set(wx, wy, 0);
    for (const l of letters) {
      const off = L.portrait ? (wordW - lineWidths[l.row]) / 2 : 0;
      l.mesh.position.set(l.baseX + off, -l.row * LINE_H, 0);
    }
    // подпись под словом
    word.updateMatrixWorld(true);
    _proj.set(0, wordBottom - 0.1, 0).applyMatrix4(word.matrixWorld);
    const camSave = camera.position.clone();
    camera.position.set(0, SY, camDist);
    camera.lookAt(0, SY, 0);
    camera.updateMatrixWorld();
    _proj.project(camera);
    const sx = L.portrait ? W / 2 : ((wx - 0) / halfW * 0.5 + 0.5) * W;
    const sy = (-_proj.y * 0.5 + 0.5) * H;
    tagline.style.setProperty('--tag-x', L.portrait ? '50%' : `${Math.max(16, sx + 6)}px`);
    tagline.style.setProperty('--tag-y', `${Math.min(H - 150, sy + 6)}px`);
    tagline.classList.toggle('center', L.portrait);
    camera.position.copy(camSave);
  }

  // ─── позиции по времени ──────────────────────────────────────────
  const flight = (t) => smoother((t - T.LIFT) / (T.STOP - T.LIFT));
  const rocketPos = new THREE.Vector3();
  let camY = CAM_START_Y;
  let camLookY = CAM_START_Y + 0.6;

  function placeRocket(t) {
    const p = flight(t);
    const lag = 0.0095 * Math.sqrt(Math.max(0, Math.sin(Math.PI * p)));
    const q = clamp(p - lag);
    camY = lerp(CAM_START_Y, SY, q);
    camLookY = camY + lerp(0.6, 0, smooth(0, 0.4, p)) + 1.7 * Math.pow(Math.sin(Math.PI * p), 1.5);
    const sc = lerp(ROCKET_SCALE, L.rocketScale, smooth(0.6, 1, p));
    rocketPos.set(
      L.rocket.x * smooth(0.28, 1, p),
      lerp(0.32, L.rocket.y, p),
      L.rocket.z * smooth(0.45, 1, p),
    );
    rocket.root.scale.setScalar(sc);
    let tilt = -0.46 * smooth(0.22, 0.66, p) * (1 - 0.55 * smooth(0.78, 1, p));
    if (t > T.STOP) {
      const it = t - T.STOP;
      rocketPos.y += Math.sin(it * 0.9) * 0.08;
      rocketPos.x += Math.sin(it * 0.55) * 0.05;
      tilt += Math.sin(it * 0.7) * 0.025;
    }
    rocket.root.position.copy(rocketPos);
    rocket.root.rotation.z = tilt;
    rocket.body.rotation.y = (1 - smoother(p / 0.93)) * Math.PI * 2;
    return p;
  }

  function thrustAt(t) {
    if (t < T.IGNITE) return 0;
    if (t < T.LIFT) return lerp(0.18, 0.8, smooth(T.IGNITE, T.LIFT, t));
    if (t < T.CUTOFF) return 1 - 0.25 * smooth(T.LIFT + 3, T.CUTOFF, t);
    return 0.75 * (1 - smooth(T.CUTOFF, T.CUTOFF + 0.45, t));
  }

  const portWorld = new THREE.Vector3();
  const nozzleWorld = new THREE.Vector3();
  const tmpV = new THREE.Vector3();
  const bez = (a, b, c, d, t, out) => {
    const u = 1 - t;
    return out.set(
      u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
      u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
      u * u * u * a.z + 3 * u * u * t * b.z + 3 * u * t * t * c.z + t * t * t * d.z,
    );
  };

  function poseAstronaut(t) {
    const A = astro;
    if (t < T.OUT0) { A.root.visible = false; return; }
    A.root.visible = true;
    const u = clamp((t - T.OUT0) / (T.OUT1 - T.OUT0));
    const idle = t - T.OUT0;
    const final = tmpV.copy(L.astro);
    final.x += Math.sin(idle * 0.8) * 0.1;
    final.y += Math.sin(idle * 0.62) * 0.18;
    rocket.body.updateWorldMatrix(true, false);
    portWorld.copy(rocket.portLocal).applyMatrix4(rocket.body.matrixWorld);
    if (u < 1) {
      const e = easeInOutSine(u);
      const c1 = _v2.copy(portWorld).add(_v.set(-0.6, 1.0, 2.2));
      const w = 1 - e;
      // квадратичная кривая: иллюминатор → дуга → точка левитации
      A.root.position.set(
        w * w * portWorld.x + 2 * w * e * c1.x + e * e * final.x,
        w * w * portWorld.y + 2 * w * e * c1.y + e * e * final.y,
        w * w * portWorld.z + 2 * w * e * c1.z + e * e * final.z,
      );
      A.root.scale.setScalar(L.astroScale * lerp(0.22, 1, easeOutBack(clamp(u * 1.25), 1.4)));
      A.body.rotation.set((1 - e) * 0.9, -0.4 * e, (1 - e) * 2.6);
    } else {
      A.root.position.copy(final);
      A.root.scale.setScalar(L.astroScale);
      A.body.rotation.set(Math.sin(idle * 0.45) * 0.08, -0.42 + Math.sin(idle * 0.3) * 0.14, Math.sin(idle * 0.52) * 0.1);
    }
    A.head.rotation.set(Math.sin(idle * 0.7) * 0.06, -0.15 + Math.sin(idle * 0.4) * 0.12, 0);

    // руки и ноги
    const flail = u < 1 ? Math.sin(idle * 9) * 0.4 * (1 - u) : 0;
    const capPhase = smooth(T.CAP - 0.3, T.CAP + 0.2, t) * (1 - smooth(T.SQUEEZE - 0.15, T.SQUEEZE + 0.2, t));
    const squeeze = smooth(T.SQUEEZE - 0.3, T.SQUEEZE + 0.1, t) * (1 - smooth(T.SQUEEZE + 2.5, T.SQUEEZE + 3.6, t));
    const rest = 1 - Math.max(capPhase, squeeze);
    // правая рука (держит тюбик)
    A.armR.shoulder.rotation.z = -0.45 * rest - 0.95 * capPhase - 1.38 * squeeze + flail + Math.sin(idle * 0.8) * 0.06;
    A.armR.shoulder.rotation.x = -0.15 * rest - 0.75 * capPhase - 0.3 * squeeze;
    A.armR.elbow.rotation.x = -0.45 * rest - 0.55 * capPhase - 0.08 * squeeze;
    A.armR.elbow.rotation.z = -0.2 * capPhase;
    // левая рука: тянется к крышке, потом машет
    const wave = smooth(T.DONE - 1.4, T.DONE - 0.9, t) * (1 - smooth(T.DONE + 1.2, T.DONE + 1.8, t));
    A.armL.shoulder.rotation.z = 0.45 * (1 - capPhase) * (1 - wave) + 0.55 * capPhase - flail + wave * (2.55 + Math.sin(t * 9) * 0.35);
    A.armL.shoulder.rotation.x = -0.15 - 0.9 * capPhase;
    A.armL.elbow.rotation.x = -0.5 - 0.6 * capPhase + wave * 0.2;
    A.armL.elbow.rotation.z = wave * 0.5;
    A.legR.hip.rotation.x = 0.25 + Math.sin(idle * 0.7) * 0.12 + flail * 0.4;
    A.legL.hip.rotation.x = -0.12 + Math.sin(idle * 0.7 + 1.5) * 0.12 - flail * 0.4;
    A.legR.hip.rotation.z = -0.12;
    A.legL.hip.rotation.z = 0.12;
    A.legR.knee.rotation.x = 0.45 + Math.sin(idle * 0.9) * 0.1;
    A.legL.knee.rotation.x = 0.3 + Math.sin(idle * 0.9 + 1) * 0.1;
    // тюбик сжимается
    const pulse = squeeze > 0.5 ? Math.max(0, Math.sin(t * 22)) * 0.28 : 0;
    A.tubeBody.scale.set(1 - pulse, 1 + pulse * 0.3, 1 - pulse);
  }

  function placeCap(t) {
    const cap = astro.cap;
    if (t < T.CAP_OFF) {
      if (cap.parent !== astro.tube) {
        astro.tube.add(cap);
        cap.scale.setScalar(1);
        cap.position.set(0, -0.245, 0);
        cap.rotation.set(0, 0, 0);
      }
      cap.rotation.y = smooth(T.CAP, T.CAP_OFF, t) * 12;
      return;
    }
    if (cap.parent !== capWorld) {
      capWorld.add(cap);
      cap.scale.setScalar(L.astroScale);
    }
    const k = t - T.CAP_OFF;
    cap.position.set(
      L.astro.x - 0.35 + k * 0.42,
      L.astro.y + 0.45 + k * 0.33 + Math.sin(k * 1.3) * 0.1,
      L.astro.z + 0.2 + k * 0.12,
    );
    cap.rotation.set(k * 2.1, k * 1.3, k * 3.4);
  }

  function letterWorldCenter(l, out) {
    out.copy(l.mesh.position);
    out.y += 0.36;
    return out.applyMatrix4(word.matrixWorld);
  }

  const P1 = new THREE.Vector3(), P2 = new THREE.Vector3(), P3 = new THREE.Vector3(), B0 = new THREE.Vector3(), B1 = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  function updateBlobs(t, prevT) {
    astro.nozzle.updateWorldMatrix(true, false);
    word.updateMatrixWorld();
    nozzleWorld.setFromMatrixPosition(astro.nozzle.matrixWorld);
    for (const b of blobs) {
      const m = b.mesh;
      if (t < b.e || t >= b.a) {
        m.visible = false;
        if (t < b.e) b.p0 = null;
        continue;
      }
      if (!b.p0) b.p0 = nozzleWorld.clone();
      const u = (t - b.e) / b.D;
      const l = letters[b.L];
      letterWorldCenter(l, P3);
      const r = b.r;
      P1.copy(b.p0).add(_v.set(-1.2 - r[0] * 2.6, 0.4 + (r[1] - 0.4) * 4.2, (r[2] - 0.3) * 3));
      P2.copy(P3).add(_v.set(1.4 + r[3] * 2.4, (r[4] - 0.5) * 4, 0.6 + (r[5] - 0.5) * 2.6));
      const s = easeInOutSine(u);
      bez(b.p0, P1, P2, P3, s, B0);
      bez(b.p0, P1, P2, P3, Math.min(1, s + 0.02), B1);
      m.position.copy(B0);
      const vel = B1.sub(B0);
      const speed = vel.length() * 50;
      if (speed > 1e-4) m.quaternion.setFromUnitVectors(UP, vel.normalize());
      const env = smooth(0, 0.14, u) * (1 - 0.65 * smooth(0.82, 1, u));
      const st = Math.min(0.9, speed * 0.045);
      const rs = b.size * env * (0.65 + L.wordScale * 0.25);
      m.scale.set(rs * (1 - st * 0.35), rs * (1 + st), rs * (1 - st * 0.35));
      m.rotateY(t * b.spin);
      m.visible = true;
    }
    // удар капли о букву — желе вздрагивает
    for (const l of letters) {
      for (const a of l.arrivals) if (prevT < a && t >= a) l.vel += 2.6;
    }
  }

  function updateLetters(t, dt, time) {
    for (const l of letters) {
      let sc = 0;
      for (const a of l.arrivals) sc += (1 / BLOBS_PER) * easeOutElastic((t - a) / 0.8);
      l.mesh.visible = sc > 0.002;
      const k = 150, c = 6.5;
      l.vel += (-k * l.spring - c * l.vel) * dt;
      l.spring += l.vel * dt;
      l.spring = clamp(l.spring, -0.45, 0.6);
      l.mesh.scale.setScalar(Math.max(0.0001, sc));
      const u = l.mat.userData.u;
      u.uTime.value = time;
      u.uSquash.value = l.spring;
    }
  }

  // ─── взаимодействие ────────────────────────────────────────────────
  const pointer = { x: 0, y: 0, sx: 0, sy: 0, inside: false };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered = -1;
  let spin = 0;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    pointer.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    pointer.inside = true;
    ndc.set(pointer.x, -pointer.y);
  });
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; hovered = -1; canvas.style.cursor = ''; });
  canvas.addEventListener('click', () => {
    if (t < T.DONE - 1) return;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(letters.map((l) => l.mesh), false)[0];
    if (hit) {
      const i = hit.object.userData.index;
      letters.forEach((l, j) => {
        const d = Math.abs(j - i);
        if (d < 4) setTimeout(() => { l.vel += (d === 0 ? 7 : 4 - d) * (d % 2 ? -1 : 1); }, d * 70);
      });
      return;
    }
    const hitA = raycaster.intersectObject(astro.root, true)[0];
    if (hitA) spin = 1;
  });

  function hoverCheck() {
    if (!pointer.inside || t < T.DONE - 1) return;
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObjects(letters.map((l) => l.mesh), false)[0];
    const i = hit ? hit.object.userData.index : -1;
    if (i !== hovered && i >= 0) letters[i].vel += 3.2 * (Math.random() < 0.5 ? -1 : 1);
    hovered = i;
    const astroHit = !hit && raycaster.intersectObject(astro.root, true).length > 0;
    canvas.style.cursor = hit || astroHit ? 'pointer' : '';
  }

  // ─── цикл ──────────────────────────────────────────────────────────
  let t = reduce ? T.DONE + 2 : 0;
  const qT = parseFloat(new URLSearchParams(location.search).get('herot'));
  if (Number.isFinite(qT)) t = qT; // отладка: ?herot=12 — начать с 12-й секунды
  let time = 0;
  let visible = true;
  let idleKick = 1.5;
  let hoverTimer = 0;
  let uiDone = false;

  function setUI() {
    const done = t >= T.DONE - 0.6;
    if (done !== uiDone) {
      uiDone = done;
      tagline.classList.toggle('show', done);
      cue.classList.toggle('show', done);
      skipBtn.classList.toggle('fade', done);
      replayBtn.hidden = !done;
      if (done) {
        const tx = tagline.querySelector('[data-type-later]');
        if (tx && !tx.dataset.typed) {
          tx.dataset.typed = '1';
          import('./fx.js').then((m) => m.typeText(tx, { speed: 26 }));
        }
      }
    }
  }

  skipBtn.addEventListener('click', () => {
    if (t < T.DONE) { t = T.DONE; clearSmoke(); }
  });
  replayBtn.addEventListener('click', () => {
    t = 0;
    clearSmoke();
    blobs.forEach((b) => { b.p0 = null; });
    letters.forEach((l) => { l.spring = 0; l.vel = 0; });
  });

  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0.02 });
  io.observe(header);
  window.addEventListener('resize', layout);
  layout();

  let lastNow = performance.now();
  let emitAcc = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const rawDt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;
    if (!visible || document.hidden) return;
    const dt = rawDt;
    const prevT = t;
    t += dt;
    time += dt;

    // ракета и камера
    const p = placeRocket(t);
    const alt = clamp((camY - CAM_START_Y) / (SY - CAM_START_Y));
    const thrust = thrustAt(t);
    const shakeAmp = (0.055 * smooth(T.IGNITE + 0.3, T.LIFT, t) * (1 - 0.7 * smooth(T.LIFT, T.LIFT + 2.2, t))) * (thrust > 0.05 ? 1 : 0);
    rocket.shake.position.set((Math.random() - 0.5) * shakeAmp, (Math.random() - 0.5) * shakeAmp * 0.4, (Math.random() - 0.5) * shakeAmp * 0.5);
    rocket.shake.rotation.z = (Math.random() - 0.5) * shakeAmp * 0.5;

    // пламя
    const fl = thrust * (0.85 + Math.random() * 0.3);
    rocket.flame.visible = thrust > 0.01;
    rocket.outer.scale.set(0.8 + thrust * 0.35 + alt * 0.3, 0.25 + fl * (1 + alt * 0.7), 0.8 + thrust * 0.35 + alt * 0.3);
    rocket.inner.scale.set(1, 0.3 + fl * 0.9, 1);
    rocket.glow.material.opacity = thrust;
    rocket.glow.scale.setScalar(2.2 + fl * 2.2);
    rocket.light.intensity = thrust * (36 + Math.random() * 14);

    // иллюминатор
    rocket.hinge.rotation.y = -1.95 * easeOutBack(clamp((t - T.HATCH) / 0.55), 2.2);
    rocket.cabin.material.opacity = smooth(T.HATCH, T.HATCH + 0.4, t) * 0.9;

    // мачта отводится при зажигании
    site.armPivot.rotation.y = 1.25 * smooth(T.IGNITE, T.IGNITE + 1.6, t);
    site.beacon.material.color.setHex(Math.sin(time * 6) > 0 ? 0xff3b30 : 0x5a1010);

    // дым
    rocket.root.updateMatrixWorld(true);
    nozzleWorld.set(0, 0.08, 0);
    rocket.shake.localToWorld(nozzleWorld);
    let rate = 0;
    if (t > T.IGNITE && t < T.LIFT + 0.6) rate = 165 * smooth(T.IGNITE, T.IGNITE + 1.0, t);
    if (t >= T.LIFT) rate = Math.max(rate * (1 - smooth(T.LIFT + 0.2, T.LIFT + 0.8, t)), 95 * thrust * (1 - smooth(0.35, 0.62, alt)));
    emitAcc += rate * dt;
    while (emitAcc >= 1) {
      emitAcc -= 1;
      if (t < T.LIFT + 0.5) {
        const a = Math.random() * Math.PI * 2;
        const side = Math.random() < 0.75 ? Math.sign(Math.cos(a)) : 0;
        const spd = 3.5 + Math.random() * 6.5;
        const dirx = side ? side * (0.75 + Math.random() * 0.25) : Math.cos(a);
        const dirz = side ? (Math.random() - 0.3) * 0.7 : Math.sin(a);
        emitSmoke(nozzleWorld.x, Math.max(0.5, nozzleWorld.y - 0.1), nozzleWorld.z,
          dirx * spd, 0.2 + Math.random() * 1.5, dirz * spd,
          0.7 + Math.random() * 0.95, 3.2 + Math.random() * 2.6, 1.05);
      } else {
        _v.set((Math.random() - 0.5) * 1.6, -3.2 - Math.random() * 3, (Math.random() - 0.5) * 1.6);
        _v.applyAxisAngle(Z_AXIS, rocket.root.rotation.z);
        emitSmoke(nozzleWorld.x, nozzleWorld.y - 0.4, nozzleWorld.z, _v.x, _v.y, _v.z,
          0.4 + Math.random() * 0.55 * (1 - alt), 2 + Math.random() * 1.8, 1.9);
      }
    }
    updateSmoke(dt);

    // облака
    for (const c of clouds) c.position.x += c.userData.drift * dt;

    // камера
    const settle = smooth(T.STOP - 0.5, T.DONE, t);
    const scrollP = clamp(window.scrollY / (H || 1));
    if (!reduce) {
      pointer.sx += (pointer.x - pointer.sx) * 0.04;
      pointer.sy += (pointer.y - pointer.sy) * 0.04;
    }
    const camShake = shakeAmp * 0.45;
    camera.position.set(
      pointer.sx * 0.9 * settle + (Math.random() - 0.5) * camShake,
      camY - pointer.sy * 0.55 * settle - scrollP * 1.5 + (Math.random() - 0.5) * camShake,
      camDist + scrollP * 5,
    );
    camera.lookAt(pointer.sx * 0.25 * settle, camLookY - scrollP * 0.6, 0);

    // небо и свет
    // цвет неба идёт по времени полёта, чтобы каждый слой атмосферы был заметен
    const skyAlt = Math.max(alt * 0.35, easeInOutSine((t - T.LIFT - 0.4) / (T.STOP - 1.0 - T.LIFT - 0.4)));
    const sk = sampleSky(skyAlt);
    skyU.uTop.value.copy(sk.top);
    skyU.uBot.value.copy(sk.bot);
    skyU.uGlow.value = sk.glow;
    skyU.uGSize.value = sk.gsize;
    skyU.uStars.value = sk.stars;
    skyU.uDisk.value = smooth(0.55, 0.95, skyAlt);
    skyU.uTime.value = time;
    scene.fog.color.copy(sk.bot);
    const haze = smooth(0.015, 0.16, alt) * (1 - smooth(0.42, 0.62, alt));
    const clear = smooth(0.42, 0.62, alt);
    scene.fog.near = lerp(40, 6, haze) + clear * 800;
    scene.fog.far = lerp(360, 130, haze) + clear * 8000;
    site.group.position.y = -smooth(0.04, 0.5, alt) * 240;
    site.group.visible = alt < 0.7;
    deck.visible = alt < 0.8;
    hemi.color.copy(sk.hs);
    hemi.groundColor.copy(sk.hg);
    hemi.intensity = sk.hi;
    sun.intensity = sk.sun;
    rim.intensity = 1.4 * smooth(0.6, 1, skyAlt);
    const focusY = alt > 0.5 ? SY : camY;
    sun.target.position.set(alt > 0.5 ? 0 : rocketPos.x * 0.5, focusY - 1, 0);
    sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 40);
    rim.target.position.set(0, SY, 0);
    rim.position.set(14, SY + 4, -16);
    starMat.opacity = smooth(0.4, 0.85, skyAlt);
    header.classList.toggle('space', alt > 0.85);

    // Земля внизу кадра в космосе
    const ef = smooth(0.68, 0.97, alt);
    earth.group.visible = ef > 0.001;
    earth.earth.material.opacity = ef;
    earth.atmo.material.uniforms.uOpacity.value = ef;
    earth.group.position.set(-12, camY - 74.5 - (1 - ef) * 10 - scrollP * 2, -48);
    earth.earth.rotation.y = time * 0.015;

    // астронавт, крышка, капли еды, буквы
    poseAstronaut(t);
    if (spin > 0) {
      spin = Math.max(0, spin - dt * 0.8);
      astro.body.rotation.x += easeInOutSine(1 - spin) * Math.PI * 2;
    }
    placeCap(t);
    updateBlobs(t, prevT);
    blobMats.forEach((m) => { m.userData.u.uTime.value = time; });

    if (t > T.DONE - 0.5) {
      idleKick -= dt;
      if (idleKick <= 0) {
        idleKick = 0.7 + Math.random() * 1.3;
        const l = letters[Math.floor(Math.random() * letters.length)];
        l.vel += (1.2 + Math.random() * 1.8) * (Math.random() < 0.5 ? -1 : 1);
      }
    }
    updateLetters(t, dt, time);
    hoverTimer -= dt;
    if (hoverTimer <= 0) { hoverTimer = 0.08; hoverCheck(); }

    setUI();
    renderer.clear();
    renderer.render(skyScene, skyCam);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return { skip: () => { t = T.DONE; clearSmoke(); } };
}
