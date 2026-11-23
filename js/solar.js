// ═══════════════════════════════════════════════════════════════════════
// Модель Солнечной системы внутри карточки на странице.
// Анимированное Солнце с bloom, планеты с атмосферами и днём/ночью,
// наклоны осей и орбит, спутники, пояс астероидов, пояс Койпера, Плутон
// и комета с хвостами, которые всегда смотрят от Солнца.
// ═══════════════════════════════════════════════════════════════════════
import * as THREE from 'three';
import { createStage, addStarfield } from './stage.js';
import { createPlanet, loadTexture, glowSpriteTex } from './planets.js';
import { countUp } from './fx.js';

const DEG = Math.PI / 180;
const BASE_RATE = 0.3; // рад/с для Земли при скорости 1×

const BODIES = [
  {
    id: 'sun', name: 'Солнце', type: 'Звезда · жёлтый карлик G2V', r: 4.2, orbit: 0, speed: 0, spin: 0.03, color: '#ffc95c',
    desc: 'Содержит 99,86% массы всей системы. Каждую секунду превращает около 4 млн тонн вещества в энергию — свет летит до Земли 8 минут.',
    stats: [['Диаметр', 1392700, 'км'], ['Поверхность', 5500, '°C'], ['Ядро', 15, 'млн °C'], ['Масса', 333000, 'M⊕'], ['Возраст', 4.6, 'млрд лет', 1], ['Оборот', 25, 'сут']],
  },
  {
    id: 'mercury', name: 'Меркурий', type: 'Каменистая планета', r: 0.42, orbit: 10.5, speed: 4.15, spin: 0.05, tilt: 0.03, incl: 7.0, color: '#b5b1a8',
    desc: 'Ближайшая к Солнцу планета без атмосферы: днём +430 °C, ночью −180 °C. Сутки на Меркурии длиннее его года.',
    stats: [['Диаметр', 4879, 'км'], ['От Солнца', 57.9, 'млн км', 1], ['Спутники', 0, ''], ['Сутки', 176, 'зем. сут'], ['Год', 88, 'сут'], ['Гравитация', 0.38, 'g', 2]],
  },
  {
    id: 'venus', name: 'Венера', type: 'Каменистая планета', r: 0.72, orbit: 14.5, speed: 1.62, spin: -0.02, tilt: 177.4, incl: 3.4, color: '#e8c48a',
    desc: 'Самая горячая планета — 465 °C из-за парникового эффекта. Давление у поверхности в 92 раза выше земного, а вращается она «задом наперёд».',
    stats: [['Диаметр', 12104, 'км'], ['От Солнца', 108.2, 'млн км', 1], ['Спутники', 0, ''], ['Сутки', 243, 'зем. сут'], ['Год', 225, 'сут'], ['Поверхность', 465, '°C']],
  },
  {
    id: 'earth', name: 'Земля', type: 'Каменистая планета · наш дом', r: 0.76, orbit: 19, speed: 1, spin: 0.5, tilt: 23.44, incl: 0, color: '#5c9dff',
    desc: 'Единственный известный мир с жизнью. 71% поверхности покрыто водой, магнитное поле и атмосфера защищают от излучения Солнца.',
    stats: [['Диаметр', 12742, 'км'], ['От Солнца', 149.6, 'млн км', 1], ['Спутники', 1, ''], ['Сутки', 24, 'ч'], ['Год', 365.25, 'сут', 2], ['Средняя t', 15, '°C']],
  },
  {
    id: 'mars', name: 'Марс', type: 'Каменистая планета', r: 0.52, orbit: 23.5, speed: 0.53, spin: 0.48, tilt: 25.2, incl: 1.85, color: '#e0714a',
    desc: '«Красная планета» из-за оксида железа. Здесь вулкан Олимп высотой около 22 км и каньон длиной с США.',
    stats: [['Диаметр', 6779, 'км'], ['От Солнца', 227.9, 'млн км', 1], ['Спутники', 2, ''], ['Сутки', 24.6, 'ч', 1], ['Год', 687, 'сут'], ['Гравитация', 0.38, 'g', 2]],
  },
  {
    id: 'jupiter', name: 'Юпитер', type: 'Газовый гигант', r: 2.25, orbit: 35, speed: 0.084, spin: 1.1, tilt: 3.1, incl: 1.3, color: '#d9b38a',
    desc: 'Крупнейшая планета: в неё поместились бы все остальные вместе взятые. Большое красное пятно — шторм шире Земли.',
    stats: [['Диаметр', 139820, 'км'], ['От Солнца', 778.5, 'млн км', 1], ['Спутники', 95, '+'], ['Сутки', 9.9, 'ч', 1], ['Год', 11.9, 'лет', 1], ['Масса', 318, 'M⊕']],
  },
  {
    id: 'saturn', name: 'Сатурн', type: 'Газовый гигант', r: 1.85, orbit: 46, speed: 0.034, spin: 1.0, tilt: 26.7, incl: 2.5, color: '#e6d3a0',
    desc: 'Кольца шириной 280 000 км, но толщиной всего около километра. Средняя плотность меньше воды.',
    stats: [['Диаметр', 116460, 'км'], ['От Солнца', 1434, 'млн км'], ['Спутники', 146, '+'], ['Сутки', 10.7, 'ч', 1], ['Год', 29.5, 'лет', 1], ['Кольца', 280000, 'км']],
  },
  {
    id: 'uranus', name: 'Уран', type: 'Ледяной гигант', r: 1.25, orbit: 56, speed: 0.012, spin: -0.7, tilt: 97.8, incl: 0.8, color: '#9fe6f2',
    desc: 'Вращается «лёжа на боку» — ось наклонена на 98°. Метан в атмосфере придаёт ему голубой цвет.',
    stats: [['Диаметр', 50724, 'км'], ['От Солнца', 2871, 'млн км'], ['Спутники', 28, ''], ['Сутки', 17.2, 'ч', 1], ['Год', 84, 'года'], ['Атмосфера', -224, '°C']],
  },
  {
    id: 'neptune', name: 'Нептун', type: 'Ледяной гигант', r: 1.2, orbit: 65, speed: 0.006, spin: 0.68, tilt: 28.3, incl: 1.8, color: '#6f8cff',
    desc: 'Самые сильные ветра в системе — до 2 100 км/ч. Первую планету, найденную «на кончике пера» — по расчётам.',
    stats: [['Диаметр', 49244, 'км'], ['От Солнца', 4495, 'млн км'], ['Спутники', 16, ''], ['Сутки', 16.1, 'ч', 1], ['Год', 165, 'лет'], ['Ветер', 2100, 'км/ч']],
  },
  {
    id: 'pluto', name: 'Плутон', type: 'Карликовая планета · пояс Койпера', r: 0.2, orbit: 76, speed: 0.004, spin: -0.1, tilt: 120, incl: 17.1, ecc: 0.25, color: '#d7c3a8',
    desc: 'Ледяной мир с «сердцем» из азотного льда. С 2006 года — карликовая планета. Его спутник Харон всего вдвое меньше самого Плутона.',
    stats: [['Диаметр', 2377, 'км'], ['От Солнца', 5906, 'млн км'], ['Спутники', 5, ''], ['Сутки', 6.4, 'сут', 1], ['Год', 248, 'лет'], ['Поверхность', -230, '°C']],
  },
];

