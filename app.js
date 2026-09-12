import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
import { createPlanet } from './planets.js';

// ─── DOM ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('scene');
const video = document.getElementById('webcam');
const handCanvas = document.getElementById('hand-overlay');
const handCtx = handCanvas.getContext('2d');
const statusEl = document.getElementById('status');
const planetNameEl = document.getElementById('planet-name');
const startBtn = document.getElementById('start-btn');
const loadingEl = document.getElementById('loading');
const crosshair = document.getElementById('crosshair');
const uiPanel = document.getElementById('ui');
const bento = document.getElementById('bento');
const peaceBar = document.getElementById('peace-bar');
const peaceFill = document.getElementById('peace-fill');
const peaceLabel = document.getElementById('peace-label');
const versionTag = document.getElementById('version-tag');
const modeBadge = document.getElementById('mode-badge');

const TEX = 'https://www.solarsystemscope.com/textures/download';

// ─── Данные планет ──────────────────────────────────────────────────────────
const PLANETS = [
  {
    name: 'Солнце', radius: 4, orbit: 0, speed: 0, glow: true,
    texture: `${TEX}/2k_sun.jpg`,
    info: {
      type: 'Звезда (G2V)',
      desc: 'Центральная звезда системы. Содержит 99,86% массы Солнечной системы. Температура поверхности ~5 500 °C.',
      diameter: '1 392 700 км', distance: '0 км', moons: '—', day: '25–35 суток', year: '—',
    },
  },
  {
    name: 'Меркурий', radius: 0.4, orbit: 10, speed: 4.15,
    texture: `${TEX}/2k_mercury.jpg`,
    info: {
      type: 'Каменистая планета',
      desc: 'Ближайшая к Солнцу планета. Нет атмосферы, экстремальные перепады температур: от −180 до +430 °C.',
      diameter: '4 879 км', distance: '57,9 млн км', moons: '0', day: '59 земных суток', year: '88 суток',
    },
  },
  {
    name: 'Венера', radius: 0.7, orbit: 14, speed: 1.62,
    texture: `${TEX}/2k_venus_surface.jpg`,
    info: {
      type: 'Каменистая планета',
      desc: 'Самая горячая планета из-за парникового эффекта. Плотная атмосфера из CO₂, давление в 92 раза выше земного.',
      diameter: '12 104 км', distance: '108,2 млн км', moons: '0', day: '243 суток', year: '225 суток',
    },
  },
  {
    name: 'Земля', radius: 0.75, orbit: 18, speed: 1.0,
    texture: `${TEX}/2k_earth_daymap.jpg`,
    info: {
      type: 'Каменистая планета',
      desc: 'Единственная известная планета с жизнью. 71% поверхности покрыто водой. Магнитное поле защищает от солнечного ветра.',
      diameter: '12 742 км', distance: '149,6 млн км', moons: '1 (Луна)', day: '24 часа', year: '365,25 суток',
    },
  },
  {
    name: 'Марс', radius: 0.5, orbit: 22, speed: 0.53,
    texture: `${TEX}/2k_mars.jpg`,
    info: {
      type: 'Каменистая планета',
      desc: '«Красная планета» из-за оксида железа. Имеет крупнейший вулкан Солнечной системы — Олимп (21 км высотой).',
      diameter: '6 779 км', distance: '227,9 млн км', moons: '2 (Фобос, Деймос)', day: '24,6 часа', year: '687 суток',
    },
  },
  {
    name: 'Юпитер', radius: 2.2, orbit: 32, speed: 0.084,
    texture: `${TEX}/2k_jupiter.jpg`,
    info: {
      type: 'Газовый гигант',
      desc: 'Крупнейшая планета системы. Большое красное пятно — шторм, бушующий более 300 лет.',
      diameter: '139 820 км', distance: '778,5 млн км', moons: '95+', day: '9,9 часа', year: '11,9 лет',
    },
  },
  {
    name: 'Сатурн', radius: 1.8, orbit: 42, speed: 0.034, ring: true,
    texture: `${TEX}/2k_saturn.jpg`,
    ringTexture: `${TEX}/2k_saturn_ring_alpha.png`,
    info: {
      type: 'Газовый гигант',
      desc: 'Известен кольцами из льда и камня. Плотность меньше воды — Saturn мог бы плавать в гигантской ванне.',
      diameter: '116 460 км', distance: '1,43 млрд км', moons: '146+', day: '10,7 часа', year: '29,5 лет',
    },
  },
  {
    name: 'Уран', radius: 1.2, orbit: 52, speed: 0.012,
    texture: `${TEX}/2k_uranus.jpg`,
    info: {
      type: 'Ледяной гигант',
      desc: 'Вращается «лёжа на боку» — наклон оси 98°. Атмосфера содержит метан, придающий голубой цвет.',
      diameter: '50 724 км', distance: '2,87 млрд км', moons: '28', day: '17,2 часа', year: '84 года',
    },
  },
  {
    name: 'Нептун', radius: 1.1, orbit: 62, speed: 0.006,
    texture: `${TEX}/2k_neptune.jpg`,
    info: {
      type: 'Ледяной гигант',
      desc: 'Самые сильные ветра в Солнечной системе — до 2 100 км/ч. Открыт математически до телескопического наблюдения.',
      diameter: '49 244 км', distance: '4,5 млрд км', moons: '16', day: '16,1 часа', year: '165 лет',
    },
  },
];

