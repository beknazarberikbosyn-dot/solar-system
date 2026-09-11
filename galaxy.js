import * as THREE from 'three';

// ─── DOM ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('scene');
const labelLayer = document.getElementById('labels');
const warp = document.getElementById('warp-overlay');
const flash = document.getElementById('warp-flash');
const statusEl = document.getElementById('gx-status');
const loadingEl = document.getElementById('loading');
const infoPanel = document.getElementById('gx-info');
const APP_VERSION = 'v16';
const IMG_FALLBACK = 'https://images-assets.nasa.gov/image/PIA06968/PIA06968~medium.jpg';
const NASA = (id) => `https://images-assets.nasa.gov/image/${id}/${id}~medium.jpg`;
const WIKI = (file, w = 1280) =>
  `https://upload.wikimedia.org/wikipedia/commons/thumb/${file}/${w}px-${file.split('/').pop()}`;

// ─── Ключевые объекты Млечного Пути ──────────────────────────────────────────
// r — доля радиуса диска (0 = центр), a — угол на диске (°), y — высота над плоскостью
const MAX_R = 150;
const OBJECTS = [
  {
    id: 'sgr-a', name: 'Стрелец A*', kind: 'blackhole',
    r: 0, a: 0, y: 0, color: 0xffaa33, size: 5.5,
    image: NASA('PIA25477'),
    imageCredit: 'Event Horizon Telescope / NASA',
    type: 'Сверхмассивная чёрная дыра',
    desc: 'Сердце нашей Галактики. Сверхмассивная чёрная дыра массой около 4,3 миллиона Солнц. Вокруг неё вращается весь Млечный Путь.',
    distEarth: '≈ 26 000 св. лет', distCenter: '0 (это и есть центр)',
    extra: 'Диаметр горизонта событий ≈ 24 млн км',
  },
  {
    id: 'bulge', name: 'Галактический балдж', kind: 'core',
    r: 0.14, a: 120, y: 0, color: 0xffd27f, size: 3.2,
    image: NASA('PIA06968'),
    imageCredit: 'NASA / JPL-Caltech',
    type: 'Центральное сгущение звёзд',
    desc: 'Плотное скопление миллиардов старых звёзд вокруг центра. Здесь звёзды расположены в тысячи раз плотнее, чем возле Солнца.',
    distEarth: '≈ 26 000 св. лет', distCenter: '≈ 3 000 св. лет',
    extra: 'Возраст большинства звёзд — более 10 млрд лет',
  },
  {
    id: 'solar', name: 'Солнечная система', kind: 'system', solar: true,
    r: 0.6, a: 25, y: 1.5, color: 0xffe08a, size: 3.4,
    image: NASA('PIA01341'),
    imageCredit: 'NASA',
    type: 'Наш дом · рукав Ориона',
    desc: 'Наша звёздная система в рукаве Ориона. Отсюда мы наблюдаем всю Галактику. Нажмите, чтобы прыгнуть внутрь и исследовать планеты!',
    distEarth: '0 (мы здесь)', distCenter: '≈ 26 000 св. лет',
    extra: 'Один оборот вокруг центра — ≈ 225 млн лет',
  },
  {
    id: 'proxima', name: 'Проксима Центавра', kind: 'star',
    r: 0.605, a: 22, y: 1.2, color: 0xff6644, size: 2.0,
    image: NASA('PIA18904'),
    imageCredit: 'NASA / ESA / STScI',
    type: 'Красный карлик · ближайшая звезда',
    desc: 'Ближайшая к Солнцу звезда. Красный карлик с планетой Proxima b в зоне обитаемости. Свет от неё летит к нам более 4 лет.',
    distEarth: '4,24 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'Часть тройной системы Альфа Центавра',
  },
  {
    id: 'sirius', name: 'Сириус', kind: 'star',
    r: 0.62, a: 33, y: 2.0, color: 0xcfe6ff, size: 2.4,
    image: NASA('PIA21430'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Ярчайшая звезда неба',
    desc: 'Самая яркая звезда ночного неба. Двойная система: бело-голубой Сириус A и белый карлик Сириус B.',
    distEarth: '8,6 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'В 25 раз ярче Солнца',
  },
  {
    id: 'vega', name: 'Вега', kind: 'star',
    r: 0.58, a: 40, y: 3.0, color: 0xdfe9ff, size: 2.2,
    image: NASA('PIA16884'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Звезда созвездия Лиры',
    desc: 'Одна из самых известных звёзд неба, служила эталоном яркости. Около 12 000 лет назад была Полярной звездой.',
    distEarth: '25 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Окружена диском пыли — возможной планетной системой',
  },
  {
    id: 'polaris', name: 'Полярная звезда', kind: 'star',
    r: 0.63, a: 15, y: 3.5, color: 0xfff4d6, size: 2.3,
    image: NASA('PIA12348'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Северная путеводная звезда',
    desc: 'Указывает на север и почти не движется по небу. Жёлтый сверхгигант-цефеида, по которому веками ориентировались мореплаватели.',
    distEarth: '≈ 433 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'В 2500 раз ярче Солнца',
  },
  {
    id: 'betelgeuse', name: 'Бетельгейзе', kind: 'star',
    r: 0.66, a: 48, y: -2.0, color: 0xff5522, size: 2.9,
    image: NASA('PIA23452'),
    imageCredit: 'ALMA / ESO / NAOJ / NRAO',
    type: 'Красный сверхгигант',
    desc: 'Огромная умирающая звезда в созвездии Ориона. Если поставить её на место Солнца, она поглотила бы орбиту Юпитера. Готова взорваться сверхновой.',
    distEarth: '≈ 640 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Диаметр ≈ 1 млрд км',
  },
  {
    id: 'pleiades', name: 'Плеяды (M45)', kind: 'cluster',
    r: 0.64, a: 58, y: 4.0, color: 0x9fc4ff, size: 3.0,
    image: WIKI('4/4e/Pleiades_large.jpg', 960),
    imageCredit: 'NASA / ESA / AURA / Caltech',
    type: 'Рассеянное звёздное скопление',
    desc: 'Молодые голубые звёзды, окутанные туманностью. Видны невооружённым глазом как «Семь сестёр».',
    distEarth: '≈ 444 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'Возраст ≈ 100 млн лет',
  },
  {
    id: 'orion-neb', name: 'Туманность Ориона', kind: 'nebula',
    r: 0.68, a: 52, y: -3.5, color: 0xff88cc, size: 4.2,
    image: WIKI('f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg', 1280),
    imageCredit: 'NASA / ESA / M. Robberto',
    type: 'Область звездообразования (M42)',
    desc: 'Ближайший к нам «звёздный роддом» — гигантское облако газа, где прямо сейчас рождаются новые звёзды и планеты.',
    distEarth: '≈ 1 344 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'Диаметр ≈ 24 св. года',
  },
  {
    id: 'crab', name: 'Крабовидная туманность', kind: 'nebula',
    r: 0.5, a: 70, y: 6.0, color: 0x66ffcc, size: 3.6,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Crab_Nebula.jpg/960px-Crab_Nebula.jpg',
    imageCredit: 'NASA / ESA / ASU',
    type: 'Остаток сверхновой (M1)',
    desc: 'Останки звезды, взорвавшейся в 1054 году — вспышку видели китайские астрономы днём. В центре крутится нейтронная звезда-пульсар.',
    distEarth: '≈ 6 500 св. лет', distCenter: '≈ 20 000 св. лет',
    extra: 'Расширяется со скоростью 1 500 км/с',
  },
  {
    id: 'eagle', name: 'Столпы Творения', kind: 'nebula',
    r: 0.42, a: 95, y: -5.0, color: 0xffbb66, size: 4.4,
    image: NASA('PIA25431'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Туманность Орла (M16)',
    desc: 'Знаменитые «Столпы Творения» — колонны газа и пыли высотой в световые годы, где формируются новые звёзды. Прославлены снимком «Хаббла».',
    distEarth: '≈ 5 700 св. лет', distCenter: '≈ 20 000 св. лет',
    extra: 'Высота столпов ≈ 4–5 св. лет',
  },
  {
    id: 'carina', name: 'Туманность Киля', kind: 'nebula',
    r: 0.38, a: 200, y: 4.0, color: 0xff99aa, size: 4.6,
    image: NASA('PIA23646'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Область η Киля (NGC 3372)',
    desc: 'Одна из крупнейших туманностей неба. Внутри — Эта Киля, гипергигант, который может взорваться как гиперновая.',
    distEarth: '≈ 7 500 св. лет', distCenter: '≈ 18 000 св. лет',
    extra: 'В 100 раз больше Туманности Ориона',
  },
  {
    id: 'omega-cen', name: 'Омега Центавра', kind: 'cluster',
    r: 0.82, a: 230, y: 18.0, color: 0xfff0c0, size: 8.5,
    image: NASA('PIA09178'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Шаровое скопление (ω Cen)',
    desc: 'Крупнейшее шаровое скопление Галактики — почти 10 миллионов звёзд в шаре. Возможно, ядро поглощённой карликовой галактики.',
    distEarth: '≈ 17 000 св. лет', distCenter: '≈ 21 000 св. лет',
    extra: 'Возраст ≈ 12 млрд лет',
  },
  {
    id: 'horsehead', name: 'Конская Голова', kind: 'nebula',
    r: 0.67, a: 55, y: -2.2, color: 0xff7744, size: 3.8,
    image: NASA('PIA01322'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Тёмная туманность (Barnard 33)',
    desc: 'Силуэт пылевого облака на фоне светящегося газа — одно из самых узнаваемых изображений космоса. Находится в созвездии Ориона.',
    distEarth: '≈ 1 375 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: '«Голова» ≈ 3,5 св. года в поперечнике',
  },
  {
    id: 'helix', name: 'Туманность Улитка', kind: 'nebula',
    r: 0.55, a: 310, y: -4.0, color: 0x66ddff, size: 4.0,
    image: NASA('PIA15420'),
    imageCredit: 'NASA / JPL-Caltech / ESA',
    type: 'Планетарная туманность (NGC 7293)',
    desc: 'Остаток умирающей звезды, похожий на глаз. То, чем Солнце станет через миллиарды лет, сбросив внешние слои.',
    distEarth: '≈ 650 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Ближайшая к нам планетарная туманность',
  },
  {
    id: 'south-ring', name: 'Южное Кольцо', kind: 'nebula',
    r: 0.48, a: 175, y: 5.5, color: 0xaad4ff, size: 3.9,
    image: NASA('PIA23645'),
    imageCredit: 'NASA / ESA / CSA / JWST',
    type: 'Планетарная туманность (NGC 3132)',
    desc: 'Снимок «Джеймса Уэбба»: две звезды в центре и слои сброшенного газа. Видны пыль и молекулярный водород, невидимые для обычных телескопов.',
    distEarth: '≈ 2 000 св. лет', distCenter: '≈ 25 000 св. лет',
    extra: 'Диаметр ≈ 0,5 св. года',
  },
  {
    id: 'rho-oph', name: 'Ро Офиуха', kind: 'nebula',
    r: 0.61, a: 8, y: 2.8, color: 0xff99cc, size: 4.5,
    image: NASA('PIA25688'),
    imageCredit: 'NASA / ESA / CSA / JWST',
    type: 'Область звездообразования',
    desc: 'Одна из ближайших колыбелей звёзд. Снимок JWST показывает молодые светила, струи газа и цветные облака пыли рядом с Солнечной системой.',
    distEarth: '≈ 390 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Одно из ближайших к нам мест рождения звёзд',
  },
  {
    id: 'westerlund2', name: 'Вестерлунд 2', kind: 'cluster',
    r: 0.36, a: 215, y: -3.0, color: 0xff88aa, size: 4.0,
    image: NASA('PIA17563'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Молодое массивное скопление',
    desc: 'Тысячи новорождённых звёзд внутри туманности Gum 29. Снимок Hubble к 25-летию телескопа.',
    distEarth: '≈ 20 000 св. лет', distCenter: '≈ 16 000 св. лет',
    extra: 'Возраст скопления ≈ 2 млн лет',
  },
  {
    id: 'lagoon', name: 'Туманность Лагуна', kind: 'nebula',
    r: 0.4, a: 105, y: 3.2, color: 0xff6699, size: 4.3,
    image: NASA('PIA14400'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Эмиссионная туманность (M8)',
    desc: 'Яркое облако в Стрельце, видимое даже в бинокль. Внутри — «час песочных часов» и молодые горячие звёзды.',
    distEarth: '≈ 4 100 св. лет', distCenter: '≈ 21 000 св. лет',
    extra: 'Диаметр ≈ 110 × 50 св. лет',
  },
  {
    id: 'cats-paw', name: 'Кошачья Лапа', kind: 'nebula',
    r: 0.33, a: 145, y: -4.5, color: 0xff5566, size: 4.1,
    image: NASA('PIA16883'),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Область звездообразования (NGC 6334)',
    desc: 'Красные «пальцы» газа, похожие на след кошки. Здесь рождаются одни из самых массивных звёзд Галактики.',
    distEarth: '≈ 5 500 св. лет', distCenter: '≈ 19 000 св. лет',
    extra: 'Содержит десятки протозвёзд',
  },
];

// ─── Three.js ────────────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x05060f, 0.0016);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 6000);

scene.add(new THREE.AmbientLight(0x223355, 1.4));
const coreLight = new THREE.PointLight(0xffdca0, 3, 1200, 0.6);
scene.add(coreLight);

// Глубокий космический фон
(function addBackgroundStars() {
  const g = new THREE.BufferGeometry();
  const n = 4000;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = 900 + Math.random() * 2500;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.cos(p);
    pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0x8899bb, size: 1.4, sizeAttenuation: false })));
})();

// ─── Диск Млечного Пути (спиральные рукава) ──────────────────────────────────
const armsGroup = new THREE.Group();
scene.add(armsGroup);

function buildGalaxyDisk() {
  const ARMS = 4;
  const PER_ARM = 9000;
  const total = ARMS * PER_ARM;
  const pos = new Float32Array(total * 3);
  const col = new Float32Array(total * 3);
  const c = new THREE.Color();
  let k = 0;
  const TWIST = 3.4;

  for (let arm = 0; arm < ARMS; arm++) {
    const armOffset = (arm / ARMS) * Math.PI * 2;
    for (let i = 0; i < PER_ARM; i++) {
      const rf = Math.pow(Math.random(), 0.6);     // больше звёзд к центру
      const rad = rf * MAX_R;
      const spread = (1 - rf) * 0.35 + 0.08;       // рукава чётче с краю
      const ang = armOffset + rf * TWIST + (Math.random() - 0.5) * spread * 2 + THREE.MathUtils.randFloatSpread(0.06);
      const thickness = (1 - rf * 0.7) * 7 + 1;
      pos[k * 3]     = Math.cos(ang) * rad;
      pos[k * 3 + 1] = THREE.MathUtils.randFloatSpread(thickness);
      pos[k * 3 + 2] = Math.sin(ang) * rad;

      // цвет: тёплый в центре → голубой к краю
      const hue = THREE.MathUtils.lerp(0.11, 0.62, rf) + THREE.MathUtils.randFloatSpread(0.05);
      const light = THREE.MathUtils.lerp(0.85, 0.6, rf);
      c.setHSL(hue, 0.75, light);
      col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b;
      k++;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({
    size: 1.5, vertexColors: true, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, map: glowSprite(0xffffff),
  });
  armsGroup.add(new THREE.Points(g, m));

  // Центральный балдж — плотное сияющее ядро
  const bg = new THREE.BufferGeometry();
  const BN = 6000;
  const bp = new Float32Array(BN * 3);
  const bc = new Float32Array(BN * 3);
  for (let i = 0; i < BN; i++) {
    const r = Math.pow(Math.random(), 2) * MAX_R * 0.2;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    bp[i * 3]     = r * Math.sin(p) * Math.cos(t);
    bp[i * 3 + 1] = r * Math.cos(p) * 0.5;
    bp[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    c.setHSL(0.1 + Math.random() * 0.04, 0.8, 0.75);
    bc[i * 3] = c.r; bc[i * 3 + 1] = c.g; bc[i * 3 + 2] = c.b;
  }
  bg.setAttribute('position', new THREE.BufferAttribute(bp, 3));
  bg.setAttribute('color', new THREE.BufferAttribute(bc, 3));
  armsGroup.add(new THREE.Points(bg, new THREE.PointsMaterial({
    size: 2.2, vertexColors: true, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, map: glowSprite(0xffffff),
  })));
}

function addGalaxyPhotoDisk() {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  loader.load(NASA('PIA19341'), (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    const disk = new THREE.Mesh(
      new THREE.CircleGeometry(MAX_R * 1.05, 64),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    disk.rotation.x = -Math.PI / 2;
    armsGroup.add(disk);
  });
}

// ─── Спрайт-текстура свечения ────────────────────────────────────────────────
const _spriteCache = {};
function glowSprite(color) {
  const key = color;
  if (_spriteCache[key]) return _spriteCache[key];
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(color);
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.25, `rgba(${r},${g},${b},0.8)`);
  grad.addColorStop(0.5, `rgba(${r},${g},${b},0.25)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  _spriteCache[key] = tex;
  return tex;
}

// ─── Стрелец A* — чёрная дыра в центре ───────────────────────────────────────
function buildBlackHole() {
  const group = new THREE.Group();

  // Горизонт событий — чёрная сфера
  const hole = new THREE.Mesh(
    new THREE.SphereGeometry(4, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  group.add(hole);

  // Аккреционный диск
  const diskTex = accretionTexture();
  const disk = new THREE.Mesh(
    new THREE.RingGeometry(5, 15, 96),
    new THREE.MeshBasicMaterial({
      map: diskTex, transparent: true, side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
  );
  disk.rotation.x = Math.PI / 2.1;
  group.add(disk);

  // Фотонное кольцо-свечение
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite(0xffcc66), transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.9,
  }));
  halo.scale.set(34, 34, 1);
  group.add(halo);

  scene.add(group);
  return { group, disk };
}

function accretionTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 512;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(256, 256, 90, 256, 256, 256);
  grad.addColorStop(0, 'rgba(255,255,255,0.95)');
  grad.addColorStop(0.35, 'rgba(255,190,90,0.9)');
  grad.addColorStop(0.7, 'rgba(255,110,40,0.5)');
  grad.addColorStop(1, 'rgba(120,20,10,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ─── Ключевые объекты: спрайты + подписи ─────────────────────────────────────
const pickables = [];
const labels = [];

function objectWorldPos(o) {
  const rad = o.r * MAX_R;
  const a = o.a * Math.PI / 180;
  return new THREE.Vector3(Math.cos(a) * rad, o.y, Math.sin(a) * rad);
}

function modelSize(o) {
  if (o.kind === 'nebula') return o.size * 9.5;
  if (o.kind === 'cluster') return o.size * 7.5;
  if (o.kind === 'core') return o.size * 8;
  if (o.kind === 'system') return o.size * 4.5;
  if (o.kind === 'star') return o.size * 4.2;
  return o.size * 5;
}

function imageToCloudTexture(image, color) {
  const srcW = image.width || 512;
  const srcH = image.height || 512;
  const size = 512;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const scale = Math.max(size / srcW, size / srcH);
  const dw = srcW * scale;
  const dh = srcH * scale;
  ctx.drawImage(image, (size - dw) / 2, (size - dh) / 2, dw, dh);

  const data = ctx.getImageData(0, 0, size, size);
  const px = data.data;
  const col = new THREE.Color(color);
  const cr = col.r * 255, cg = col.g * 255, cb = col.b * 255;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
    const nx = (i / 4) % size / size * 2 - 1;
    const ny = Math.floor(i / 4 / size) / size * 2 - 1;
    const edge = Math.max(0, 1 - Math.hypot(nx, ny));
    px[i] = Math.min(255, px[i] * 0.75 + cr * 0.25);
    px[i + 1] = Math.min(255, px[i + 1] * 0.75 + cg * 0.25);
    px[i + 2] = Math.min(255, px[i + 2] * 0.75 + cb * 0.25);
    px[i + 3] = Math.min(255, lum * 255 * Math.pow(edge, 0.45) * 1.35);
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function reconstructGlobularFromPhoto(image, radius, maxStars = 38000) {
  const sample = 280;
  const c = document.createElement('canvas');
  c.width = c.height = sample;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const srcW = image.width || sample;
  const srcH = image.height || sample;
  const cover = Math.max(sample / srcW, sample / srcH);
  ctx.drawImage(image, (sample - srcW * cover) / 2, (sample - srcH * cover) / 2, srcW * cover, srcH * cover);
  const px = ctx.getImageData(0, 0, sample, sample).data;

  const candidates = [];
  for (let y = 0; y < sample; y++) {
    for (let x = 0; x < sample; x++) {
      const i = (y * sample + x) * 4;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
      if (lum < 0.07) continue;
      const nx = ((x + 0.5) / sample) * 2 - 1;
      const ny = 1 - ((y + 0.5) / sample) * 2;
      if (nx * nx + ny * ny > 0.98) continue;
      candidates.push({ nx, ny, lum, r, g, b });
    }
  }

  const positions = [];
  const colors = [];
  const sizes = [];
  const extra = Math.max(1, Math.ceil(maxStars / Math.max(1, candidates.length)));

  for (const p of candidates) {
    const copies = p.lum > 0.55 ? extra + 1 : extra;
    const chord = Math.sqrt(Math.max(0.0001, 1 - p.nx * p.nx - p.ny * p.ny));
    for (let n = 0; n < copies && positions.length / 3 < maxStars; n++) {
      const jitter = 0.012 * (1 - p.lum);
      const x = (p.nx + (Math.random() - 0.5) * jitter) * radius;
      const y = (p.ny + (Math.random() - 0.5) * jitter) * radius;
      const z = (Math.random() * 2 - 1) * chord * radius;
      positions.push(x, y, z);
      const boost = 0.55 + p.lum * 0.7;
      colors.push(
        Math.min(1, (p.r / 255) * boost),
        Math.min(1, (p.g / 255) * boost),
        Math.min(1, (p.b / 255) * boost)
      );
      sizes.push(0.18 + p.lum * 0.7);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
  return geo;
}

function buildOmegaCentauri(o, image) {
  const group = new THREE.Group();
  group.position.copy(o.pos);
  const radius = 22;
  const geo = reconstructGlobularFromPhoto(image, radius);

  const mat = new THREE.PointsMaterial({
    size: 0.42,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: glowSprite(0xfff4d6),
    sizeAttenuation: true,
  });
  const stars = new THREE.Points(geo, mat);
  group.add(stars);

  o.photoGroup = group;
  o.photoWidth = radius * 2.2;
  o.reconstructed = true;
  o.spinMesh = stars;
  if (o.core) o.core.visible = false;
  if (o.sprite) o.sprite.visible = false;
  scene.add(group);
}

function addStarField(group, count, radius, color) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 0.55) * radius;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.cos(p);
    pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  group.add(new THREE.Points(g, new THREE.PointsMaterial({
    color, size: 0.55, transparent: true, opacity: 0.9,
    depthWrite: false, blending: THREE.AdditiveBlending, map: glowSprite(color),
  })));
}

function buildObjectModel(o, photoTex) {
  if (o.kind === 'blackhole') return;
  if (o.id === 'omega-cen' && photoTex?.image) {
    buildOmegaCentauri(o, photoTex.image);
    return;
  }

  const group = new THREE.Group();
  group.position.copy(o.pos);
  const s = modelSize(o);

  if (o.kind === 'star') {
    const mat = new THREE.MeshBasicMaterial({
      map: photoTex || null,
      color: photoTex ? 0xffffff : o.color,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(s * 0.38, 48, 48), mat);
    group.add(body);
    const corona = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(o.color), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.85,
    }));
    corona.scale.set(s * 2.4, s * 2.4, 1);
    group.add(corona);
    o.spinMesh = body;
  } else if (o.kind === 'cluster' || o.kind === 'core') {
    const wrap = new THREE.Mesh(
      new THREE.SphereGeometry(s * 0.42, 48, 48),
      new THREE.MeshBasicMaterial({
        map: photoTex || null,
        color: photoTex ? 0xffffff : o.color,
        transparent: true,
        opacity: 0.92,
      })
    );
    group.add(wrap);
    addStarField(group, o.kind === 'core' ? 900 : 1400, s * 0.7, o.color);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(o.color), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.45,
    }));
    halo.scale.set(s * 2.1, s * 2.1, 1);
    group.add(halo);
    o.spinMesh = wrap;
  } else if (o.kind === 'system') {
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(s * 0.22, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xffdd66 })
    );
    group.add(sun);
    const orbit = new THREE.Mesh(
      new THREE.RingGeometry(s * 0.4, s * 0.55, 48),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide, transparent: true, opacity: 0.35 })
    );
    orbit.rotation.x = Math.PI / 2.4;
    group.add(orbit);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(o.color), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.7,
    }));
    halo.scale.set(s * 1.8, s * 1.8, 1);
    group.add(halo);
  } else {
    const cloudTex = photoTex ? imageToCloudTexture(photoTex.image, o.color) : glowSprite(o.color);
    const mat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const aspect = photoTex?.image ? (photoTex.image.width / photoTex.image.height) : 1.3;
    const w = s;
    const h = s / Math.max(0.7, Math.min(aspect, 1.8));
    const geo = new THREE.PlaneGeometry(w, h);
    for (let i = 0; i < 5; i++) {
      const plane = new THREE.Mesh(geo, i === 0 ? mat : mat.clone());
      plane.material.opacity = i === 0 ? 0.95 : 0.38;
      plane.rotation.y = (i / 5) * Math.PI;
      plane.rotation.x = (i % 2) * 0.18;
      group.add(plane);
    }
    addStarField(group, 220, s * 0.45, o.color);
    o.spinMesh = group;
  }

  o.photoGroup = group;
  o.photoWidth = s;
  if (o.core) o.core.visible = false;
  if (o.sprite) o.sprite.visible = false;
  scene.add(group);
}

function loadObjectPhotos() {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  return Promise.all(OBJECTS.map((o) => new Promise((resolve) => {
    if (o.kind === 'blackhole') { resolve(); return; }
    if (!o.image) {
      buildObjectModel(o, null);
      resolve();
      return;
    }
    loader.load(
      o.image,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        buildObjectModel(o, tex);
        resolve();
      },
      undefined,
      () => {
        buildObjectModel(o, null);
        resolve();
      }
    );
  })));
}

function buildObjects() {
  for (const o of OBJECTS) {
    o.pos = objectWorldPos(o);

    // Спрайт-точка (кроме чёрной дыры — у неё свой диск, но добавим маркер поверх)
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(o.color), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.95,
    }));
    sprite.position.copy(o.pos);
    sprite.scale.set(o.size * 2.4, o.size * 2.4, 1);
    sprite.userData.obj = o;
    scene.add(sprite);
    o.sprite = sprite;

    // Ядро-точка (яркая)
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(o.size * 0.35, 16, 16),
      new THREE.MeshBasicMaterial({ color: o.color })
    );
    core.position.copy(o.pos);
    core.userData.obj = o;
    scene.add(core);
    pickables.push(core);
    o.core = core;

    // HTML-подпись
    const el = document.createElement('button');
    el.className = 'gx-label' + (o.solar ? ' solar' : '') + (o.kind === 'blackhole' ? ' bh' : '') + (o.id === 'omega-cen' ? ' omega' : '');
    el.innerHTML = `<span class="dot" style="--c:#${o.color.toString(16).padStart(6, '0')}"></span><span class="txt">${o.name}</span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); jumpTo(o); });
    el.addEventListener('mouseenter', () => setHover(o));
    el.addEventListener('mouseleave', () => setHover(null));
    labelLayer.appendChild(el);
    o.label = el;
    labels.push(o);
  }
}

// ─── Камера-орбита ───────────────────────────────────────────────────────────
const cam = {
  azimuth: 0.6, elevation: 0.62, distance: 340,
  tAzimuth: 0.6, tElevation: 0.62, tDistance: 340,
  target: new THREE.Vector3(0, 0, 0),
  tTarget: new THREE.Vector3(0, 0, 0),
};

function applyCamera() {
  cam.azimuth += (cam.tAzimuth - cam.azimuth) * 0.09;
  cam.elevation += (cam.tElevation - cam.elevation) * 0.09;
  cam.distance += (cam.tDistance - cam.distance) * 0.09;
  cam.target.lerp(cam.tTarget, 0.09);

  const x = Math.sin(cam.azimuth) * Math.cos(cam.elevation) * cam.distance;
  const y = Math.sin(cam.elevation) * cam.distance;
  const z = Math.cos(cam.azimuth) * Math.cos(cam.elevation) * cam.distance;
  camera.position.set(cam.target.x + x, cam.target.y + y, cam.target.z + z);
  camera.lookAt(cam.target);
}

// ─── Управление мышью ────────────────────────────────────────────────────────
let dragging = false, lastX = 0, lastY = 0, moved = 0;
const raycaster = new THREE.Raycaster();
raycaster.params.Points = { threshold: 4 };
const pointer = new THREE.Vector2();

canvas.addEventListener('pointerdown', (e) => {
  dragging = true; lastX = e.clientX; lastY = e.clientY; moved = 0;
});
window.addEventListener('pointerup', (e) => {
  if (dragging && moved < 6) pickAt(e.clientX, e.clientY);
  dragging = false;
});
window.addEventListener('pointermove', (e) => {
  if (dragging) {
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    moved += Math.abs(dx) + Math.abs(dy);
    lastX = e.clientX; lastY = e.clientY;
    if (warpState.active) return;
    cam.tAzimuth -= dx * 0.005;
    cam.tElevation = THREE.MathUtils.clamp(cam.tElevation + dy * 0.005, -1.3, 1.3);
  } else {
    hoverAt(e.clientX, e.clientY);
  }
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (warpState.active) return;
  cam.tDistance = THREE.MathUtils.clamp(cam.tDistance * (1 + e.deltaY * 0.0012), 20, 900);
}, { passive: false });

function screenToNdc(x, y) {
  pointer.x = (x / window.innerWidth) * 2 - 1;
  pointer.y = -(y / window.innerHeight) * 2 + 1;
}

function pickObject(x, y) {
  screenToNdc(x, y);
  raycaster.setFromCamera(pointer, camera);
  // приоритет — по экранной близости к точкам
  let best = null, bestD = 90;
  for (const o of OBJECTS) {
    const p = o.pos.clone().project(camera);
    if (p.z > 1) continue;
    const sx = (p.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-p.y * 0.5 + 0.5) * window.innerHeight;
    const d = Math.hypot(sx - x, sy - y);
    if (d < bestD) { bestD = d; best = o; }
  }
  return best;
}

function pickAt(x, y) {
  if (warpState.active) return;
  const o = pickObject(x, y);
  if (o) jumpTo(o);
}

function hoverAt(x, y) {
  if (warpState.active) return;
  const o = pickObject(x, y);
  setHover(o);
  canvas.style.cursor = o ? 'pointer' : 'grab';
}

let hovered = null;
function setHover(o) {
  if (hovered === o) return;
  if (hovered) hovered.label.classList.remove('hover');
  hovered = o;
  if (hovered) hovered.label.classList.add('hover');
}

// ─── Гиперпрыжок (скорость света) ────────────────────────────────────────────
const warpCtx = warp.getContext('2d');
let WW = 0, WH = 0, WCX = 0, WCY = 0;
const streaks = [];
for (let i = 0; i < 380; i++) {
  streaks.push({ angle: Math.random() * Math.PI * 2, dist: Math.random() * 400, speed: 6 + Math.random() * 16, len: 40 + Math.random() * 180, hue: 190 + Math.random() * 80 });
}
function resizeWarp() {
  WW = warp.width = window.innerWidth;
  WH = warp.height = window.innerHeight;
  WCX = WW / 2; WCY = WH / 2;
}
resizeWarp();

function drawStreaks(intensity) {
  warpCtx.clearRect(0, 0, WW, WH);
  warpCtx.globalCompositeOperation = 'lighter';
  const maxR = Math.hypot(WCX, WCY) * 1.25;
  for (const s of streaks) {
    s.dist += s.speed * intensity;
    if (s.dist > maxR) s.dist = Math.random() * 30;
    const c = Math.cos(s.angle), sn = Math.sin(s.angle);
    const l = s.len * intensity * (0.35 + s.dist / maxR);
    const a = Math.min(1, intensity) * (0.25 + 0.75 * (s.dist / maxR));
    warpCtx.strokeStyle = `hsla(${s.hue},100%,82%,${a})`;
    warpCtx.lineWidth = 1 + intensity * 2.2;
    warpCtx.beginPath();
    warpCtx.moveTo(WCX + c * s.dist, WCY + sn * s.dist);
    warpCtx.lineTo(WCX + c * (s.dist + l), WCY + sn * (s.dist + l));
    warpCtx.stroke();
  }
  warpCtx.globalCompositeOperation = 'source-over';
}

const warpState = {
  active: false, t: 0, dur: 110, obj: null,
  fromPos: new THREE.Vector3(), fromTarget: new THREE.Vector3(),
  fromDist: 0, toDist: 0, fromAz: 0, toAz: 0, fromEl: 0, toEl: 0,
};

function jumpTo(o) {
  if (warpState.active) return;
  setHover(null);
  hideInfo();
  statusEl.textContent = `🚀 Прыжок на скорости света → ${o.name}`;

  warpState.active = true;
  warpState.t = 0;
  warpState.obj = o;
  warpState.fromTarget.copy(cam.target);
  warpState.fromDist = cam.distance;
  warpState.fromAz = cam.azimuth;
  warpState.fromEl = cam.elevation;

  // Куда летим
  cam.tTarget.copy(o.pos);
  warpState.toDist = o.solar ? 26 : Math.max((o.photoWidth || modelSize(o)) * 1.35, 22);
  warpState.toAz = cam.azimuth + 0.5;
  warpState.toEl = 0.3;

  warp.classList.add('active');
}

function updateWarp() {
  if (!warpState.active) return;
  warpState.t++;
  const p = Math.min(1, warpState.t / warpState.dur);
  // интенсивность тоннеля: разгон → пик → торможение
  const intensity = Math.sin(p * Math.PI) * 2.2 + 0.05;
  drawStreaks(intensity);
  warp.style.opacity = String(Math.min(1, Math.sin(p * Math.PI) * 1.4));

  const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
  cam.target.copy(warpState.fromTarget).lerp(warpState.obj.pos, e);
  cam.tTarget.copy(warpState.obj.pos);
  cam.distance = THREE.MathUtils.lerp(warpState.fromDist, warpState.toDist, e);
  cam.tDistance = warpState.toDist;
  cam.azimuth = THREE.MathUtils.lerp(warpState.fromAz, warpState.toAz, e);
  cam.tAzimuth = warpState.toAz;
  cam.elevation = THREE.MathUtils.lerp(warpState.fromEl, warpState.toEl, e);
  cam.tElevation = warpState.toEl;

  if (p >= 1) finishWarp();
}

function finishWarp() {
  const o = warpState.obj;
  warpState.active = false;
  warp.classList.remove('active');
  warpCtx.clearRect(0, 0, WW, WH);
  warp.style.opacity = '0';

  if (o.solar) {
    // Вспышка и переход в детальный симулятор Солнечной системы
    flash.classList.add('flash-out');
    statusEl.textContent = 'Вход в Солнечную систему…';
    setTimeout(() => { location.href = 'solar.html?from=galaxy'; }, 650);
    return;
  }
  showInfo(o);
  statusEl.textContent = `📍 ${o.name}. Клик по другому объекту — новый прыжок.`;
}

function returnToOverview() {
  hideInfo();
  cam.tTarget.set(0, 0, 0);
  cam.tDistance = 340;
  cam.tElevation = 0.62;
  statusEl.textContent = 'Обзор Галактики. Кликните на объект, чтобы прыгнуть к нему.';
}

// ─── Инфо-панель ─────────────────────────────────────────────────────────────
function showInfo(o) {
  const credit = o.imageCredit ? `<span class="gx-info-photo-credit">${o.imageCredit}</span>` : '';
  infoPanel.innerHTML = `
    <button class="gx-info-close" aria-label="Закрыть">✕</button>
    <figure class="gx-info-photo">
      <img src="${o.image || IMG_FALLBACK}" alt="${o.name}" loading="lazy">
      ${credit}
    </figure>
    <div class="gx-info-head">
      <span class="gx-info-dot" style="background:#${o.color.toString(16).padStart(6, '0')}"></span>
      <div>
        <h2>${o.name}</h2>
        <p>${o.type}</p>
      </div>
    </div>
    <p class="gx-info-desc">${o.desc}</p>
    <div class="gx-info-grid">
      <div><span>Расстояние от Земли</span><b>${o.distEarth}</b></div>
      <div><span>От центра Галактики</span><b>${o.distCenter}</b></div>
      <div class="wide"><span>Факт</span><b>${o.extra}</b></div>
    </div>
    <button class="gx-info-back">← Вернуться к обзору Галактики</button>
  `;
  infoPanel.classList.add('open');
  const img = infoPanel.querySelector('.gx-info-photo img');
  img.onerror = () => { img.src = IMG_FALLBACK; };
  infoPanel.querySelector('.gx-info-close').onclick = hideInfo;
  infoPanel.querySelector('.gx-info-back').onclick = returnToOverview;
}
function hideInfo() { infoPanel.classList.remove('open'); }

// ─── Подписи: проекция 3D → экран ────────────────────────────────────────────
const _v = new THREE.Vector3();
function updateLabels() {
  for (const o of OBJECTS) {
    _v.copy(o.pos).project(camera);
    const behind = _v.z > 1;
    if (behind) { o.label.style.display = 'none'; continue; }
    const sx = (_v.x * 0.5 + 0.5) * window.innerWidth;
    const sy = (-_v.y * 0.5 + 0.5) * window.innerHeight;
    o.label.style.display = 'flex';
    o.label.style.left = sx + 'px';
    o.label.style.top = sy + 'px';
    // затухание далёких подписей
    const dist = camera.position.distanceTo(o.pos);
    o.label.style.opacity = String(THREE.MathUtils.clamp(1.3 - dist / 700, 0.25, 1));
  }
}

// ─── Анимация ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let blackHole;

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  const t = clock.getElapsedTime();

  armsGroup.rotation.y += dt * 0.012;          // медленное вращение Галактики
  if (blackHole) blackHole.disk.rotation.z += dt * 0.5;

  // пульсация точек и лёгкое «дыхание» туманностей
  for (const o of OBJECTS) {
    if (o.sprite) {
      const pulse = o.size * 2.4 * (1 + Math.sin(t * 2 + o.a) * 0.06) * (hovered === o ? 1.5 : 1);
      o.sprite.scale.set(pulse, pulse, 1);
      o.sprite.visible = !o.photoGroup && o.kind !== 'blackhole';
    }
    if (o.photoGroup) {
      const breathe = 1 + Math.sin(t * 0.35 + o.a) * 0.025;
      o.photoGroup.scale.setScalar(breathe * (hovered === o ? 1.08 : 1));
      if (o.spinMesh) o.spinMesh.rotation.y += dt * (o.kind === 'nebula' ? 0.08 : 0.15);
    }
  }

  updateWarp();
  applyCamera();
  updateLabels();
  renderer.render(scene, camera);
}

// ─── Ресайз ──────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  resizeWarp();
});

// ─── Прибытие из Солнечной системы ───────────────────────────────────────────
function arrivalIntro() {
  const params = new URLSearchParams(location.search);
  if (params.get('from') !== 'solar') return;
  const solar = OBJECTS.find(o => o.solar);
  // старт: вплотную у Солнечной системы, затем плавный выход в обзор
  cam.target.copy(solar.pos);
  cam.tTarget.copy(solar.pos);
  cam.distance = 20; cam.tDistance = 340;
  cam.tTarget.set(0, 0, 0);
  cam.tElevation = 0.62;
  warp.classList.add('active');
  flash.classList.add('flash-in');
  let f = 0; const dur = 80;
  (function decel() {
    f++;
    const p = f / dur;
    drawStreaks((1 - p) * 1.8 + 0.05);
    warp.style.opacity = String(Math.max(0, 1 - p));
    if (f < dur) requestAnimationFrame(decel);
    else { warp.classList.remove('active'); warpCtx.clearRect(0, 0, WW, WH); }
  })();
}

// ─── Запуск ──────────────────────────────────────────────────────────────────
buildGalaxyDisk();
addGalaxyPhotoDisk();
blackHole = buildBlackHole();
buildObjects();
loadObjectPhotos().then(() => {
  if (loadingEl) loadingEl.classList.add('hidden');
  statusEl.textContent = 'Кликни «Омега Центавра» — 3D-шар звёзд по снимку Hubble.';
});
arrivalIntro();
animate();

const vt = document.getElementById('version-tag');
if (vt) vt.textContent = APP_VERSION;