const MOONS = {
  earth: [{ name: 'Луна', tex: 'moon', r: 0.21, d: 1.95, sp: 2.2 }],
  mars: [{ name: 'Фобос', c: '#8d7f72', r: 0.065, d: 0.95, sp: 5, rock: true }, { name: 'Деймос', c: '#a39686', r: 0.05, d: 1.35, sp: 2.6, rock: true }],
  jupiter: [
    { name: 'Ио', c: '#e8cf5a', spots: '#b2641f', r: 0.17, d: 3.3, sp: 2.4 },
    { name: 'Европа', c: '#d9cbb5', lines: '#8a5a3c', r: 0.15, d: 4.1, sp: 1.7 },
    { name: 'Ганимед', c: '#9c8f84', spots: '#d8d2c8', r: 0.23, d: 5.1, sp: 1.15 },
    { name: 'Каллисто', c: '#6d6258', spots: '#c9c0b4', r: 0.21, d: 6.3, sp: 0.75 },
  ],
  saturn: [{ name: 'Титан', c: '#d99a45', r: 0.22, d: 5.4, sp: 0.8, haze: true }, { name: 'Энцелад', c: '#f4f7fb', r: 0.07, d: 4.55, sp: 1.6 }],
  uranus: [{ name: 'Титания', c: '#b9b2ad', r: 0.1, d: 2.4, sp: 1.2 }, { name: 'Оберон', c: '#a59d96', r: 0.1, d: 2.95, sp: 0.9 }],
  neptune: [{ name: 'Тритон', c: '#e9d3cf', spots: '#b88f86', r: 0.13, d: 2.3, sp: -1.3 }],
  pluto: [{ name: 'Харон', c: '#a7a19b', r: 0.1, d: 0.55, sp: 1.4 }],
};