// ─── Состояния приложения ───────────────────────────────────────────────────
const APP_VERSION = 'v12';
const PLANET_IDS = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const State = { SYSTEM: 'system', LOCKED: 'locked', INFO: 'info' };
let appState = State.SYSTEM;
let handActive = false;

// ─── Three.js ───────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 25, 70);

scene.add(new THREE.AmbientLight(0x2a3550, 0.55));
scene.add(new THREE.HemisphereLight(0x9aafd0, 0x0a0a16, 0.42));

const sunLight = new THREE.PointLight(0xfff4d6, 10, 480, 0.4);
scene.add(sunLight);

// Звёзды
const starGeo = new THREE.BufferGeometry();
const positions = new Float32Array(3000 * 3);
for (let i = 0; i < positions.length; i++) positions[i] = (Math.random() - 0.5) * 400;
starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 })));

const planetMeshes = [];
const highlightRings = [];
const _sunDir = new THREE.Vector3();
let earthMoon = null;

async function createPlanets() {
  for (let i = 0; i < PLANETS.length; i++) {
    const p = PLANETS[i];
    const body = await createPlanet(PLANET_IDS[i], { radius: p.radius });
    const mesh = body.mesh;
    mesh.userData.planetIndex = i;
    mesh.userData.angle = Math.random() * Math.PI * 2;

    const hlGeo = new THREE.RingGeometry(p.radius * 1.15, p.radius * 1.25, 48);
    const hlMat = new THREE.MeshBasicMaterial({
      color: 0xffcc00, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    const hl = new THREE.Mesh(hlGeo, hlMat);
    hl.rotation.x = Math.PI / 2;
    mesh.add(hl);
    highlightRings.push(hl);

    scene.add(mesh);
    planetMeshes.push(mesh);

    if (PLANET_IDS[i] === 'earth') {
      const moon = await createPlanet('moon', { radius: 0.2 });
      earthMoon = { mesh: moon.mesh, angle: 0.6, dist: 1.9 };
      scene.add(moon.mesh);
    }

    if (p.orbit > 0) {
      const pts = [];
      for (let a = 0; a <= 64; a++) {
        const t = (a / 64) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(t) * p.orbit, 0, Math.sin(t) * p.orbit));
      }
      scene.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0x334466, transparent: true, opacity: 0.35 })
      ));
    }
  }
}

