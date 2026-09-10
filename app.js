import * as THREE from 'three';
import { FilesetResolver, HandLandmarker } from 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';

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
const State = { SYSTEM: 'system', AIMING: 'aiming', LOCKED: 'locked', INFO: 'info' };
let appState = State.SYSTEM;

// ─── Three.js ───────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 25, 70);

scene.add(new THREE.AmbientLight(0x334466, 1.2));
scene.add(new THREE.HemisphereLight(0x8899cc, 0x111122, 0.6));

const sunLight = new THREE.PointLight(0xfff5e0, 4, 400, 0.5);
scene.add(sunLight);

// Звёзды
const starGeo = new THREE.BufferGeometry();
const positions = new Float32Array(3000 * 3);
for (let i = 0; i < positions.length; i++) positions[i] = (Math.random() - 0.5) * 400;
starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5 })));

const textureLoader = new THREE.TextureLoader();
const planetMeshes = [];
const highlightRings = [];
const raycaster = new THREE.Raycaster();

function loadTexture(url, fallbackColor) {
  return new Promise(resolve => {
    textureLoader.load(
      url,
      tex => { tex.colorSpace = THREE.SRGBColorSpace; resolve(tex); },
      undefined,
      () => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#' + fallbackColor.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, 64, 64);
        resolve(new THREE.CanvasTexture(c));
      }
    );
  });
}

const FALLBACK_COLORS = [0xffdd44, 0xaaaaaa, 0xe8cda0, 0x4488ff, 0xff4422, 0xd4a574, 0xc9b896, 0x88ddff, 0x2244cc];

async function createPlanets() {
  for (let i = 0; i < PLANETS.length; i++) {
    const p = PLANETS[i];
    const tex = await loadTexture(p.texture, FALLBACK_COLORS[i]);
    const geo = new THREE.SphereGeometry(p.radius, 48, 48);

    const mat = p.glow
      ? new THREE.MeshBasicMaterial({ map: tex })
      : new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.8,
          metalness: 0.05,
          emissive: 0x111122,
          emissiveIntensity: 0.15,
        });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData = { planetIndex: i, angle: Math.random() * Math.PI * 2 };

    if (p.glow) {
      const glowGeo = new THREE.SphereGeometry(p.radius * 1.3, 32, 32);
      mesh.add(new THREE.Mesh(glowGeo, new THREE.MeshBasicMaterial({
        color: 0xffaa44, transparent: true, opacity: 0.12, depthWrite: false,
      })));
    }

    if (p.ring) {
      const ringTex = await loadTexture(p.ringTexture, 0xc9b896);
      const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.2, 64);
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        map: ringTex, transparent: true, opacity: 0.85, side: THREE.DoubleSide,
        alphaMap: ringTex, depthWrite: false,
      }));
      ring.rotation.x = Math.PI / 2.2;
      mesh.add(ring);
    }

    // Кольцо-подсветка при наведении
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

function flyToPlanet(index) {
  const p = PLANETS[index];
  const mesh = planetMeshes[index];
  const pos = mesh.position.clone();
  const offset = p.radius * 5 + 4;

  camState.flyFrom.copy(camera.position);
  const dir = camera.position.clone().sub(pos).normalize();
  if (dir.length() < 0.01) dir.set(0, 0.3, 1).normalize();
  camState.flyTo.copy(pos).add(dir.multiplyScalar(offset));
  camState.flyLookAt.copy(pos);
  camState.flying = true;
  camState.flyProgress = 0;
  camState.lockedPlanet = index;
  planetNameEl.textContent = `Планета: ${p.name}`;
}

function returnToSystem() {
  closeBento();
  setMode(State.SYSTEM);
  camState.lockedPlanet = -1;
  lastAimedPlanet = -1;
  pinchHoldFrames = 0;

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

  planetNameEl.textContent = 'Планета: —';
  crosshair.classList.remove('locked');
  uiPanel.classList.remove('dimmed');
  setHighlight(-1);
  statusEl.textContent = '✋ Открытая ладонь — вращение системы';
}

