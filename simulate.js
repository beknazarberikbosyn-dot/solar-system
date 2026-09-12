import * as THREE from 'three';

const canvas = document.getElementById('scene');
const statusEl = document.getElementById('sim-status');
const loadingEl = document.getElementById('loading');
const tabsEl = document.getElementById('scenario-tabs');
const descEl = document.getElementById('scenario-desc');
const paramList = document.getElementById('param-list');
const playBtn = document.getElementById('btn-play');
const resetBtn = document.getElementById('btn-reset');
const storyEl = document.getElementById('readout-story');
const gridEl = document.getElementById('readout-grid');
const badgeEl = document.getElementById('mode-badge');

const TEX = 'https://www.solarsystemscope.com/textures/download';
const G = 6.6743e-11;
const C = 299792458;
const MSUN = 1.98847e30;
const MEARTH = 5.972e24;
const REARTH = 6.371e6;

const PLANETS = {
  mercury: { name: 'Меркурий', mass: 3.3e23, radiusKm: 2440, color: 0xaaaaaa, tex: `${TEX}/2k_mercury.jpg` },
  venus:   { name: 'Венера',   mass: 4.87e24, radiusKm: 6052, color: 0xe8cda0, tex: `${TEX}/2k_venus_surface.jpg` },
  earth:   { name: 'Земля',    mass: MEARTH,  radiusKm: 6371, color: 0x4488ff, tex: `${TEX}/2k_earth_daymap.jpg` },
  moon:    { name: 'Луна',     mass: 7.35e22, radiusKm: 1737, color: 0xbbbbbb, tex: `${TEX}/2k_moon.jpg` },
  mars:    { name: 'Марс',     mass: 6.42e23, radiusKm: 3390, color: 0xff4422, tex: `${TEX}/2k_mars.jpg` },
  jupiter: { name: 'Юпитер',   mass: 1.9e27,  radiusKm: 69911, color: 0xd4a574, tex: `${TEX}/2k_jupiter.jpg` },
  saturn:  { name: 'Сатурн',   mass: 5.68e26, radiusKm: 58232, color: 0xc9b896, tex: `${TEX}/2k_saturn.jpg` },
};

const PLANET_OPTS = Object.entries(PLANETS).map(([id, p]) => ({ id, label: p.name }));

// ─── Three.js ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.08, 800);
const simRoot = new THREE.Group();
scene.add(simRoot);

scene.add(new THREE.AmbientLight(0x334466, 0.9));
scene.add(new THREE.HemisphereLight(0x8899cc, 0x080814, 0.45));
const keyLight = new THREE.PointLight(0xfff2d0, 3.2, 220, 0.6);
keyLight.position.set(18, 14, 22);
scene.add(keyLight);

(function addStars() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(4500 * 3);
  for (let i = 0; i < pos.length; i++) pos[i] = (Math.random() - 0.5) * 520;
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.42 })));
})();

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const texCache = new Map();

function loadTexture(url, fallback) {
  if (texCache.has(url)) return texCache.get(url);
  const p = new Promise((resolve) => {
    textureLoader.load(
      url,
      (tex) => { tex.colorSpace = THREE.SRGBColorSpace; resolve(tex); },
      undefined,
      () => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#' + fallback.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, 64, 64);
        resolve(new THREE.CanvasTexture(c));
      },
    );
  });
  texCache.set(url, p);
  return p;
}

const _glow = {};
function glowSprite(color) {
  if (_glow[color]) return _glow[color];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(color);
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.28, `rgba(${r},${g},${b},0.75)`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b},0.22)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _glow[color] = tex;
  return tex;
}

function accretionTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 70, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.28, 'rgba(255,200,90,0.92)');
  grad.addColorStop(0.62, 'rgba(255,90,30,0.55)');
  grad.addColorStop(1, 'rgba(80,10,8,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function visRadius(p) {
  return 0.42 + Math.pow(p.radiusKm / 6371, 0.42) * 0.72;
}

async function makePlanetMesh(id, scale = 1) {
  const p = PLANETS[id];
  const tex = await loadTexture(p.tex, p.color);
  const r = visRadius(p) * scale;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(r, 48, 48),
    new THREE.MeshStandardMaterial({
      map: tex, roughness: 0.78, metalness: 0.04,
      emissive: 0x111122, emissiveIntensity: 0.12,
    }),
  );
  mesh.userData.r = r;
  mesh.userData.id = id;
  return mesh;
}

function makeParticles(count, color, size = 0.08) {
  const pos = new Float32Array(count * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({
    color, size, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  }));
  const vel = Array.from({ length: count }, () => new THREE.Vector3());
  const life = new Float32Array(count);
  return { pts, vel, life, count, pos };
}

function disposeGroup(group) {
  group.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m.dispose?.());
    }
  });
  while (group.children.length) group.remove(group.children[0]);
}

function fmt(n, digits = 2) {
  if (!Number.isFinite(n)) return '—';
  const a = Math.abs(n);
  if (a >= 1e12) {
    const exp = Math.floor(Math.log10(a));
    return (n / 10 ** exp).toFixed(1) + '×10' + exp;
  }
  if (a >= 1e9) return (n / 1e9).toFixed(1) + ' млрд';
  if (a >= 1e6) return (n / 1e6).toFixed(1) + ' млн';
  if (a >= 1e3) return (n / 1e3).toFixed(1) + ' тыс.';
  if (a >= 10) return n.toFixed(0);
  if (a >= 1) return n.toFixed(digits);
  if (a >= 0.01) return n.toFixed(3);
  return n.toExponential(2);
}

function fmtMassKg(kg) {
  if (kg >= 1e15) return fmt(kg / 1e12) + ' млрд т';
  if (kg >= 1e12) return fmt(kg / 1e9) + ' млн т';
  if (kg >= 1e9) return fmt(kg / 1e6) + ' тыс. т';
  return fmt(kg / 1e3) + ' т';
}