// ─── Камера ───────────────────────────────────────────────────────────────────
const camState = {
  azimuth: 0, elevation: 0.4, distance: 70,
  targetAzimuth: 0, targetElevation: 0.4, targetDistance: 70,
  flying: false, flyProgress: 0,
  flyFrom: new THREE.Vector3(), flyTo: new THREE.Vector3(), flyLookAt: new THREE.Vector3(),
  lockedPlanet: -1,
  lockOffset: new THREE.Vector3(),
  savedOrbit: { azimuth: 0, elevation: 0.4, distance: 70 },
};

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function updateCameraPosition() {
  if (camState.flying) {
    camState.flyProgress = Math.min(1, camState.flyProgress + 0.018);
    const t = easeInOutCubic(camState.flyProgress);
    camera.position.lerpVectors(camState.flyFrom, camState.flyTo, t);
    camera.lookAt(camState.flyLookAt);
    if (camState.flyProgress >= 1) {
      camState.flying = false;
      if (appState === State.LOCKED || appState === State.INFO) {
        camState.lockOffset.copy(camera.position).sub(planetMeshes[camState.lockedPlanet].position);
      }
    }
    return;
  }

  if (appState === State.LOCKED || appState === State.INFO) {
    const planet = planetMeshes[camState.lockedPlanet];
    if (planet) {
      camera.position.copy(planet.position).add(camState.lockOffset);
      camera.lookAt(planet.position);
    }
    return;
  }

  camState.azimuth += (camState.targetAzimuth - camState.azimuth) * 0.08;
  camState.elevation += (camState.targetElevation - camState.elevation) * 0.08;
  camState.distance += (camState.targetDistance - camState.distance) * 0.08;

  const x = Math.sin(camState.azimuth) * Math.cos(camState.elevation) * camState.distance;
  const y = Math.sin(camState.elevation) * camState.distance;
  const z = Math.cos(camState.azimuth) * Math.cos(camState.elevation) * camState.distance;
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);
}

function flyToPlanet(index, keepInfo = false) {
  const p = PLANETS[index];
  const mesh = planetMeshes[index];
  const pos = mesh.position.clone();
  const offset = Math.max(p.radius * 2.2 + 2, 4);

  camState.flyFrom.copy(camera.position);
  const dir = camera.position.clone().sub(pos);
  if (dir.length() < 0.01) dir.set(0, 0.4, 1);
  dir.normalize();
  camState.flyTo.copy(pos).add(dir.multiplyScalar(offset));
  camState.flyLookAt.copy(pos);
  camState.flying = true;
  camState.flyProgress = 0;
  camState.lockedPlanet = index;
  planetNameEl.textContent = `Планета: ${p.name}`;
  setMode(keepInfo ? State.INFO : State.LOCKED);
}

function returnToSystem() {
  closeBento();
  camState.lockedPlanet = -1;
  aim.stickyPlanet = -1;
  pinchFrames = 0;

  camState.flyFrom.copy(camera.position);
  const s = camState.savedOrbit;
  camState.flyTo.set(
    Math.sin(s.azimuth) * Math.cos(s.elevation) * s.distance,
    Math.sin(s.elevation) * s.distance,
    Math.cos(s.azimuth) * Math.cos(s.elevation) * s.distance
  );
  camState.flyLookAt.set(0, 0, 0);
  camState.flying = true;
  camState.flyProgress = 0;

  camState.azimuth = s.azimuth;
  camState.elevation = s.elevation;
  camState.distance = s.distance;
  camState.targetAzimuth = s.azimuth;
  camState.targetElevation = s.elevation;
  camState.targetDistance = s.distance;

  uiPanel.classList.remove('dimmed');
  clearHover();
  setMode(State.SYSTEM);
  statusEl.textContent = '🖱️ Наведите курсор на планету и кликните';
}

// ─── Выбор планеты (экранные координаты + большая зона) ─────────────────────
const PICK_RADIUS_MIN = 220;
const AIM_SMOOTH = 0.28;
const PINCH_THRESHOLD = 0.07;
const PINCH_HOLD_FRAMES = 6;
const ACTION_COOLDOWN = 50;

const aim = { smoothX: 0, smoothY: 0, stickyPlanet: -1 };
let hoveredPlanet = -1;
const _proj = new THREE.Vector3();

function fingerToScreen(landmarks) {
  const tip = landmarks[8];
  const x = (1 - tip.x) * window.innerWidth;
  const y = tip.y * window.innerHeight;
  return { x, y };
}

function updateAimPosition(screenX, screenY) {
  if (!aim.smoothX && !aim.smoothY) {
    aim.smoothX = screenX;
    aim.smoothY = screenY;
  } else {
    aim.smoothX += (screenX - aim.smoothX) * AIM_SMOOTH;
    aim.smoothY += (screenY - aim.smoothY) * AIM_SMOOTH;
  }
}