// ─── процедурные текстуры для спутников ──────────────────────────────
function moonTexture(m) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = m.c;
  g.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * 256, y = Math.random() * 128, r = Math.random() * 7 + 1;
    g.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${(Math.random() * 0.12).toFixed(3)})`;
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  if (m.spots) {
    g.fillStyle = m.spots;
    for (let i = 0; i < 40; i++) {
      g.globalAlpha = 0.2 + Math.random() * 0.5;
      g.beginPath(); g.arc(Math.random() * 256, Math.random() * 128, Math.random() * 6 + 1, 0, Math.PI * 2); g.fill();
    }
  }
  if (m.lines) {
    g.strokeStyle = m.lines;
    g.lineWidth = 1.2;
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.3 + Math.random() * 0.4;
      g.beginPath();
      g.moveTo(Math.random() * 256, Math.random() * 128);
      g.bezierCurveTo(Math.random() * 256, Math.random() * 128, Math.random() * 256, Math.random() * 128, Math.random() * 256, Math.random() * 128);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function rockGeometry(detail = 0, rough = 0.35) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const map = new Map();
  for (let i = 0; i < pos.count; i++) {
    const key = `${pos.getX(i).toFixed(3)},${pos.getY(i).toFixed(3)},${pos.getZ(i).toFixed(3)}`;
    if (!map.has(key)) map.set(key, 1 - rough / 2 + Math.random() * rough);
    const k = map.get(key);
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.85, pos.getZ(i) * k);
  }
  geo.computeVertexNormals();
  return geo;
}

// ─── Солнце: текстура + анимированная грануляция + потемнение к краю ──
const NOISE_GLSL = `
  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }`;

function sunMaterial(tex) {
  return new THREE.ShaderMaterial({
    uniforms: { uTex: { value: tex }, uTime: { value: 0 } },
    vertexShader: `
      varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vV;
      void main(){
        vUv = uv; vP = position;
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; uniform float uTime;
      varying vec2 vUv; varying vec3 vN; varying vec3 vP; varying vec3 vV;
      ${NOISE_GLSL}
      void main(){
        vec3 p = normalize(vP);
        float n1 = snoise(p * 4.0 + vec3(uTime * 0.05, uTime * 0.03, 0.0));
        float n2 = snoise(p * 14.0 - vec3(0.0, uTime * 0.12, uTime * 0.08));
        float n3 = snoise(p * 38.0 + uTime * 0.25);
        vec2 uv = vUv + vec2(n1, n2) * 0.004;
        vec3 base = texture2D(uTex, uv).rgb;
        float gran = 0.55 * n1 + 0.3 * n2 + 0.15 * n3;
        vec3 hot = vec3(1.0, 0.86, 0.5);
        vec3 col = mix(base, hot, 0.35) * (1.25 + gran * 0.45);
        float mu = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
        float limb = 0.45 + 0.55 * pow(mu, 0.45);
        col *= limb;
        col += vec3(1.0, 0.45, 0.1) * pow(1.0 - mu, 3.0) * 0.6;
        gl_FragColor = vec4(col * 1.55, 1.0);
      }`,
  });
}

// Линия орбиты, которая светится «следом» за планетой
function orbitLine(radius, color, ecc = 0) {
  const N = 360;
  const pos = new Float32Array((N + 1) * 3);
  const ang = new Float32Array(N + 1);
  const b = radius * Math.sqrt(1 - ecc * ecc);
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * radius - ecc * radius;
    pos[i * 3 + 2] = Math.sin(a) * b;
    ang[i] = a;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('ang', new THREE.BufferAttribute(ang, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uAngle: { value: 0 }, uHi: { value: 0 }, uShow: { value: 1 } },
    vertexShader: 'attribute float ang; varying float vA; void main(){ vA = ang; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `
      uniform vec3 uColor; uniform float uAngle, uHi, uShow; varying float vA;
      void main(){
        float d = mod(uAngle - vA + 6.28318530718, 6.28318530718) / 6.28318530718;
        float trail = pow(1.0 - d, 4.0);
        float a = (0.1 + 0.55 * trail + uHi * 0.45) * uShow;
        gl_FragColor = vec4(uColor * (0.7 + trail * 0.6 + uHi), a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  return new THREE.Line(g, mat);
}

function softDotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ═══════════════════════════════════════════════════════════════════════
export async function initSolar(root) {
  const stageEl = root.querySelector('[data-stage]');
  const stage = createStage(stageEl, {
    fov: 45, near: 0.05, far: 3000,
    bloom: { strength: 0.9, radius: 0.55, threshold: 0.8 },
    exposure: 1.05,
  });
  const { scene, camera, controls, canvas } = stage;
  const HOME = { pos: new THREE.Vector3(0, 46, 112), target: new THREE.Vector3(0, -2, 0) };
  camera.position.copy(HOME.pos);
  controls.target.copy(HOME.target);
  controls.minDistance = 9;
  controls.maxDistance = 280;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.25;

  addStarfield(scene, { count: 6000, band: 9000, radius: 1200 });
  scene.add(new THREE.AmbientLight(0x2a3452, 1.5));
  const sunLight = new THREE.PointLight(0xfff1dc, 4.2, 0, 0);
  scene.add(sunLight);

  // ─── Солнце ────────────────────────────────────────────────────────
  const sunTex = await loadTexture('textures/sun.jpg', 0xffcc55);
  const sunMat = sunMaterial(sunTex);
  const sunMesh = new THREE.Mesh(new THREE.SphereGeometry(BODIES[0].r, 96, 64), sunMat);
  scene.add(sunMesh);
  const coronaTex = glowSpriteTex(0xffb347, true);
  const corona1 = new THREE.Sprite(new THREE.SpriteMaterial({ map: coronaTex, color: 0xffc070, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 }));
  corona1.scale.setScalar(BODIES[0].r * 5);
  const corona2 = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSpriteTex(0xff7a2a, true), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.4 }));
  corona2.scale.setScalar(BODIES[0].r * 10);
  scene.add(corona1, corona2);

  // ─── планеты ───────────────────────────────────────────────────────
  const bodies = [];
  const hitTargets = [];
  const textures = {};
  for (let i = 0; i < BODIES.length; i++) {
    const B = BODIES[i];
    const entry = { B, index: i, angle: Math.random() * Math.PI * 2, moons: [] };
    if (B.id === 'sun') {
      entry.mesh = sunMesh;
      entry.world = new THREE.Vector3();
      entry.hit = new THREE.Mesh(new THREE.SphereGeometry(B.r * 1.15, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
      scene.add(entry.hit);
      textures.sun = 'textures/sun.jpg';
    } else {
      const pivot = new THREE.Group();
      pivot.rotation.set(B.incl * DEG, Math.random() * Math.PI * 2, 0);
      scene.add(pivot);
      const carrier = new THREE.Group();
      pivot.add(carrier);
      const tilt = new THREE.Group();
      tilt.rotation.z = (B.tilt || 0) * DEG;
      carrier.add(tilt);
      let body;
      if (B.id === 'pluto') {
        const mat = new THREE.MeshStandardMaterial({ map: moonTexture({ c: '#cbb49a', spots: '#f2e6d6' }), roughness: 1 });
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(B.r, 48, 32), mat);
        body = { mesh, setSunDir() {}, tick() {} };
        mesh.userData.tick = () => {};
        mesh.userData.setSunDir = () => {};
      } else {
        body = await createPlanet(B.id, { radius: B.r, heat: false });
        body.mesh.rotation.z = 0; // наклон задаёт группа tilt
      }
      tilt.add(body.mesh);
      const line = orbitLine(B.orbit, B.color, B.ecc || 0);
      pivot.add(line);
      entry.pivot = pivot;
      entry.carrier = carrier;
      entry.tilt = tilt;
      entry.mesh = body.mesh;
      entry.body = body;
      entry.line = line;
      entry.world = new THREE.Vector3();
      entry.hit = new THREE.Mesh(new THREE.SphereGeometry(Math.max(B.r * 1.7, 1.1), 10, 8), new THREE.MeshBasicMaterial({ visible: false }));
      carrier.add(entry.hit);
      textures[B.id] = B.id === 'pluto' ? null : `textures/${B.id}.jpg`;

      // спутники
      for (const m of MOONS[B.id] || []) {
        let mesh;
        if (m.tex) {
          mesh = (await createPlanet(m.tex, { radius: m.r, segments: 48, heat: false })).mesh;
        } else if (m.rock) {
          mesh = new THREE.Mesh(rockGeometry(1, 0.45), new THREE.MeshStandardMaterial({ color: m.c, roughness: 1, flatShading: true }));
          mesh.scale.setScalar(m.r);
        } else {
          mesh = new THREE.Mesh(new THREE.SphereGeometry(m.r, 32, 24), new THREE.MeshStandardMaterial({ map: moonTexture(m), roughness: 0.95 }));
          if (m.haze) {
            mesh.add(new THREE.Mesh(new THREE.SphereGeometry(m.r * 1.12, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb35c, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false })));
          }
        }
        const holder = new THREE.Group();
        holder.rotation.x = (Math.random() - 0.5) * 0.3;
        holder.add(mesh);
        tilt.add(holder);
        entry.moons.push({ m, mesh, holder, a: Math.random() * Math.PI * 2 });
      }
    }
    hitTargets.push(entry.hit);
    entry.hit.userData.index = i;
    bodies.push(entry);
  }

  // ─── пояс астероидов ───────────────────────────────────────────────
  const BELT_N = 2200;
  const belt = new THREE.InstancedMesh(rockGeometry(0, 0.5), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true }), BELT_N);
  const dummy = new THREE.Object3D();
  const bc = new THREE.Color();
  for (let i = 0; i < BELT_N; i++) {
    const a = Math.random() * Math.PI * 2;
    const g = (Math.random() + Math.random() + Math.random()) / 3;
    const rr = 26.3 + g * 5.4;
    dummy.position.set(Math.cos(a) * rr, (Math.random() - 0.5) * 1.1 * (1 - Math.abs(g - 0.5)), Math.sin(a) * rr);
    dummy.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6);
    const s = Math.random() < 0.03 ? 0.18 + Math.random() * 0.14 : 0.035 + Math.random() * 0.09;
    dummy.scale.set(s, s * (0.7 + Math.random() * 0.4), s);
    dummy.updateMatrix();
    belt.setMatrixAt(i, dummy.matrix);
    bc.setHSL(0.07 + Math.random() * 0.05, 0.12 + Math.random() * 0.15, 0.32 + Math.random() * 0.25);
    belt.setColorAt(i, bc);
  }
  scene.add(belt);

  // ─── пояс Койпера ──────────────────────────────────────────────────
  const KN = 5000;
  const kGeo = new THREE.BufferGeometry();
  const kp = new Float32Array(KN * 3);
  for (let i = 0; i < KN; i++) {
    const a = Math.random() * Math.PI * 2;
    const rr = 70 + Math.pow(Math.random(), 0.8) * 20;
    kp.set([Math.cos(a) * rr, (Math.random() - 0.5) * 4.5, Math.sin(a) * rr], i * 3);
  }
  kGeo.setAttribute('position', new THREE.BufferAttribute(kp, 3));
  const kuiper = new THREE.Points(kGeo, new THREE.PointsMaterial({ color: 0x9fb6d8, size: 0.18, transparent: true, opacity: 0.55, depthWrite: false }));
  scene.add(kuiper);

  // ─── комета ────────────────────────────────────────────────────────
  const COMET = { a: 46, e: 0.86, M: 2.6, n: 0.06 };
  const cometPivot = new THREE.Group();
  cometPivot.rotation.set(18 * DEG, 2.2, 0);
  scene.add(cometPivot);
  const cometLine = orbitLine(COMET.a, '#9fd8ff', COMET.e);
  cometLine.material.uniforms.uShow.value = 0.45;
  cometPivot.add(cometLine);
  const nucleus = new THREE.Mesh(rockGeometry(1, 0.5), new THREE.MeshStandardMaterial({ color: 0x8c8378, roughness: 1, flatShading: true }));
  nucleus.scale.setScalar(0.16);
  cometPivot.add(nucleus);
  const coma = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSpriteTex(0xbfe6ff, true), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  cometPivot.add(coma);
  const dotTex = softDotTexture();
  const mkTail = (n, color, size) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: dotTex, color, size, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, n, pos: g.attributes.position.array, vel: new Float32Array(n * 3), life: new Float32Array(n), i: 0 };
  };
  const ionTail = mkTail(700, 0x7fc4ff, 0.5);
  const dustTail = mkTail(700, 0xfff0d0, 0.65);
  const cometWorld = new THREE.Vector3();
  const cometPrev = new THREE.Vector3();

  function updateComet(dt, simDt) {
    COMET.M += COMET.n * simDt;
    let E = COMET.M;
    for (let k = 0; k < 6; k++) E -= (E - COMET.e * Math.sin(E) - COMET.M) / (1 - COMET.e * Math.cos(E));
    const b = COMET.a * Math.sqrt(1 - COMET.e * COMET.e);
    nucleus.position.set(COMET.a * (Math.cos(E) - COMET.e), 0, b * Math.sin(E));
    nucleus.rotation.y += dt;
    cometPrev.copy(cometWorld);
    nucleus.getWorldPosition(cometWorld);
    const r = cometWorld.length();
    const activity = THREE.MathUtils.clamp(26 / (r * r) * 8, 0, 1);
    coma.position.copy(nucleus.position);
    coma.scale.setScalar(0.6 + activity * 3.4);
    coma.material.opacity = 0.25 + activity * 0.75;
    const away = cometWorld.clone().normalize();
    const vel = cometWorld.clone().sub(cometPrev).divideScalar(Math.max(dt, 1e-4));
    for (const [tail, speed, spread, rate, drag] of [[ionTail, 9, 0.25, 260, 0], [dustTail, 3.2, 0.6, 200, 0.55]]) {
      let emit = rate * activity * dt;
      while (emit > 0 && (emit >= 1 || Math.random() < emit)) {
        emit -= 1;
        const j = tail.i;
        tail.i = (tail.i + 1) % tail.n;
        tail.pos[j * 3] = cometWorld.x; tail.pos[j * 3 + 1] = cometWorld.y; tail.pos[j * 3 + 2] = cometWorld.z;
        tail.vel[j * 3] = away.x * speed + (Math.random() - 0.5) * spread - vel.x * drag * 0.15;
        tail.vel[j * 3 + 1] = away.y * speed + (Math.random() - 0.5) * spread - vel.y * drag * 0.15;
        tail.vel[j * 3 + 2] = away.z * speed + (Math.random() - 0.5) * spread - vel.z * drag * 0.15;
        tail.life[j] = 1;
      }
      for (let j = 0; j < tail.n; j++) {
        if (tail.life[j] <= 0) { tail.pos[j * 3 + 1] = 1e5; continue; }
        tail.life[j] -= dt * 0.7;
        tail.pos[j * 3] += tail.vel[j * 3] * dt;
        tail.pos[j * 3 + 1] += tail.vel[j * 3 + 1] * dt;
        tail.pos[j * 3 + 2] += tail.vel[j * 3 + 2] * dt;
      }
      tail.pts.geometry.attributes.position.needsUpdate = true;
      tail.pts.material.opacity = 0.25 + activity * 0.7;
    }
  }

  // ─── HTML-интерфейс внутри сцены ──────────────────────────────────
  const labels = document.createElement('div');
  labels.className = 'sol-labels';
  stageEl.appendChild(labels);
  bodies.forEach((b) => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'sol-label';
    el.style.setProperty('--c', b.B.color);
    el.textContent = b.B.name;
    el.addEventListener('click', () => focusBody(b.index));
    el.addEventListener('pointerenter', () => setHover(b.index));
    el.addEventListener('pointerleave', () => setHover(-1));
    labels.appendChild(el);
    b.label = el;
  });

  const chips = document.createElement('div');
  chips.className = 'sol-chips';
  bodies.forEach((b) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.B.name;
    btn.addEventListener('click', () => focusBody(b.index));
    chips.appendChild(btn);
    b.chip = btn;
  });
  stageEl.appendChild(chips);

  const toolbar = document.createElement('div');
  toolbar.className = 'sol-toolbar';
  toolbar.innerHTML = `
    <button type="button" class="tb-btn" data-act="pause">⏸ Пауза</button>
    <label class="tb-speed">Время <input type="range" min="0" max="100" value="50" aria-label="Скорость времени"><output>1,0×</output></label>
    <span class="tb-speed">📅 <output data-days>+0 дн.</output></span>
    <button type="button" class="tb-btn on" data-act="orbits">Орбиты</button>
    <button type="button" class="tb-btn on" data-act="labels">Подписи</button>
    <button type="button" class="tb-btn" data-act="home">⟲ Обзор</button>`;
  stageEl.appendChild(toolbar);

  const info = document.createElement('aside');
  info.className = 'sol-info';
  stageEl.appendChild(info);

  let speed = 1;
  let paused = false;
  let showOrbits = true;
  let showLabels = true;
  let days = 0;
  const range = toolbar.querySelector('input');
  const speedOut = toolbar.querySelector('label output');
  const daysOut = toolbar.querySelector('[data-days]');
  const fmt1 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const fmt0 = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
  const paintRange = () => {
    const v = Number(range.value);
    speed = v === 0 ? 0 : Math.pow(10, (v - 50) / 50) * (v < 3 ? v / 3 : 1);
    speedOut.textContent = fmt1.format(speed) + '×';
    range.style.setProperty('--fill', `${v}%`);
  };
  range.addEventListener('input', paintRange);
  paintRange();
  toolbar.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'pause') {
      paused = !paused;
      b.textContent = paused ? '▶ Пуск' : '⏸ Пауза';
      b.classList.toggle('on', paused);
    } else if (act === 'orbits') {
      showOrbits = !showOrbits;
      b.classList.toggle('on', showOrbits);
    } else if (act === 'labels') {
      showLabels = !showLabels;
      b.classList.toggle('on', showLabels);
    } else if (act === 'home') {
      goHome();
    }
  });

  // ─── фокус на теле ─────────────────────────────────────────────────
  let focus = -1;
  let hover = -1;
  const fly = { on: false, t: 0, dur: 1.6, fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(), offset: new THREE.Vector3(), home: false };
  const lastFocusPos = new THREE.Vector3();

  function setHover(i) {
    hover = i;
    bodies.forEach((b, j) => {
      if (b.line) b.line.material.uniforms.uHi.value = j === i ? 1 : 0;
      b.label.classList.toggle('hover', j === i);
    });
    canvas.style.cursor = i >= 0 ? 'pointer' : '';
  }

  function renderInfo(b) {
    const B = b.B;
    const ball = textures[B.id] ? `background-image:url(${textures[B.id]})` : `background:${B.color}`;
    info.innerHTML = `
      <div class="si-head">
        <div class="si-ball" style="${ball};--c:${B.color}"></div>
        <div><h3>${B.name}</h3><div class="si-type">${B.type}</div></div>
      </div>
      <p class="si-desc">${B.desc}</p>
      <div class="si-grid">
        ${B.stats.map(([label, v, unit, dec]) => `<div><span>${label}</span><b><i data-count="${v}" data-decimals="${dec || 0}">0</i> ${unit}</b></div>`).join('')}
      </div>
      <div class="si-actions">
        <button type="button" data-a="home">← Обзор</button>
        <button type="button" class="primary" data-a="next">Дальше →</button>
      </div>`;
    info.querySelectorAll('[data-count]').forEach((el) => countUp(el, { duration: 1300 }));
    info.querySelector('[data-a="home"]').addEventListener('click', goHome);
    info.querySelector('[data-a="next"]').addEventListener('click', () => focusBody((focus + 1) % bodies.length));
  }

  function focusBody(i) {
    const b = bodies[i];
    focus = i;
    controls.autoRotate = false;
    b.mesh.getWorldPosition(b.world);
    const dist = b.B.id === 'sun' ? 22 : Math.max(b.B.r * 5.2, 2.4) + (MOONS[b.B.id]?.length ? b.B.r * 1.6 : 0);
    const dir = camera.position.clone().sub(controls.target).normalize();
    dir.y = Math.max(dir.y, 0.22);
    dir.normalize();
    fly.fromPos.copy(camera.position);
    fly.fromTarget.copy(controls.target);
    fly.offset.copy(dir).multiplyScalar(dist);
    fly.t = 0;
    fly.on = true;
    fly.home = false;
    controls.enabled = false;
    controls.minDistance = Math.max(b.B.r * 1.6, 0.6);
    bodies.forEach((x, j) => x.chip.classList.toggle('on', j === i));
    renderInfo(b);
    info.classList.add('open');
  }

  function goHome() {
    focus = -1;
    info.classList.remove('open');
    bodies.forEach((x) => x.chip.classList.remove('on'));
    fly.fromPos.copy(camera.position);
    fly.fromTarget.copy(controls.target);
    fly.t = 0;
    fly.on = true;
    fly.home = true;
    controls.enabled = false;
    controls.minDistance = 9;
  }

  // ─── выбор мышью ───────────────────────────────────────────────────
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let down = null;
  let pendingMove = null;
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
  canvas.addEventListener('pointermove', (e) => { pendingMove = e; });
  canvas.addEventListener('pointerleave', () => { pendingMove = null; setHover(-1); });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    down = null;
    if (moved > 6) return;
    const i = pick(e);
    if (i >= 0) focusBody(i);
  });
  function pick(e) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(hitTargets, false);
    return hits.length ? hits[0].object.userData.index : -1;
  }
  canvas.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') goHome();
    if (e.key === 'ArrowRight') focusBody((focus + 1 + bodies.length) % bodies.length);
    if (e.key === 'ArrowLeft') focusBody((focus - 1 + bodies.length) % bodies.length);
  });

  // ─── кадр ──────────────────────────────────────────────────────────
  const tmp = new THREE.Vector3();
  const sunDir = new THREE.Vector3();
  const proj = new THREE.Vector3();
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  let hoverTimer = 0;

  stage.onFrame = (dt, elapsed) => {
    const simDt = paused ? 0 : dt * speed;
    days += simDt * BASE_RATE * (365.25 / (Math.PI * 2));
    sunMat.uniforms.uTime.value = elapsed;
    sunMesh.rotation.y += simDt * 0.03;
    corona1.material.rotation += dt * 0.02;
    corona2.scale.setScalar(BODIES[0].r * (10.5 + Math.sin(elapsed * 0.8) * 0.6));

    for (const b of bodies) {
      const B = b.B;
      if (B.orbit > 0) {
        b.angle += B.speed * BASE_RATE * simDt;
        const e = B.ecc || 0;
        const rb = B.orbit * Math.sqrt(1 - e * e);
        b.carrier.position.set(Math.cos(b.angle) * B.orbit - e * B.orbit, 0, Math.sin(b.angle) * rb);
        b.mesh.rotation.y += B.spin * simDt * 2;
        b.line.material.uniforms.uAngle.value = ((b.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        b.line.material.uniforms.uShow.value += ((showOrbits ? 1 : 0) - b.line.material.uniforms.uShow.value) * 0.15;
        b.line.visible = b.line.material.uniforms.uShow.value > 0.01;
        b.mesh.getWorldPosition(b.world);
        sunDir.copy(b.world).multiplyScalar(-1);
        b.mesh.userData.setSunDir?.(sunDir);
        b.mesh.userData.tick?.(simDt);
        for (const m of b.moons) {
          m.a += m.m.sp * simDt * 0.6;
          m.mesh.position.set(Math.cos(m.a) * m.m.d, 0, Math.sin(m.a) * m.m.d);
          m.mesh.rotation.y += simDt * 0.2;
          m.mesh.getWorldPosition(tmp);
          m.mesh.userData.setSunDir?.(tmp.multiplyScalar(-1));
        }
      } else {
        b.world.set(0, 0, 0);
      }
    }
    belt.rotation.y += simDt * BASE_RATE * 0.21;
    kuiper.rotation.y += simDt * BASE_RATE * 0.004;
    updateComet(dt, simDt);

    // полёт камеры
    if (fly.on) {
      fly.t = Math.min(1, fly.t + dt / fly.dur);
      const k = ease(fly.t);
      if (fly.home) {
        camera.position.lerpVectors(fly.fromPos, HOME.pos, k);
        controls.target.lerpVectors(fly.fromTarget, HOME.target, k);
      } else {
        const tw = bodies[focus].world;
        tmp.copy(tw).add(fly.offset);
        camera.position.lerpVectors(fly.fromPos, tmp, k);
        controls.target.lerpVectors(fly.fromTarget, tw, k);
      }
      if (fly.t >= 1) {
        fly.on = false;
        controls.enabled = stage.active || !matchMedia('(hover: none), (pointer: coarse)').matches;
        if (focus >= 0) lastFocusPos.copy(bodies[focus].world);
        if (fly.home) controls.autoRotate = true;
      }
    } else if (focus >= 0) {
      // камера едет вместе с планетой, сохраняя угол обзора пользователя
      const w = bodies[focus].world;
      tmp.copy(w).sub(lastFocusPos);
      camera.position.add(tmp);
      controls.target.add(tmp);
      lastFocusPos.copy(w);
    }

    // подписи
    const W = stage.width, H = stage.height;
    const labelsOn = showLabels && focus < 0 && !fly.on;
    for (const b of bodies) {
      proj.copy(b.world);
      if (b.B.id !== 'sun') proj.y += b.B.r * 1.25;
      else proj.y += b.B.r * 1.1;
      proj.project(camera);
      const vis = labelsOn && proj.z < 1 && Math.abs(proj.x) < 1.05 && Math.abs(proj.y) < 1.05;
      b.label.classList.toggle('hidden', !vis);
      if (vis) {
        const x = (proj.x * 0.5 + 0.5) * W;
        const y = (-proj.y * 0.5 + 0.5) * H;
        b.label.style.transform = `translate(-50%, -100%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      }
    }

    hoverTimer -= dt;
    if (pendingMove && hoverTimer <= 0) {
      hoverTimer = 0.06;
      const i = pick(pendingMove);
      if (i !== hover) setHover(i);
    }
    daysOut.textContent = `+${fmt0.format(days)} дн.`;
  };

  await stage.start();
  return stage;
}