function rsOf(massSun) {
  return (2 * G * massSun * MSUN) / (C * C);
}

// ─── Сценарии ────────────────────────────────────────────────────────────────
const SCENARIOS = [
  {
    id: 'blackhole',
    icon: '🕳️',
    title: 'Земля у дыры',
    blurb: 'Что будет, если Землю подтянуть к чёрной дыре: приливный разрыв, замедление времени и горизонт событий.',
    params: [
      { key: 'massLog', type: 'range', label: 'Масса дыры', min: 1, max: 6.63, step: 0.01, value: 6.63, format: (v) => fmt(10 ** v, 0) + ' M☉' },
      { key: 'dist', type: 'range', label: 'Старт, радиусы Шварцшильда', min: 3, max: 40, step: 0.5, value: 18, unit: 'Rs', format: (v) => v.toFixed(1) + ' Rs' },
      { key: 'spin', type: 'range', label: 'Орбитальный момент', min: 0, max: 1, step: 0.01, value: 0.55, format: (v) => (v * 100).toFixed(0) + '%' },
      { key: 'timeScale', type: 'range', label: 'Скорость времени', min: 0.15, max: 8, step: 0.05, value: 1.2, format: (v) => v.toFixed(2) + '×' },
    ],
    async create() {
      const g = new THREE.Group();
      const hole = new THREE.Mesh(
        new THREE.SphereGeometry(2.15, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x000000 }),
      );
      const disk = new THREE.Mesh(
        new THREE.RingGeometry(2.6, 8.4, 96),
        new THREE.MeshBasicMaterial({
          map: accretionTexture(), transparent: true, side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending, depthWrite: false,
        }),
      );
      disk.rotation.x = Math.PI / 2.15;
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowSprite(0xffcc66), transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.85,
      }));
      halo.scale.set(18, 18, 1);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(2.45, 0.07, 12, 80),
        new THREE.MeshBasicMaterial({ color: 0xffe6a0 }),
      );
      ring.rotation.x = Math.PI / 2;

      const earth = await makePlanetMesh('earth', 1.85);
      const diskLight = new THREE.PointLight(0xffb060, 5.5, 80, 1.1);
      diskLight.position.set(0, 1.2, 0);
      const atmo = new THREE.Mesh(
        new THREE.SphereGeometry(earth.userData.r * 1.08, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      const earthGlow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowSprite(0x66aaff), transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0.6,
      }));
      earthGlow.scale.set(4.8, 4.8, 1);
      earth.add(atmo, earthGlow);

      const trail = makeParticles(180, 0xffaa66, 0.07);
      g.add(hole, disk, halo, ring, earth, trail.pts, diskLight);
      simRoot.add(g);

      const st = {
        theta: 0, rCoord: 12, swallowed: false, tFar: 0, tEarth: 0,
        stretch: 1, heating: 0,
      };

      function massSun(p) { return 10 ** p.massLog; }

      function place(p) {
        const M = massSun(p);
        const rs = rsOf(M);
        const r = st.rCoord * rs;
        const vis = 2.15 * Math.max(2.8, st.rCoord * 0.36);
        earth.position.set(Math.cos(st.theta) * vis, 0.55, Math.sin(st.theta) * vis);
        const tidal = (2 * G * M * MSUN * REARTH) / Math.max(r ** 3, 1);
        st.stretch = THREE.MathUtils.clamp(1 + tidal / 80, 1, 9);
        earth.scale.set(1 / Math.sqrt(st.stretch), st.stretch, 1 / Math.sqrt(st.stretch));
        earth.lookAt(0, 0, 0);
        st.heating = THREE.MathUtils.clamp((8 / st.rCoord - 0.2), 0, 1);
        atmo.material.color.setHSL(0.08 + (1 - st.heating) * 0.45, 0.85, 0.55);
        atmo.material.opacity = 0.1 + st.heating * 0.35;
        earth.material.emissive = new THREE.Color().setHSL(0.05, 0.8, 0.15 * st.heating);
        earth.material.emissiveIntensity = 0.15 + st.heating * 1.4;
        earth.visible = !st.swallowed;
        disk.rotation.z += 0.004;
        ring.rotation.z -= 0.01;
        return { rs, r, vis, tidal };
      }

      return {
        reset(p) {
          st.theta = 0.15;
          st.rCoord = p.dist;
          st.swallowed = false;
          st.tFar = 0;
          st.tEarth = 0;
          st.stretch = 1;
          trail.life.fill(0);
          earth.visible = true;
          place(p);
        },
        update(dt, p) {
          const { rs, r, vis, tidal } = place(p);
          if (st.swallowed) {
            halo.material.opacity = 0.7 + Math.sin(performance.now() * 0.004) * 0.15;
            return this.telemetry(p, { rs, r, tidal });
          }
          const step = dt * p.timeScale;
          const dilation = Math.max(0.02, Math.sqrt(Math.max(0, 1 - rs / Math.max(r, rs * 1.05))));
          st.tFar += step;
          st.tEarth += step * dilation;
          const infall = (0.55 + (1 - p.spin) * 1.6) * step * (4 / Math.max(st.rCoord, 2.2));
          st.rCoord = Math.max(0.85, st.rCoord - infall);
          st.theta += step * (0.18 + p.spin * 1.35) / Math.max(st.rCoord * 0.35, 0.4);

          const arr = trail.pos;
          for (let i = 0; i < trail.count; i++) {
            if (trail.life[i] <= 0 && Math.random() < 0.08 * p.timeScale) {
              trail.life[i] = 1;
              arr[i * 3] = earth.position.x + (Math.random() - 0.5) * 0.4;
              arr[i * 3 + 1] = earth.position.y + (Math.random() - 0.5) * st.stretch * 0.3;
              arr[i * 3 + 2] = earth.position.z + (Math.random() - 0.5) * 0.4;
            }
            if (trail.life[i] > 0) {
              trail.life[i] -= 0.012 * p.timeScale;
              arr[i * 3] *= 0.97;
              arr[i * 3 + 1] *= 0.97;
              arr[i * 3 + 2] *= 0.97;
            } else {
              arr[i * 3 + 1] = -200;
            }
          }
          trail.pts.geometry.attributes.position.needsUpdate = true;

          if (st.rCoord < 1.15 || vis < 2.4) {
            st.swallowed = true;
            earth.visible = false;
          }
          return this.telemetry(p, { rs, r, tidal, dilation });
        },
        telemetry(p, extra = {}) {
          const rs = extra.rs ?? rsOf(massSun(p));
          const r = extra.r ?? st.rCoord * rs;
          const tidal = extra.tidal ?? 0;
          const dilation = extra.dilation ?? Math.sqrt(Math.max(0.02, 1 - rs / Math.max(r, rs * 1.05)));
            const roche = Math.cbrt((2 * massSun(p) * MSUN) / MEARTH) * REARTH;
          let story;
          if (st.swallowed) {
            story = 'Земля пересекла горизонт событий. Для далёкого наблюдателя она «застывает» и краснеет, а для самой планеты падение уже завершено. Назад пути нет.';
          } else if (st.stretch > 4 || r < roche) {
            story = 'Приливные силы сильнее собственной гравитации Земли. Планету вытягивает в «спагетти» — океаны, кора и мантия срываются к дыре.';
          } else if (st.heating > 0.45) {
            story = 'Земля близко к аккреционному диску: атмосфера раскаляется, магнитное поле не спасает от жёсткого излучения. Часы на поверхности уже сильно отстают.';
          } else if (p.spin > 0.4) {
            story = 'Земля ещё держит орбиту. Чем ближе к дыре, тем сильнее гравитационное замедление времени и приливный горб океанов.';
          } else {
            story = 'Орбитального момента мало — Земля почти падает по спирали. Горизонт растёт в поле зрения, диск ослепляет.';
          }
          return {
            story,
            cells: [
              { label: 'Расстояние', value: `${fmt(r / 1000, 1)} км · ${st.rCoord.toFixed(2)} Rs`, cls: st.rCoord < 3 ? 'danger' : '' },
              { label: 'Горизонт Rs', value: `${fmt(rs / 1000, 1)} км` },
              { label: 'Замедление времени', value: dilation < 0.2 ? `${fmt(1 / dilation, 1)}× медленнее` : `${(dilation * 100).toFixed(1)}%`, cls: dilation < 0.4 ? 'warn' : 'ok' },
              { label: 'Время на Земле', value: `${st.tEarth.toFixed(1)} с` },
              { label: 'Время наблюдателя', value: `${st.tFar.toFixed(1)} с` },
              { label: 'Прилив / растяжение', value: `${st.stretch.toFixed(2)}×`, cls: st.stretch > 3 ? 'danger' : st.stretch > 1.5 ? 'warn' : '' },
              { label: 'Предел Роша', value: r < roche ? 'превышен — разрыв' : `${fmt(roche / 1000, 0)} км`, cls: r < roche ? 'danger' : 'ok', wide: true },
            ],
          };
        },
        dispose() { disposeGroup(g); simRoot.remove(g); },
      };
    },
  },
  {
    id: 'collision',
    icon: '💥',
    title: 'Столкновение',
    blurb: 'Две планеты летят навстречу. Меняйте тела, скорость и угол — получится слияние, обломки или почти рикошет.',
    params: [
      { key: 'planetA', type: 'select', label: 'Первое тело', options: PLANET_OPTS, value: 'earth' },
      { key: 'planetB', type: 'select', label: 'Второе тело', options: PLANET_OPTS, value: 'mars' },
      { key: 'speed', type: 'range', label: 'Относительная скорость', min: 2, max: 60, step: 0.5, value: 14, format: (v) => v.toFixed(1) + ' км/с' },
      { key: 'angle', type: 'range', label: 'Угол удара', min: 0, max: 35, step: 1, value: 8, format: (v) => v.toFixed(0) + '°' },
      { key: 'timeScale', type: 'range', label: 'Скорость времени', min: 0.2, max: 6, step: 0.05, value: 1, format: (v) => v.toFixed(2) + '×' },
    ],
    async create() {
      const g = new THREE.Group();
      let aMesh = null, bMesh = null;
      const debris = makeParticles(520, 0xffcc88, 0.09);
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowSprite(0xffeeaa), transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0,
      }));
      flash.scale.set(1, 1, 1);
      g.add(debris.pts, flash);
      simRoot.add(g);

      const st = {
        ax: -16, az: 0, bx: 16, bz: 0,
        vax: 0, vaz: 0, vbx: 0, vbz: 0,
        hit: false, t: 0, energyMt: 0, outcome: 'сближение',
        ids: { a: 'earth', b: 'mars' },
      };

      async function ensureBodies(p) {
        if (st.ids.a === p.planetA && st.ids.b === p.planetB && aMesh && bMesh) return;
        if (aMesh) { g.remove(aMesh); disposeGroup(aMesh); }
        if (bMesh) { g.remove(bMesh); disposeGroup(bMesh); }
        aMesh = await makePlanetMesh(p.planetA);
        bMesh = await makePlanetMesh(p.planetB);
        g.add(aMesh, bMesh);
        st.ids.a = p.planetA;
        st.ids.b = p.planetB;
      }

      function layout(p) {
        const A = PLANETS[p.planetA], B = PLANETS[p.planetB];
        const ang = p.angle * Math.PI / 180;
        const v = p.speed * 0.22;
        st.ax = -14; st.az = 0;
        st.bx = 14; st.bz = Math.sin(ang) * 7;
        const tot = A.mass + B.mass;
        st.vax = v * (B.mass / tot);
        st.vaz = 0;
        st.vbx = -v * (A.mass / tot);
        st.vbz = -Math.sin(ang) * v * 0.35;
        st.hit = false;
        st.t = 0;
        st.outcome = 'сближение';
        const mu = (A.mass * B.mass) / tot;
        st.energyMt = (0.5 * mu * (p.speed * 1000) ** 2) / 4.184e15;
        debris.life.fill(0);
        flash.material.opacity = 0;
        if (aMesh && bMesh) {
          aMesh.visible = bMesh.visible = true;
          aMesh.position.set(st.ax, 0, st.az);
          bMesh.position.set(st.bx, 0, st.bz);
        }
      }

      return {
        async reset(p) {
          await ensureBodies(p);
          layout(p);
        },
        update(dt, p) {
          const A = PLANETS[p.planetA], B = PLANETS[p.planetB];
          if (!aMesh || !bMesh) return this.telemetry(p);
          const step = dt * p.timeScale;
          aMesh.rotation.y += 0.01 * p.timeScale;
          bMesh.rotation.y -= 0.012 * p.timeScale;

          if (!st.hit) {
            st.ax += st.vax * step;
            st.az += st.vaz * step;
            st.bx += st.vbx * step;
            st.bz += st.vbz * step;
            aMesh.position.set(st.ax, 0, st.az);
            bMesh.position.set(st.bx, 0, st.bz);
            const dx = st.bx - st.ax, dz = st.bz - st.az;
            const dist = Math.hypot(dx, dz);
            const touch = aMesh.userData.r + bMesh.userData.r;
            if (dist < touch) {
              st.hit = true;
              const ratio = A.mass / B.mass;
              st.outcome = ratio > 8 || 1 / ratio > 8
                ? 'крупное тело пережило удар'
                : p.speed > 28 ? 'катастрофическое разрушение' : 'слияние / частично расплавленный остаток';
              const mid = new THREE.Vector3((st.ax + st.bx) / 2, 0, (st.az + st.bz) / 2);
              flash.position.copy(mid);
              flash.scale.set(12, 12, 1);
              flash.material.opacity = 1;
              for (let i = 0; i < debris.count; i++) {
                debris.life[i] = 0.6 + Math.random() * 0.8;
                debris.pos[i * 3] = mid.x;
                debris.pos[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
                debris.pos[i * 3 + 2] = mid.z;
                const s = 1.5 + Math.random() * 6;
                const th = Math.random() * Math.PI * 2;
                const ph = (Math.random() - 0.5) * 1.2;
                debris.vel[i].set(Math.cos(th) * s, Math.sin(ph) * s, Math.sin(th) * s);
              }
              if (A.mass > B.mass * 6) { bMesh.visible = false; }
              else if (B.mass > A.mass * 6) { aMesh.visible = false; }
              else if (p.speed > 28) { aMesh.visible = bMesh.visible = false; }
              else {
                aMesh.position.copy(mid);
                bMesh.visible = false;
                aMesh.scale.setScalar(1.15);
              }
            }
          } else {
            st.t += step;
            flash.material.opacity = Math.max(0, 1 - st.t * 1.4);
            flash.scale.multiplyScalar(1 + step * 0.8);
            for (let i = 0; i < debris.count; i++) {
              if (debris.life[i] <= 0) continue;
              debris.life[i] -= step * 0.25;
              debris.pos[i * 3] += debris.vel[i].x * step;
              debris.pos[i * 3 + 1] += debris.vel[i].y * step;
              debris.pos[i * 3 + 2] += debris.vel[i].z * step;
              debris.vel[i].multiplyScalar(0.992);
            }
            debris.pts.geometry.attributes.position.needsUpdate = true;
            debris.pts.material.opacity = Math.max(0.15, 0.95 - st.t * 0.15);
          }
          return this.telemetry(p);
        },
        telemetry(p) {
          const A = PLANETS[p.planetA], B = PLANETS[p.planetB];
          const story = !st.hit
            ? `${A.name} и ${B.name} сближаются на ${p.speed.toFixed(1)} км/с. Удар под углом ${p.angle}° — кинетическая энергия уже сравнима с глобальной катастрофой.`
            : st.outcome === 'катастрофическое разрушение'
              ? 'Слишком быстро: обе коры испарились, осталось облако расплавленных обломков. Так, вероятно, когда-то родилась Луна — после удара Тейи.'
              : st.outcome === 'крупное тело пережило удар'
                ? 'Маленькое тело уничтожено. У гиганта — раскалённый шрам, атмосфера вскипела, на орбите кольцо обломков.'
                : 'Планеты слиплись в раскалённый мир. Океаны выкипели бы за часы, поверхность — магма на тысячи лет.';
          return {
            story,
            cells: [
              { label: 'Тела', value: `${A.name} + ${B.name}`, wide: true },
              { label: 'Энергия удара', value: `${fmt(st.energyMt, 1)} Мт ТНТ`, cls: st.energyMt > 1e8 ? 'danger' : 'warn' },
              { label: 'Скорость', value: `${p.speed.toFixed(1)} км/с` },
              { label: 'Массы', value: `${fmt(A.mass / MEARTH, 2)} / ${fmt(B.mass / MEARTH, 2)} M⊕` },
              { label: 'Исход', value: st.outcome, cls: st.hit ? 'danger' : 'ok', wide: true },
            ],
          };
        },
        dispose() { disposeGroup(g); simRoot.remove(g); },
      };
    },
  },
  {
    id: 'asteroid',
    icon: '☄️',
    title: 'Астероид',
    blurb: 'Камень или железо летит в Землю. Диаметр и скорость решают, будет ли это Челябинск, Чиксулуб или конец цивилизации.',
    params: [
      { key: 'size', type: 'range', label: 'Диаметр', min: 0.02, max: 20, step: 0.02, value: 1.2, format: (v) => (v < 1 ? (v * 1000).toFixed(0) + ' м' : v.toFixed(2) + ' км') },
      { key: 'speed', type: 'range', label: 'Скорость входа', min: 11, max: 72, step: 0.5, value: 20, format: (v) => v.toFixed(1) + ' км/с' },
      { key: 'density', type: 'range', label: 'Плотность', min: 1500, max: 8000, step: 100, value: 3000, format: (v) => v + ' кг/м³' },
      { key: 'angle', type: 'range', label: 'Угол к горизонту', min: 15, max: 90, step: 1, value: 45, format: (v) => v + '°' },
      { key: 'timeScale', type: 'range', label: 'Скорость времени', min: 0.2, max: 8, step: 0.05, value: 1.4, format: (v) => v.toFixed(2) + '×' },
    ],
    async create() {
      const g = new THREE.Group();
      const earth = await makePlanetMesh('earth', 1.35);
      const rockGeo = new THREE.IcosahedronGeometry(0.22, 1);
      const pos = rockGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const v = new THREE.Vector3().fromBufferAttribute(pos, i);
        v.multiplyScalar(0.75 + Math.random() * 0.45);
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      rockGeo.computeVertexNormals();
      const rock = new THREE.Mesh(
        rockGeo,
        new THREE.MeshStandardMaterial({ color: 0x6a5a4a, roughness: 0.95, flatShading: true }),
      );
      const trail = makeParticles(160, 0xff8844, 0.06);
      const ejecta = makeParticles(380, 0xffcc77, 0.08);
      const flash = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowSprite(0xffee88), transparent: true, blending: THREE.AdditiveBlending,
        depthWrite: false, opacity: 0,
      }));
      const shock = new THREE.Mesh(
        new THREE.RingGeometry(1.2, 1.28, 64),
        new THREE.MeshBasicMaterial({ color: 0xffaa55, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }),
      );
      shock.rotation.x = -0.6;
      g.add(earth, rock, trail.pts, ejecta.pts, flash, shock);
      simRoot.add(g);

      const st = { t: 0, hit: false, crater: 0, energyMt: 0, u: 0 };

      function energy(p) {
        const r = (p.size * 500);
        const m = (4 / 3) * Math.PI * r ** 3 * p.density;
        return { m, eJ: 0.5 * m * (p.speed * 1000) ** 2 };
      }

      function placeRock(p) {
        const ang = p.angle * Math.PI / 180;
        const dist = 14 - st.u * 12.2;
        rock.position.set(Math.cos(ang) * dist, Math.sin(ang) * dist * 0.55, -dist * 0.15);
        rock.scale.setScalar(0.35 + Math.log10(p.size + 0.05) * 0.55);
        rock.rotation.x += 0.04;
        rock.rotation.y += 0.03;
      }

      return {
        reset(p) {
          st.t = 0; st.hit = false; st.u = 0;
          const { eJ } = energy(p);
          st.energyMt = eJ / 4.184e15;
          st.crater = Math.min(1800, 1.8 * p.size * Math.pow(p.speed / 20, 0.56) * 12);
          rock.visible = true;
          flash.material.opacity = 0;
          shock.material.opacity = 0;
          trail.life.fill(0);
          ejecta.life.fill(0);
          earth.material.emissiveIntensity = 0.12;
          placeRock(p);
        },
        update(dt, p) {
          const step = dt * p.timeScale;
          earth.rotation.y += 0.004 * p.timeScale;
          if (!st.hit) {
            st.u = Math.min(1, st.u + step * 0.22);
            placeRock(p);
            for (let i = 0; i < trail.count; i++) {
              if (Math.random() < 0.4) {
                trail.pos[i * 3] = rock.position.x + (Math.random() - 0.5) * 0.2;
                trail.pos[i * 3 + 1] = rock.position.y + (Math.random() - 0.5) * 0.2;
                trail.pos[i * 3 + 2] = rock.position.z + (Math.random() - 0.5) * 0.2;
              }
            }
            trail.pts.geometry.attributes.position.needsUpdate = true;
            if (st.u >= 1) {
              st.hit = true;
              rock.visible = false;
              flash.position.copy(rock.position).multiplyScalar(0.35);
              flash.position.set(0.9, 0.55, 0.2);
              flash.material.opacity = 1;
              shock.position.copy(flash.position);
              for (let i = 0; i < ejecta.count; i++) {
                ejecta.life[i] = 1;
                ejecta.pos[i * 3] = flash.position.x;
                ejecta.pos[i * 3 + 1] = flash.position.y;
                ejecta.pos[i * 3 + 2] = flash.position.z;
                const th = Math.random() * Math.PI * 2;
                const s = 1 + Math.random() * 5;
                ejecta.vel[i].set(Math.cos(th) * s, 1 + Math.random() * 4, Math.sin(th) * s);
              }
            }
          } else {
            st.t += step;
            flash.material.opacity = Math.max(0, 1 - st.t * 1.1);
            flash.scale.setScalar(4 + st.t * 18);
            shock.scale.setScalar(1 + st.t * 6);
            shock.material.opacity = Math.max(0, 0.7 - st.t * 0.35);
            earth.material.emissive = new THREE.Color(0xff6622);
            earth.material.emissiveIntensity = Math.max(0.12, 1.6 - st.t);
            for (let i = 0; i < ejecta.count; i++) {
              if (ejecta.life[i] <= 0) continue;
              ejecta.life[i] -= step * 0.3;
              ejecta.vel[i].y -= 2.2 * step;
              ejecta.pos[i * 3] += ejecta.vel[i].x * step;
              ejecta.pos[i * 3 + 1] += ejecta.vel[i].y * step;
              ejecta.pos[i * 3 + 2] += ejecta.vel[i].z * step;
            }
            ejecta.pts.geometry.attributes.position.needsUpdate = true;
          }
          return this.telemetry(p);
        },
        telemetry(p) {
          const { m, eJ } = energy(p);
          st.energyMt = eJ / 4.184e15;
          let story;
          if (st.energyMt < 0.5) story = 'Вспышка в атмосфере, стёкла в радиусе десятков километров. Масштаб Челябинска 2013 года.';
          else if (st.energyMt < 1e5) story = 'Региональная катастрофа: ударная волна, пожары, цунами у берега. Климат Земли в целом выдержит.';
          else if (st.energyMt < 1e8) story = 'Как Чиксулуб: пыль на годы, коллапс пищевых цепей. Цивилизация в привычном виде не выживет.';
          else story = 'Глобальное испарение коры в районе удара, стерилизация поверхности. Земля на время станет расплавленным шаром.';
          if (!st.hit) story = `Астероид массой ${fmtMassKg(m)} входит под ${p.angle}°. ` + story;
          else story = 'Удар. ' + story;
          return {
            story,
            cells: [
              { label: 'Масса', value: fmtMassKg(m) },
              { label: 'Энергия', value: `${fmt(st.energyMt, 1)} Мт`, cls: st.energyMt > 1e5 ? 'danger' : 'warn' },
              { label: 'Кратер (оценка)', value: `${fmt(st.crater, 1)} км` },
              { label: 'Скорость', value: `${p.speed.toFixed(1)} км/с` },
              { label: 'Статус', value: st.hit ? 'столкновение' : 'сближение', cls: st.hit ? 'danger' : 'ok', wide: true },
            ],
          };
        },
        dispose() { disposeGroup(g); simRoot.remove(g); },
      };
    },
  },
  {
    id: 'supernova',
    icon: '🌟',
    title: 'Сверхновая',
    blurb: 'Рядом взрывается звезда. Меняйте массу и расстояние до Земли — от северного сияния до стерилизации планеты.',
    params: [
      { key: 'mass', type: 'range', label: 'Масса звезды', min: 8, max: 40, step: 0.5, value: 15, format: (v) => v.toFixed(1) + ' M☉' },
      { key: 'distLy', type: 'range', label: 'Расстояние', min: 8, max: 200, step: 1, value: 50, format: (v) => v + ' св. лет' },
      { key: 'timeScale', type: 'range', label: 'Скорость времени', min: 0.2, max: 6, step: 0.05, value: 1, format: (v) => v.toFixed(2) + '×' },
    ],
    async create() {
      const g = new THREE.Group();
      const star = new THREE.Mesh(
        new THREE.SphereGeometry(2.4, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0xffdd88 }),
      );
      const corona = new THREE.Mesh(
        new THREE.SphereGeometry(3.3, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 0.18, depthWrite: false }),
      );
      const blast = new THREE.Mesh(
        new THREE.SphereGeometry(1, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0xffeecc, transparent: true, opacity: 0, depthWrite: false, side: THREE.BackSide }),
      );
      const remnant = new THREE.Mesh(
        new THREE.SphereGeometry(0.35, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0xaaccff }),
      );
      remnant.visible = false;
      const earth = await makePlanetMesh('earth', 0.7);
      const spray = makeParticles(400, 0xffcc88, 0.1);
      g.add(star, corona, blast, remnant, earth, spray.pts);
      simRoot.add(g);

      const st = { phase: 0, t: 0 };

      function energy(p) {
        const ly = p.distLy * 9.4607e15;
        const E = 1e44 * (p.mass / 15);
        const flux = E / (4 * Math.PI * ly * ly);
        return { E, flux, lethal: flux > 1e7, ozone: flux > 2e5 };
      }

      return {
        reset(p) {
          st.phase = 0; st.t = 0;
          star.visible = true;
          remnant.visible = false;
          blast.scale.setScalar(1);
          blast.material.opacity = 0;
          spray.life.fill(0);
          earth.position.set(8 + p.distLy * 0.04, 0, 0);
          earth.material.emissiveIntensity = 0.12;
        },
        update(dt, p) {
          const step = dt * p.timeScale;
          st.t += step;
          earth.position.set(8 + p.distLy * 0.04, 0, 0);
          earth.rotation.y += 0.01;
          if (st.phase === 0) {
            const swell = 1 + Math.min(1.8, st.t * 0.55);
            star.scale.setScalar(swell);
            corona.scale.setScalar(swell);
            star.material.color.setHSL(0.08 - st.t * 0.01, 0.85, 0.6);
            if (st.t > 3.2) { st.phase = 1; st.t = 0; }
          } else if (st.phase === 1) {
            star.scale.setScalar(Math.max(0.2, 2.6 - st.t * 4));
            if (st.t > 0.55) {
              st.phase = 2; st.t = 0;
              star.visible = false;
              remnant.visible = p.mass >= 20;
              remnant.material.color.set(p.mass >= 25 ? 0x000000 : 0xaaccff);
              for (let i = 0; i < spray.count; i++) {
                spray.life[i] = 1;
                const th = Math.random() * Math.PI * 2;
                const ph = Math.acos(2 * Math.random() - 1);
                const s = 3 + Math.random() * 10;
                spray.pos[i * 3] = 0; spray.pos[i * 3 + 1] = 0; spray.pos[i * 3 + 2] = 0;
                spray.vel[i].set(Math.sin(ph) * Math.cos(th) * s, Math.cos(ph) * s, Math.sin(ph) * Math.sin(th) * s);
              }
            }
          } else {
            blast.scale.setScalar(1 + st.t * 9);
            blast.material.opacity = Math.max(0, 0.55 - st.t * 0.12);
            remnant.rotation.y += 0.2;
            for (let i = 0; i < spray.count; i++) {
              spray.pos[i * 3] += spray.vel[i].x * step;
              spray.pos[i * 3 + 1] += spray.vel[i].y * step;
              spray.pos[i * 3 + 2] += spray.vel[i].z * step;
            }
            spray.pts.geometry.attributes.position.needsUpdate = true;
            const hit = st.t > p.distLy * 0.012;
            if (hit) {
              const { lethal, ozone } = energy(p);
              earth.material.emissive = new THREE.Color(lethal ? 0xff3300 : ozone ? 0xffaa44 : 0x66ffaa);
              earth.material.emissiveIntensity = lethal ? 1.8 : ozone ? 0.8 : 0.35;
            }
          }
          return this.telemetry(p);
        },
        telemetry(p) {
          const { lethal, ozone } = energy(p);
          const remnantName = p.mass >= 25 ? 'чёрная дыра' : 'нейтронная звезда';
          let story;
          if (st.phase === 0) story = `Звезда ${p.mass.toFixed(1)} M☉ раздувается. Ядро жжёт всё более тяжёлые элементы — до железа, после которого гореть нечем.`;
          else if (st.phase === 1) story = 'Ядро схлопывается за доли секунды. Снаружи звезда ещё «жива», внутри уже коллапс.';
          else if (lethal) story = `Удар гамма и космических лучей стерилизует дневную сторону. На ${p.distLy} св. лет это смертельно. Остаток — ${remnantName}.`;
          else if (ozone) story = `Озоновый слой Земли разрушен. УФ бьёт по поверхности годами, пищевые цепи падают. Остаток — ${remnantName}.`;
          else story = `На ${p.distLy} св. лет вспышка ослепительна, полярные сияния до экватора, но биосфера в целом выживет. Остаток — ${remnantName}.`;
          return {
            story,
            cells: [
              { label: 'Фаза', value: st.phase === 0 ? 'предсверхновая' : st.phase === 1 ? 'коллапс' : 'взрыв', cls: st.phase === 2 ? 'danger' : 'warn' },
              { label: 'Расстояние', value: `${p.distLy} св. лет` },
              { label: 'Остаток', value: remnantName },
              { label: 'Для Земли', value: lethal ? 'стерилизация' : ozone ? 'коллапс озона' : 'сильная вспышка', cls: lethal ? 'danger' : ozone ? 'warn' : 'ok' },
              { label: 'Безопасный порог', value: 'обычно ≳ 50–100 св. лет', wide: true },
            ],
          };
        },
        dispose() { disposeGroup(g); simRoot.remove(g); },
      };
    },
  },
  {
    id: 'roche',
    icon: '🌙',
    title: 'Луна слишком близко',
    blurb: 'Подносите Луну к Земле. Приливы растут, затем спутник рвётся на кольцо — предел Роша.',
    params: [
      { key: 'dist', type: 'range', label: 'Расстояние', min: 8000, max: 384000, step: 1000, value: 120000, format: (v) => fmt(v, 0) + ' км' },
      { key: 'timeScale', type: 'range', label: 'Скорость времени', min: 0.2, max: 8, step: 0.05, value: 1.2, format: (v) => v.toFixed(2) + '×' },
    ],
    async create() {
      const g = new THREE.Group();
      const earth = await makePlanetMesh('earth', 1.2);
      const moon = await makePlanetMesh('moon', 1.1);
      const ringPts = makeParticles(420, 0xccbbaa, 0.05);
      const bulge = new THREE.Mesh(
        new THREE.SphereGeometry(earth.userData.r * 1.02, 32, 32),
        new THREE.MeshBasicMaterial({ color: 0x3377ff, transparent: true, opacity: 0.15, depthWrite: false }),
      );
      g.add(earth, moon, ringPts.pts, bulge);
      simRoot.add(g);

      const rocheKm = 2.44 * 6371 * Math.pow(5514 / 3344, 1 / 3);
      const st = { theta: 0, broken: false };

      function visDist(km) {
        return 3.4 + (km / 384000) * 11;
      }

      return {
        reset() {
          st.theta = 0.2;
          st.broken = false;
          moon.visible = true;
          ringPts.life.fill(0);
        },
        update(dt, p) {
          const step = dt * p.timeScale;
          st.theta += step * (80 / Math.max(p.dist, 8000)) * 8;
          const d = visDist(p.dist);
          const tide = THREE.MathUtils.clamp(384000 / p.dist, 1, 18);
          earth.scale.set(1 + tide * 0.012, 1 - tide * 0.006, 1 + tide * 0.012);
          earth.rotation.y += 0.006;
          bulge.scale.set(1 + tide * 0.04, 1, 1 + tide * 0.04);
          bulge.lookAt(moon.position);
          if (p.dist < rocheKm) {
            st.broken = true;
            moon.visible = false;
            for (let i = 0; i < ringPts.count; i++) {
              const a = (i / ringPts.count) * Math.PI * 2 + st.theta * 0.2;
              const rr = d * (0.85 + (i % 7) * 0.04);
              ringPts.pos[i * 3] = Math.cos(a) * rr;
              ringPts.pos[i * 3 + 1] = Math.sin(i * 1.7) * 0.12;
              ringPts.pos[i * 3 + 2] = Math.sin(a) * rr;
            }
            ringPts.pts.geometry.attributes.position.needsUpdate = true;
            ringPts.pts.visible = true;
          } else {
            st.broken = false;
            moon.visible = true;
            moon.position.set(Math.cos(st.theta) * d, 0.2, Math.sin(st.theta) * d);
            ringPts.pts.visible = false;
          }
          return this.telemetry(p, tide);
        },
        telemetry(p, tide = 1) {
          const tideM = 0.5 * (384000 / p.dist) ** 3;
          const story = st.broken
            ? `Луна пересекла предел Роша (~${fmt(rocheKm, 0)} км). Приливы Земли разорвали её в кольцо обломков — как у Сатурна, только из лунного камня.`
            : p.dist < 50000
              ? `Приливные волны высотой сотни метров. Землетрясения не стихают, сутки замедляются сильнее.`
              : `Луна ближе обычного (${fmt(p.dist, 0)} км вместо 384 000). Океаны ходят огромным горбом, затмения стали обыденностью.`;
          return {
            story,
            cells: [
              { label: 'Дистанция', value: `${fmt(p.dist, 0)} км`, cls: p.dist < rocheKm ? 'danger' : '' },
              { label: 'Предел Роша', value: `${fmt(rocheKm, 0)} км` },
              { label: 'Прилив (оценка)', value: `${fmt(tideM, 1)} м`, cls: tideM > 20 ? 'warn' : 'ok' },
              { label: 'Состояние Луны', value: st.broken ? 'разорвана в кольцо' : 'цела', cls: st.broken ? 'danger' : 'ok' },
              { label: 'Сейчас', value: '≈ 384 000 км · прилив ~0,5 м', wide: true },
            ],
          };
        },
        dispose() { disposeGroup(g); simRoot.remove(g); },
      };
    },
  },
];