function pickPlanetByScreen(screenX, screenY) {
  let best = -1;
  let bestDist = Infinity;

  planetMeshes.forEach((mesh, i) => {
    _proj.copy(mesh.position).project(camera);
    if (_proj.z > 1) return;

    const sx = (_proj.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
    const dist = Math.hypot(sx - screenX, sy - screenY);
    const screenSize = (PLANETS[i].radius / camState.distance) * window.innerHeight * 12;
    const hitRadius = Math.max(PICK_RADIUS_MIN, screenSize + 40);

    if (dist < hitRadius && dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });

  if (best >= 0) aim.stickyPlanet = best;
  else if (aim.stickyPlanet >= 0) {
    _proj.copy(planetMeshes[aim.stickyPlanet].position).project(camera);
    if (_proj.z <= 1) {
      const sx = (_proj.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-_proj.y * 0.5 + 0.5) * window.innerHeight;
      if (Math.hypot(sx - screenX, sy - screenY) < PICK_RADIUS_MIN * 1.2) best = aim.stickyPlanet;
    }
  }

  return best;
}

function clearHover() {
  hoveredPlanet = -1;
  aim.stickyPlanet = -1;
  crosshair.classList.remove('visible', 'has-target');
  setHighlight(-1);
  if (appState === State.SYSTEM) planetNameEl.textContent = 'Планета: —';
}

function setHighlight(index) {
  highlightRings.forEach((ring, i) => {
    ring.material.opacity = i === index ? 0.85 : 0;
  });
}

function setMode(mode) {
  appState = mode;
  modeBadge.textContent = {
    [State.SYSTEM]: `Режим: обзор (${APP_VERSION})`,
    [State.LOCKED]: `Режим: у планеты 🔒 (${APP_VERSION})`,
    [State.INFO]: `Режим: информация 📋 (${APP_VERSION})`,
  }[mode] || mode;
  modeBadge.className = mode === State.LOCKED ? 'locked' : mode === State.INFO ? 'info' : '';
}

// ─── Bento ────────────────────────────────────────────────────────────────────
function fillBento(index) {
  const p = PLANETS[index];
  document.getElementById('bento-img').src = p.texture;
  document.getElementById('bento-title').textContent = p.name;
  document.getElementById('bento-subtitle').textContent = p.info.type;
  document.getElementById('bento-desc').textContent = p.info.desc;
  document.getElementById('bento-diameter').textContent = p.info.diameter;
  document.getElementById('bento-distance').textContent = p.info.distance;
  document.getElementById('bento-moons').textContent = p.info.moons;
  document.getElementById('bento-day').textContent = p.info.day;
  document.getElementById('bento-year').textContent = p.info.year;
}

function openBento(index) {
  fillBento(index);
  bento.classList.remove('hidden');
  requestAnimationFrame(() => bento.classList.add('open'));
  uiPanel.classList.add('dimmed');
  setMode(State.INFO);
  infoGraceFrames = INFO_OPEN_GRACE;
  fistFrames = 0;
  pinchFrames = 0;
  statusEl.textContent = '🖱️ Кнопки в карточке | ✌️ знак мира | ✊ кулак';
}

function switchToNextPlanet() {
  if (camState.flying || camState.lockedPlanet < 0) return;
  const next = (camState.lockedPlanet + 1) % PLANETS.length;
  fillBento(next);
  setHighlight(next);
  flyToPlanet(next, true);
}

function closeBento() {
  bento.classList.remove('open');
  setTimeout(() => bento.classList.add('hidden'), 500);
  uiPanel.classList.remove('dimmed');
}

document.getElementById('bento-next')?.addEventListener('click', () => {
  if (camState.flying || camState.lockedPlanet < 0) return;
  switchToNextPlanet();
});
document.getElementById('bento-back')?.addEventListener('click', () => {
  if (camState.flying) return;
  returnToSystem();
});

// ─── Mouse / Cursor управление ────────────────────────────────────────────────
const mouse = { down: false, dragging: false, moved: 0, lastX: 0, lastY: 0 };

function updateCursorAim(screenX, screenY) {
  crosshair.classList.add('visible');
  updateCrosshair(screenX, screenY, false);

  if (appState === State.SYSTEM) {
    hoveredPlanet = pickPlanetByScreen(screenX, screenY);
    setHighlight(hoveredPlanet);
    if (hoveredPlanet >= 0) {
      crosshair.classList.add('has-target');
      planetNameEl.textContent = `→ ${PLANETS[hoveredPlanet].name}`;
      statusEl.textContent = `🖱️ ${PLANETS[hoveredPlanet].name} — клик для приближения`;
    } else {
      planetNameEl.textContent = 'Планета: —';
      statusEl.textContent = '🖱️ Наведите на планету или перетащите для вращения';
    }
  } else if (appState === State.LOCKED) {
    statusEl.textContent = '🖱️ Клик — открыть информацию о планете';
  }
}

function handleMouseClick(screenX, screenY) {
  if (camState.flying || handActive) return;

  if (appState === State.SYSTEM) {
    const idx = pickPlanetByScreen(screenX, screenY);
    if (idx >= 0) {
      flyToPlanet(idx);
      statusEl.textContent = `🚀 Приближение к ${PLANETS[idx].name}…`;
    }
  } else if (appState === State.LOCKED) {
    openBento(camState.lockedPlanet);
  }
}

function initMouseControls() {
  canvas.style.cursor = 'grab';

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target !== canvas) return;
    mouse.down = true;
    mouse.dragging = false;
    mouse.moved = 0;
    mouse.lastX = e.clientX;
    mouse.lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (mouse.down) {
      const dx = e.clientX - mouse.lastX;
      const dy = e.clientY - mouse.lastY;
      mouse.moved += Math.abs(dx) + Math.abs(dy);
      mouse.lastX = e.clientX;
      mouse.lastY = e.clientY;

      if (mouse.moved > 6) {
        mouse.dragging = true;
        canvas.style.cursor = 'grabbing';
        if (!camState.flying && appState === State.SYSTEM) {
          camState.targetAzimuth -= dx * 0.005;
          camState.targetElevation = THREE.MathUtils.clamp(
            camState.targetElevation + dy * 0.005, -0.3, 1.2
          );
          camState.savedOrbit.azimuth = camState.targetAzimuth;
          camState.savedOrbit.elevation = camState.targetElevation;
          camState.savedOrbit.distance = camState.targetDistance;
          if (!handActive) clearHover();
        }
      }
      return;
    }

    if (!handActive && !camState.flying && appState !== State.INFO) {
      updateCursorAim(e.clientX, e.clientY);
    }
  });

  canvas.addEventListener('pointerup', (e) => {
    if (!mouse.down) return;
    const wasDrag = mouse.dragging;
    mouse.down = false;
    mouse.dragging = false;
    canvas.style.cursor = 'grab';
    try { canvas.releasePointerCapture(e.pointerId); } catch (_) { /* noop */ }

    if (!wasDrag && !handActive) handleMouseClick(e.clientX, e.clientY);
  });

  canvas.addEventListener('pointerleave', () => {
    if (!mouse.down && !handActive && appState === State.SYSTEM) clearHover();
  });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    if (camState.flying) return;
    camState.targetDistance = THREE.MathUtils.clamp(
      camState.targetDistance * (1 + e.deltaY * 0.0012), 25, 200
    );
    camState.savedOrbit.distance = camState.targetDistance;
  }, { passive: false });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && appState === State.INFO) returnToSystem();
  });
}