// ─── Raycast / выбор планеты ─────────────────────────────────────────────────
let aimedPlanet = -1;
let lastAimedPlanet = -1;
const _proj = new THREE.Vector3();

function fingerToScreen(landmarks) {
  // Позиция указательного пальца → координаты экрана (зеркало камеры)
  const x = (1 - landmarks[8].x) * window.innerWidth;
  const y = landmarks[8].y * window.innerHeight;
  return { x, y };
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
    const hitRadius = Math.max(35, PLANETS[i].radius * 14);

    if (dist < hitRadius && dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  });

  return best;
}

function setHighlight(index) {
  highlightRings.forEach((ring, i) => {
    ring.material.opacity = i === index ? 0.85 : 0;
  });
}

function setMode(mode) {
  appState = mode;
  modeBadge.textContent = {
    [State.SYSTEM]: 'Режим: обзор системы',
    [State.AIMING]: 'Режим: прицеливание ☝️',
    [State.LOCKED]: 'Режим: у планеты 🔒',
    [State.INFO]: 'Режим: информация 📋',
  }[mode] || mode;
  modeBadge.className = mode === State.AIMING ? 'aiming'
    : mode === State.LOCKED ? 'locked'
    : mode === State.INFO ? 'info' : '';
}

// ─── Bento ────────────────────────────────────────────────────────────────────
function openBento(index) {
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
  bento.classList.remove('hidden');
  requestAnimationFrame(() => bento.classList.add('open'));
  uiPanel.classList.add('dimmed');
  setMode(State.INFO);
  statusEl.textContent = '✊ Кулак — вернуться в систему';
}

function closeBento() {
  bento.classList.remove('open');
  setTimeout(() => bento.classList.add('hidden'), 500);
  uiPanel.classList.remove('dimmed');
}

// ─── Hand Tracking ────────────────────────────────────────────────────────────
let handLandmarker = null;
let lastVideoTime = -1;
let prevPinchDist = null;
let snapCooldown = 0;
let wasPointing = false;
let pinchHoldFrames = 0;
const PINCH_HOLD_THRESHOLD = 12;

const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4], [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12], [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20], [5,9],[9,13],[13,17],
];

function dist2d(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
}

function isFingerExtended(tip, pip, mcp) {
  return dist3(tip, mcp) > dist3(pip, mcp) * 1.05;
}

function isPointing(landmarks) {
  const indexExt = isFingerExtended(landmarks[8], landmarks[6], landmarks[5]);
  const othersCur = [12, 16, 20].every(i =>
    !isFingerExtended(landmarks[i], landmarks[i - 2], landmarks[i - 3])
  );
  return indexExt && othersCur;
}

function isFist(landmarks) {
  return [8, 12, 16, 20].every(i =>
    !isFingerExtended(landmarks[i], landmarks[i - 2], landmarks[i - 3])
  );
}

function isOpenPalm(landmarks) {
  return [8, 12, 16, 20].every(i =>
    isFingerExtended(landmarks[i], landmarks[i - 2], landmarks[i - 3])
  );
}

function detectSnap(landmarks) {
  const d = dist3(landmarks[4], landmarks[8]);
  let snapped = false;
  if (prevPinchDist !== null && prevPinchDist > 0.08 && d < 0.04) snapped = true;
  prevPinchDist = d;
  return snapped;
}