// ─── Состояние приложения ────────────────────────────────────────────────────
const cam = { az: 0.7, el: 0.38, dist: 32, taz: 0.7, tel: 0.38, tdist: 32 };
let dragging = false, lastX = 0, lastY = 0;
let playing = false;
let currentId = 'blackhole';
let runner = null;
let params = {};
let lastStory = null;

function applyCam() {
  cam.az += (cam.taz - cam.az) * 0.1;
  cam.el += (cam.tel - cam.el) * 0.1;
  cam.dist += (cam.tdist - cam.dist) * 0.1;
  const x = Math.sin(cam.az) * Math.cos(cam.el) * cam.dist;
  const y = Math.sin(cam.el) * cam.dist;
  const z = Math.cos(cam.az) * Math.cos(cam.el) * cam.dist;
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

canvas.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; });
window.addEventListener('pointerup', () => { dragging = false; });
window.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  cam.taz -= (e.clientX - lastX) * 0.005;
  cam.tel = THREE.MathUtils.clamp(cam.tel + (e.clientY - lastY) * 0.005, -1.2, 1.25);
  lastX = e.clientX; lastY = e.clientY;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.tdist = THREE.MathUtils.clamp(cam.tdist * (1 + e.deltaY * 0.0012), 8, 90);
}, { passive: false });