// ─── Hand Tracking ────────────────────────────────────────────────────────────
let handLandmarker = null;
let handTrackingPromise = null;

function ensureHandTracking() {
  if (!handTrackingPromise) handTrackingPromise = initHandTracking();
  return handTrackingPromise;
}
let lastVideoTime = -1;
let actionCooldown = 0;
let pinchFrames = 0;
let peaceFrames = 0;
let fistFrames = 0;
let infoGraceFrames = 0;
const PEACE_HOLD_FRAMES = 5;
const FIST_HOLD_FRAMES = 12;
const INFO_OPEN_GRACE = 40;

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12], [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20], [5,9],[9,13],[13,17],
];

function dist2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFingerCurled(landmarks, tip, pip) {
  return landmarks[tip].y > landmarks[pip].y + 0.01;
}

function isFist(landmarks) {
  if (isPinching(landmarks) || isPeaceSign(landmarks)) return false;
  return [8, 12, 16, 20].every((tip, i) => {
    const pip = [6, 10, 14, 18][i];
    return isFingerCurled(landmarks, tip, pip);
  });
}

function isOpenPalm(landmarks) {
  return dist2d(landmarks[8], landmarks[0]) > dist2d(landmarks[5], landmarks[0]) * 1.3
    && dist2d(landmarks[12], landmarks[0]) > dist2d(landmarks[9], landmarks[0]) * 1.2;
}