function processHandGestures(landmarks) {
  if (snapCooldown > 0) snapCooldown--;

  const pointing = isPointing(landmarks);
  const fist = isFist(landmarks);
  const screen = fingerToScreen(landmarks);

  // ── INFO: кулак → возврат ──
  if (appState === State.INFO) {
    crosshair.style.left = screen.x + 'px';
    crosshair.style.top = screen.y + 'px';
    if (fist && snapCooldown === 0) {
      snapCooldown = 30;
      returnToSystem();
    }
    return;
  }

  // ── LOCKED: щелчок → bento ──
  if (appState === State.LOCKED) {
    crosshair.classList.add('visible', 'locked');
    crosshair.style.left = screen.x + 'px';
    crosshair.style.top = screen.y + 'px';

    if (detectSnap(landmarks) && snapCooldown === 0) {
      snapCooldown = 40;
      openBento(camState.lockedPlanet);
      statusEl.textContent = '✊ Кулак — вернуться в систему';
    } else {
      statusEl.textContent = '👌 Щелчок пальцами — открыть информацию';
    }
    return;
  }

  // ── AIMING: луч по указательному ──
  if (appState === State.AIMING) {
    crosshair.classList.add('visible');
    crosshair.classList.remove('locked');
    crosshair.style.left = screen.x + 'px';
    crosshair.style.top = screen.y + 'px';

    aimedPlanet = raycastPlanet(screen.x, screen.y);
    setHighlight(aimedPlanet);

    if (aimedPlanet >= 0) {
      planetNameEl.textContent = `→ ${PLANETS[aimedPlanet].name}`;
      statusEl.textContent = '☝️ Уберите палец, чтобы зафиксировать';
    } else {
      statusEl.textContent = '☝️ Наведите на планету';
    }

    if (!pointing) {
      if (aimedPlanet >= 0) {
        lockedSelection = aimedPlanet;
        appState = State.LOCKED;
        flyToPlanet(aimedPlanet);
        crosshair.classList.add('locked');
        statusEl.textContent = '🚀 Приближение…';
      } else {
        appState = State.SYSTEM;
        crosshair.classList.remove('visible');
        setHighlight(-1);
        statusEl.textContent = '✋ Открытая ладонь — вращение системы';
      }
    }
    return;
  }

  // ── SYSTEM ──
  crosshair.classList.remove('visible', 'locked');

  if (pointing && !camState.flying) {
    appState = State.AIMING;
    wasPointing = true;
    statusEl.textContent = '☝️ Наведите на планету';
    return;
  }

  if (isOpenPalm(landmarks) && !camState.flying) {
    const palm = landmarks[9];
    camState.targetAzimuth = (0.5 - palm.x) * Math.PI * 1.5;
    camState.targetElevation = THREE.MathUtils.clamp((0.5 - palm.y) * 1.2 + 0.3, -0.3, 1.2);
    camState.savedOrbit.azimuth = camState.targetAzimuth;
    camState.savedOrbit.elevation = camState.targetElevation;
    camState.savedOrbit.distance = camState.targetDistance;
    statusEl.textContent = '✋ Вращение системы';
  } else if (!camState.flying) {
    statusEl.textContent = '☝️ Укажите пальцем на планету';
  }

  wasPointing = false;
  prevPinchDist = null;
}

function drawHandSkeleton(landmarks) {
  handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
  const w = handCanvas.width, h = handCanvas.height;
  const pointing = isPointing(landmarks);
  const fist = isFist(landmarks);

  handCtx.strokeStyle = pointing ? 'rgba(255,200,50,0.9)' : fist ? 'rgba(255,80,80,0.9)' : 'rgba(100,200,255,0.7)';
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
    handCtx.fillStyle = pointing ? '#ffcc00' : fist ? '#ff4444' : '#66ccff';
    handCtx.fill();
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
  statusEl.textContent = 'Нажмите «Разрешить камеру»';
  startBtn.hidden = false;
  loadingEl.classList.add('hidden');
}

async function startCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: 640, height: 480 },
  });
  video.srcObject = stream;
  await video.play();
  handCanvas.width = 200;
  handCanvas.height = 150;
  startBtn.hidden = true;
  statusEl.textContent = '☝️ Укажите пальцем на планету';
  detectHands();
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
      if (appState === State.AIMING) {
        appState = State.SYSTEM;
        crosshair.classList.remove('visible');
        setHighlight(-1);
      }
      statusEl.textContent = 'Рука не обнаружена';
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
    mesh.rotation.y += dt * 0.15;
  });

  updateCameraPosition();
  renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ─── Запуск ───────────────────────────────────────────────────────────────────
Promise.all([
  createPlanets(),
  initHandTracking(),
]).catch(err => {
  statusEl.textContent = 'Ошибка: ' + err.message;
  loadingEl.classList.add('hidden');
});

animate();