function scenarioById(id) {
  return SCENARIOS.find((s) => s.id === id);
}

function defaultParams(sc) {
  const o = {};
  for (const p of sc.params) o[p.key] = p.value;
  return o;
}

function renderTabs() {
  tabsEl.innerHTML = '';
  for (const s of SCENARIOS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sc-tab' + (s.id === currentId ? ' active' : '');
    b.innerHTML = `<span class="ico">${s.icon}</span><span class="ttl">${s.title}</span>`;
    b.addEventListener('click', () => switchScenario(s.id));
    tabsEl.appendChild(b);
  }
}

function renderParams(sc) {
  paramList.innerHTML = '';
  for (const p of sc.params) {
    const wrap = document.createElement('div');
    wrap.className = 'param';
    const head = document.createElement('div');
    head.className = 'param-head';
    const lab = document.createElement('label');
    lab.textContent = p.label;
    const val = document.createElement('b');
    val.dataset.key = p.key;
    head.append(lab, val);
    wrap.appendChild(head);
    if (p.type === 'select') {
      const sel = document.createElement('select');
      for (const opt of p.options) {
        const o = document.createElement('option');
        o.value = opt.id;
        o.textContent = opt.label;
        if (opt.id === params[p.key]) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => {
        params[p.key] = sel.value;
        restartQuiet();
      });
      wrap.appendChild(sel);
      val.textContent = PLANETS[params[p.key]]?.name || params[p.key];
    } else {
      const input = document.createElement('input');
      input.type = 'range';
      input.min = p.min; input.max = p.max; input.step = p.step;
      input.value = params[p.key];
      const paint = () => {
        params[p.key] = Number(input.value);
        val.textContent = p.format ? p.format(params[p.key]) : String(params[p.key]);
      };
      input.addEventListener('input', () => {
        paint();
        if (!playing) runner?.reset?.(params);
        lastStory = runner?.telemetry?.(params) || lastStory;
        drawReadout(lastStory);
      });
      wrap.appendChild(input);
      paint();
    }
    paramList.appendChild(wrap);
  }
}