function isPinching(landmarks) {
  return dist2d(landmarks[4], landmarks[8]) < PINCH_THRESHOLD;
}

function isPeaceSign(landmarks) {
  const indexUp = landmarks[8].y < landmarks[6].y;
  const middleUp = landmarks[12].y < landmarks[10].y;
  const ringDown = landmarks[16].y > landmarks[13].y;
  const pinkyDown = landmarks[20].y > landmarks[17].y;
  const spread = dist2d(landmarks[8], landmarks[12]) > 0.035;
  const notPinch = dist2d(landmarks[4], landmarks[8]) > 0.045;
  return indexUp && middleUp && ringDown && pinkyDown && spread && notPinch;
}

function updatePeaceUI(detected) {
  if (!peaceBar) return;
  if (detected) {
    peaceBar.classList.add('active');
    const pct = Math.min(100, (peaceFrames / PEACE_HOLD_FRAMES) * 100);
    peaceFill.style.width = pct + '%';
    peaceLabel.textContent = pct >= 100
      ? '✌️ Переключение…'
      : `✌️ Держите знак мира… ${Math.round(pct)}%`;
  } else {
    peaceBar.classList.remove('active');
    peaceFill.style.width = '0%';
    peaceLabel.textContent = '✌️ Покажите знак мира для переключения';
  }
}

function updateCrosshair(x, y, hasTarget) {
  crosshair.style.left = x + 'px';
  crosshair.style.top = y + 'px';
  crosshair.classList.toggle('has-target', hasTarget);
}

function tryPinchAction(landmarks) {
  if (actionCooldown > 0 || camState.flying) return;

  if (isPinching(landmarks)) {
    pinchFrames++;
  } else {
    pinchFrames = 0;
    return;
  }

  if (pinchFrames < PINCH_HOLD_FRAMES) return;

  pinchFrames = 0;
  actionCooldown = ACTION_COOLDOWN;

  if (appState === State.LOCKED) {
    openBento(camState.lockedPlanet);
    return;
  }

  if (appState === State.SYSTEM && hoveredPlanet >= 0) {
    flyToPlanet(hoveredPlanet);
    statusEl.textContent = `🚀 Приближение к ${PLANETS[hoveredPlanet].name}…`;
  }
}