function drawReadout(info) {
  if (!info) return;
  storyEl.textContent = info.story;
  gridEl.innerHTML = info.cells.map((c) => `
    <div class="cell ${c.wide ? 'wide' : ''} ${c.cls || ''}">
      <span>${c.label}</span><b>${c.value}</b>
    </div>
  `).join('');
}

function setPlaying(on) {
  playing = on;
  playBtn.textContent = on ? '⏸ Пауза' : '▶ Запуск';
  playBtn.classList.toggle('playing', on);
  badgeEl.textContent = on ? 'Идёт симуляция' : 'Пауза / настройка';
  badgeEl.className = on ? 'locked' : '';
}

async function restartQuiet() {
  if (!runner?.reset) return;
  await runner.reset(params);
  lastStory = runner.telemetry?.(params);
  drawReadout(lastStory);
}

async function switchScenario(id) {
  const sc = scenarioById(id);
  currentId = id;
  params = defaultParams(sc);
  descEl.textContent = sc.blurb;
  statusEl.textContent = sc.title;
  renderTabs();
  renderParams(sc);
  setPlaying(false);
  if (runner) runner.dispose();
  runner = null;
  lastStory = { story: 'Загружаем сцену…', cells: [] };
  drawReadout(lastStory);
  runner = await sc.create();
  await runner.reset(params);
  lastStory = runner.telemetry?.(params);
  drawReadout(lastStory);
  cam.taz = 0; cam.tel = 0.28; cam.tdist = id === 'blackhole' ? 28 : 34;
  cam.az = cam.taz; cam.el = cam.tel; cam.dist = cam.tdist;
}

playBtn.addEventListener('click', () => setPlaying(!playing));
resetBtn.addEventListener('click', () => {
  setPlaying(false);
  restartQuiet();
});
window.addEventListener('keydown', (e) => {
  if (e.target.matches('input, select, textarea')) return;
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  if (e.code === 'KeyR') { setPlaying(false); restartQuiet(); }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  applyCam();
  if (runner) {
    const info = playing ? runner.update(dt, params) : lastStory;
    if (info) { lastStory = info; drawReadout(info); }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

(async function init() {
  renderTabs();
  await switchScenario('blackhole');
  loadingEl.classList.add('hidden');
  requestAnimationFrame(loop);
})();