function processHandGestures(landmarks) {
  try {
    handActive = true;
    if (actionCooldown > 0) actionCooldown--;

    const fist = isFist(landmarks);
    const openPalm = isOpenPalm(landmarks);
    const pinching = isPinching(landmarks);

    // ── INFO: ✌️ → след. планета, ✊ → возврат ──
    if (appState === State.INFO) {
      if (infoGraceFrames > 0) infoGraceFrames--;

      if (fist && infoGraceFrames === 0) {
        fistFrames++;
        if (fistFrames >= FIST_HOLD_FRAMES && actionCooldown === 0) {
          actionCooldown = ACTION_COOLDOWN;
          peaceFrames = 0;
          fistFrames = 0;
          returnToSystem();
        } else {
          statusEl.textContent = `✊ Держите кулак… ${Math.round((fistFrames / FIST_HOLD_FRAMES) * 100)}%`;
        }
        return;
      }
      fistFrames = 0;

      const peace = isPeaceSign(landmarks);
      updatePeaceUI(peace);

      if (peace && !camState.flying) {
        peaceFrames++;
        if (peaceFrames >= PEACE_HOLD_FRAMES && actionCooldown === 0) {
          peaceFrames = 0;
          actionCooldown = ACTION_COOLDOWN;
          switchToNextPlanet();
          updatePeaceUI(false);
          statusEl.textContent = `✌️ → ${PLANETS[camState.lockedPlanet].name}`;
        } else {
          statusEl.textContent = '✌️ Держите ✌️ — следующая планета';
        }
      } else {
        peaceFrames = 0;
        statusEl.textContent = '✌️ Знак мира — след. планета | ✊ Кулак — выход';
      }
      return;
    }

    // ── LOCKED: щипок → bento ──
    if (appState === State.LOCKED) {
      tryPinchAction(landmarks);
      statusEl.textContent = pinching
        ? '🤏 Держите щипок — открыть информацию'
        : '🤏 Сожмите большой и указательный — информация';
      return;
    }

    // ── SYSTEM: указательный → выбор, щипок → полёт ──
    if (!camState.flying && !openPalm && !fist) {
      const screen = fingerToScreen(landmarks);
      updateAimPosition(screen.x, screen.y);
      crosshair.classList.add('visible');
      updateCrosshair(aim.smoothX, aim.smoothY, false);

      hoveredPlanet = pickPlanetByScreen(aim.smoothX, aim.smoothY);
      setHighlight(hoveredPlanet);

      if (hoveredPlanet >= 0) {
        crosshair.classList.add('has-target');
        planetNameEl.textContent = `→ ${PLANETS[hoveredPlanet].name}`;
        statusEl.textContent = pinching
          ? '🤏 Держите щипок — приближение'
          : `☝️ ${PLANETS[hoveredPlanet].name} — сожмите пальцы для полёта`;
      } else {
        statusEl.textContent = pinching
          ? '🤏 Наведите на планету и сожмите пальцы'
          : '☝️ Наведите указательный на планету';
      }

      tryPinchAction(landmarks);
    } else if (openPalm && !camState.flying) {
      clearHover();
      const palm = landmarks[9];
      camState.targetAzimuth = (0.5 - palm.x) * Math.PI * 1.5;
      camState.targetElevation = THREE.MathUtils.clamp((0.5 - palm.y) * 1.2 + 0.3, -0.3, 1.2);
      camState.savedOrbit.azimuth = camState.targetAzimuth;
      camState.savedOrbit.elevation = camState.targetElevation;
      camState.savedOrbit.distance = camState.targetDistance;
      statusEl.textContent = '✋ Открытая ладонь — вращение';
      pinchFrames = 0;
    } else if (!camState.flying) {
      clearHover();
      statusEl.textContent = '☝️ Укажите пальцем или ✋ ладонь для вращения';
      pinchFrames = 0;
    }
  } catch (err) {
    console.error('Gesture error:', err);
    statusEl.textContent = 'Ошибка жеста — попробуйте снова';
  }
}

function onHandLost() {
  handActive = false;
  pinchFrames = 0;
  peaceFrames = 0;
  fistFrames = 0;
  if (appState === State.SYSTEM) {
    clearHover();
    statusEl.textContent = '🖱️ Наведите курсор на планету и кликните';
  }
}

function drawHandSkeleton(landmarks) {
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
  const w = handCanvas.width, h = handCanvas.height;
  const pinching = isPinching(landmarks);
  const fist = isFist(landmarks);
  const peace = isPeaceSign(landmarks);

  handCtx.strokeStyle = peace ? 'rgba(180,255,80,0.95)' : pinching ? 'rgba(255,120,50,0.95)' : fist ? 'rgba(255,80,80,0.9)' : 'rgba(100,200,255,0.7)';
  handCtx.lineWidth = 2;
  for (const [a, b] of HAND_CONNECTIONS) {
    handCtx.beginPath();
    handCtx.moveTo(landmarks[a].x * w, landmarks[a].y * h);
    handCtx.lineTo(landmarks[b].x * w, landmarks[b].y * h);
    handCtx.stroke();
  }
  for (const lm of landmarks) {
    handCtx.beginPath();
    handCtx.arc(lm.x * w, lm.y * h, 3, 0, Math.PI * 2);
    handCtx.fillStyle = peace ? '#88ff44' : pinching ? '#ff6622' : fist ? '#ff4444' : '#66ccff';
    handCtx.fill();
  }
  if (pinching) {
    handCtx.beginPath();
    handCtx.arc(landmarks[4].x * w, landmarks[4].y * h, 8, 0, Math.PI * 2);
    handCtx.strokeStyle = '#ff6622';
    handCtx.lineWidth = 2;
    handCtx.stroke();
  }
}

async function initHandTracking() {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
  );
  handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 1,
  });
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    statusEl.textContent = 'Камера недоступна в этом браузере — используйте мышь';
    return;
  }
  try {
    startBtn.disabled = true;
    startBtn.textContent = 'Подключение…';
    if (!handLandmarker) {
      startBtn.textContent = 'Загрузка модели жестов…';
      await ensureHandTracking();
    }
    startBtn.textContent = 'Подключение…';
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 },
    });
    video.srcObject = stream;
    await video.play();
    handCanvas.width = 200;
    handCanvas.height = 150;
    startBtn.hidden = true;
    statusEl.textContent = `🖱️ Мышь или ☝️ палец → 🤏 щипок для полёта (${APP_VERSION})`;
    detectHands();
  } catch (err) {
    startBtn.disabled = false;
    startBtn.textContent = 'Разрешить камеру';
    const msg = err.name === 'NotAllowedError'
      ? 'Доступ к камере запрещён — разрешите в настройках браузера'
      : err.name === 'NotFoundError'
        ? 'Камера не найдена'
        : err.message;
    statusEl.textContent = `Камера: ${msg}. Управление мышью работает.`;
  }
}

function detectHands() {
  if (!handLandmarker || video.readyState < 2) {
    requestAnimationFrame(detectHands);
    return;
  }
  if (video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    const result = handLandmarker.detectForVideo(video, performance.now());
    if (result.landmarks.length > 0) {
      drawHandSkeleton(result.landmarks[0]);
      processHandGestures(result.landmarks[0]);
    } else {
      handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
      onHandLost();
    }
  }
  requestAnimationFrame(detectHands);
}

startBtn.addEventListener('click', startCamera);

// ─── Анимация ─────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  planetMeshes.forEach((mesh, i) => {
    const p = PLANETS[i];
    if (p.orbit > 0) {
      mesh.userData.angle += p.speed * dt * 0.3;
      mesh.position.set(
        Math.cos(mesh.userData.angle) * p.orbit,
        0,
        Math.sin(mesh.userData.angle) * p.orbit
      );
    }
    mesh.rotation.y += dt * (PLANET_IDS[i] === 'venus' ? -0.04 : 0.15);
    mesh.userData.tick?.(dt);
    if (PLANET_IDS[i] !== 'sun') {
      _sunDir.copy(mesh.position).multiplyScalar(-1);
      if (_sunDir.lengthSq() < 1e-6) _sunDir.set(1, 0, 0);
      mesh.userData.setSunDir?.(_sunDir);
    }
  });

  if (earthMoon) {
    const earth = planetMeshes[3];
    earthMoon.angle += dt * 0.65;
    earthMoon.mesh.position.set(
      earth.position.x + Math.cos(earthMoon.angle) * earthMoon.dist,
      earth.position.y + 0.12,
      earth.position.z + Math.sin(earthMoon.angle) * earthMoon.dist
    );
    earthMoon.mesh.rotation.y += dt * 0.08;
    earthMoon.mesh.userData.tick?.(dt);
    _sunDir.copy(earthMoon.mesh.position).multiplyScalar(-1);
    earthMoon.mesh.userData.setSunDir?.(_sunDir);
  }

  updateCameraPosition();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Запуск ───────────────────────────────────────────────────────────────────
async function boot() {
  try {
    await createPlanets();
    loadingEl.classList.add('hidden');
    setMode(State.SYSTEM);
    if (versionTag) versionTag.textContent = APP_VERSION;
    initMouseControls();
    startBtn.hidden = false;
    statusEl.textContent = '🖱️ Наведите курсор на планету и кликните | колесо — зум';

    ensureHandTracking().catch(err => {
      console.warn('Hand tracking unavailable:', err);
      statusEl.textContent = `🖱️ Мышь готова. Жесты недоступны: ${err.message}`;
    });
  } catch (err) {
    statusEl.textContent = 'Ошибка загрузки: ' + err.message;
    loadingEl.classList.add('hidden');
    startBtn.hidden = false;
  }
}

boot();
animate();
