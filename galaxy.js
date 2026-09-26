import * as THREE from 'three';

// ─── DOM ────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('scene');
const labelLayer = document.getElementById('labels');
const warp = document.getElementById('warp-overlay');
const flash = document.getElementById('warp-flash');
const statusEl = document.getElementById('gx-status');
const loadingEl = document.getElementById('loading');
const infoPanel = document.getElementById('gx-info');
const APP_VERSION = 'v17';
const IMG_FALLBACK = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Pleiades_large.jpg/960px-Pleiades_large.jpg';
const NASA = (id) => `https://images-assets.nasa.gov/image/${id}/${id}~medium.jpg`;
const WIKI = (file, w = 1280) => {
  const name = file.split('/').pop();
  return encodeURI(`https://upload.wikimedia.org/wikipedia/commons/thumb/${file}/${w}px-${name}`);
};

// ─── Ключевые объекты Млечного Пути ──────────────────────────────────────────
// r — доля радиуса диска (0 = центр), a — угол на диске (°), y — высота над плоскостью
const MAX_R = 150;
const OBJECTS = [
  {
    id: 'sgr-a', name: 'Стрелец A*', kind: 'blackhole', model: 'blackhole',
    r: 0, a: 0, y: 0, color: 0xffaa33, size: 5.5,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/EHT_Saggitarius_A_black_hole.tif/lossy-page1-1280px-EHT_Saggitarius_A_black_hole.tif.jpg',
    imageCredit: 'Event Horizon Telescope / ESO / NASA',
    type: 'Сверхмассивная чёрная дыра',
    desc: 'Сердце нашей Галактики. Сверхмассивная чёрная дыра массой около 4,3 миллиона Солнц. Вокруг неё вращается весь Млечный Путь.',
    distEarth: '≈ 26 000 св. лет', distCenter: '0 (это и есть центр)',
    extra: 'Диаметр горизонта событий ≈ 24 млн км',
  },
  {
    id: 'bulge', name: 'Галактический балдж', kind: 'core', model: 'bulge',
    r: 0.14, a: 120, y: 0, color: 0xffd27f, size: 3.2,
    image: NASA('PIA12348'),
    imageCredit: 'NASA / Hubble / Spitzer / Chandra',
    type: 'Центральное сгущение звёзд',
    desc: 'Плотное скопление миллиардов старых звёзд вокруг центра. Здесь звёзды расположены в тысячи раз плотнее, чем возле Солнца.',
    distEarth: '≈ 26 000 св. лет', distCenter: '≈ 3 000 св. лет',
    extra: 'Возраст большинства звёзд — более 10 млрд лет',
  },
  {
    id: 'solar', name: 'Солнечная система', kind: 'system', model: 'system', solar: true,
    r: 0.6, a: 25, y: 1.5, color: 0xffe08a, size: 3.4,
    image: NASA('PIA01341'),
    imageCredit: 'NASA / JPL',
    type: 'Наш дом · рукав Ориона',
    desc: 'Наша звёздная система в рукаве Ориона. Отсюда мы наблюдаем всю Галактику. Нажмите, чтобы прыгнуть внутрь и исследовать планеты!',
    distEarth: '0 (мы здесь)', distCenter: '≈ 26 000 св. лет',
    extra: 'Один оборот вокруг центра — ≈ 225 млн лет',
  },
  {
    id: 'proxima', name: 'Проксима Центавра', kind: 'star', model: 'star',
    r: 0.605, a: 22, y: 1.2, color: 0xff5533, size: 2.0,
    image: WIKI('e/ec/Proxima_Centauri.jpg', 1280),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Красный карлик · ближайшая звезда',
    desc: 'Ближайшая к Солнцу звезда. Красный карлик с планетой Proxima b в зоне обитаемости. Свет от неё летит к нам более 4 лет.',
    distEarth: '4,24 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'Часть тройной системы Альфа Центавра',
    star: { radius: 1.6, corona: 5.2, spots: 0.45, cells: 0.2 },
  },
  {
    id: 'sirius', name: 'Сириус', kind: 'star', model: 'star',
    r: 0.62, a: 33, y: 2.0, color: 0xcfe6ff, size: 2.4,
    image: 'https://upload.wikimedia.org/wikipedia/commons/f/f3/Sirius_A_and_B_Hubble_photo.jpg',
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Ярчайшая звезда неба',
    desc: 'Самая яркая звезда ночного неба. Двойная система: бело-голубой Сириус A и белый карлик Сириус B.',
    distEarth: '8,6 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'В 25 раз ярче Солнца',
    star: { radius: 3.1, corona: 9.5, companion: true, cells: 0.12 },
  },
  {
    id: 'vega', name: 'Вега', kind: 'star', model: 'star',
    r: 0.58, a: 40, y: 3.0, color: 0xe8f0ff, size: 2.2,
    image: 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Vega.jpg',
    imageCredit: 'DSS / NASA',
    type: 'Звезда созвездия Лиры',
    desc: 'Одна из самых известных звёзд неба, служила эталоном яркости. Около 12 000 лет назад была Полярной звездой.',
    distEarth: '25 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Окружена диском пыли — возможной планетной системой',
    star: { radius: 2.8, corona: 8.4, disk: true, cells: 0.14 },
  },
  {
    id: 'polaris', name: 'Полярная звезда', kind: 'star', model: 'star',
    r: 0.63, a: 15, y: 3.5, color: 0xfff2c8, size: 2.3,
    image: 'https://upload.wikimedia.org/wikipedia/commons/5/59/Polaris.jpg',
    imageCredit: 'DSS / NASA',
    type: 'Северная путеводная звезда',
    desc: 'Указывает на север и почти не движется по небу. Жёлтый сверхгигант-цефеида, по которому веками ориентировались мореплаватели.',
    distEarth: '≈ 433 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'В 2500 раз ярче Солнца',
    star: { radius: 3.4, corona: 10, companions: true, cells: 0.18 },
  },
  {
    id: 'betelgeuse', name: 'Бетельгейзе', kind: 'star', model: 'star',
    r: 0.66, a: 48, y: -2.0, color: 0xff4411, size: 2.9,
    image: WIKI('5/57/Betelgeuse_captured_by_ALMA.jpg', 1280),
    imageCredit: 'ALMA / ESO / NAOJ / NRAO',
    type: 'Красный сверхгигант',
    desc: 'Огромная умирающая звезда в созвездии Ориона. Если поставить её на место Солнца, она поглотила бы орбиту Юпитера. Готова взорваться сверхновой.',
    distEarth: '≈ 640 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Диаметр ≈ 1 млрд км',
    star: { radius: 6.8, corona: 18, cells: 0.7, spots: 0.25, giant: true },
  },
  {
    id: 'pleiades', name: 'Плеяды (M45)', kind: 'cluster', model: 'open-cluster',
    r: 0.64, a: 58, y: 4.0, color: 0x9fc4ff, size: 3.0,
    image: WIKI('4/4e/Pleiades_large.jpg', 960),
    imageCredit: 'NASA / ESA / AURA / Caltech',
    type: 'Рассеянное звёздное скопление',
    desc: 'Молодые голубые звёзды, окутанные туманностью. Видны невооружённым глазом как «Семь сестёр».',
    distEarth: '≈ 444 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'Возраст ≈ 100 млн лет',
  },
  {
    id: 'orion-neb', name: 'Туманность Ориона', kind: 'nebula', model: 'nebula',
    r: 0.68, a: 52, y: -3.5, color: 0xff88cc, size: 4.2,
    image: WIKI('f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg', 1280),
    imageCredit: 'NASA / ESA / M. Robberto',
    type: 'Область звездообразования (M42)',
    desc: 'Ближайший к нам «звёздный роддом» — гигантское облако газа, где прямо сейчас рождаются новые звёзды и планеты.',
    distEarth: '≈ 1 344 св. года', distCenter: '≈ 26 000 св. лет',
    extra: 'Диаметр ≈ 24 св. года',
  },
  {
    id: 'crab', name: 'Крабовидная туманность', kind: 'nebula', model: 'nebula',
    r: 0.5, a: 70, y: 6.0, color: 0x66ffcc, size: 3.6,
    image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Crab_Nebula.jpg/960px-Crab_Nebula.jpg',
    imageCredit: 'NASA / ESA / ASU',
    type: 'Остаток сверхновой (M1)',
    desc: 'Останки звезды, взорвавшейся в 1054 году — вспышку видели китайские астрономы днём. В центре крутится нейтронная звезда-пульсар.',
    distEarth: '≈ 6 500 св. лет', distCenter: '≈ 20 000 св. лет',
    extra: 'Расширяется со скоростью 1 500 км/с',
  },
  {
    id: 'eagle', name: 'Столпы Творения', kind: 'nebula', model: 'nebula',
    r: 0.42, a: 95, y: -5.0, color: 0xffbb66, size: 4.4,
    image: WIKI('8/81/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res.jpg', 1280),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Туманность Орла (M16)',
    desc: 'Знаменитые «Столпы Творения» — колонны газа и пыли высотой в световые годы, где формируются новые звёзды. Прославлены снимком «Хаббла».',
    distEarth: '≈ 5 700 св. лет', distCenter: '≈ 20 000 св. лет',
    extra: 'Высота столпов ≈ 4–5 св. лет',
    silhouette: true,
  },
  {
    id: 'carina', name: 'Туманность Киля', kind: 'nebula', model: 'nebula',
    r: 0.38, a: 200, y: 4.0, color: 0xff99aa, size: 4.6,
    image: WIKI('e/ea/Carina_Nebula.jpg', 1280),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Область η Киля (NGC 3372)',
    desc: 'Одна из крупнейших туманностей неба. Внутри — Эта Киля, гипергигант, который может взорваться как гиперновая.',
    distEarth: '≈ 7 500 св. лет', distCenter: '≈ 18 000 св. лет',
    extra: 'В 100 раз больше Туманности Ориона',
  },
  {
    id: 'omega-cen', name: 'Омега Центавра', kind: 'cluster', model: 'globular',
    r: 0.82, a: 230, y: 18.0, color: 0xffe0a0, size: 8.5,
    image: WIKI('5/53/Globular_star_cluster_Omega_Centauri_(NGC_5139,_by_the_Hubble_Space_Telescope).jpg', 1280),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Шаровое скопление (ω Cen)',
    desc: 'Крупнейшее шаровое скопление Галактики — почти 10 миллионов звёзд в шаре. Возможно, ядро поглощённой карликовой галактики.',
    distEarth: '≈ 17 000 св. лет', distCenter: '≈ 21 000 св. лет',
    extra: 'Возраст ≈ 12 млрд лет',
  },
  {
    id: 'horsehead', name: 'Конская Голова', kind: 'nebula', model: 'nebula',
    r: 0.67, a: 55, y: -2.2, color: 0xff7744, size: 3.8,
    image: WIKI('6/68/Barnard_33.jpg', 1280),
    imageCredit: 'ESO / NASA',
    type: 'Тёмная туманность (Barnard 33)',
    desc: 'Силуэт пылевого облака на фоне светящегося газа — одно из самых узнаваемых изображений космоса. Находится в созвездии Ориона.',
    distEarth: '≈ 1 375 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: '«Голова» ≈ 3,5 св. года в поперечнике',
    silhouette: true,
  },
  {
    id: 'helix', name: 'Туманность Улитка', kind: 'nebula', model: 'planetary',
    r: 0.55, a: 310, y: -4.0, color: 0x66ddff, size: 4.0,
    image: WIKI('b/b1/NGC7293_(2004).jpg', 1280),
    imageCredit: 'NASA / ESA / Hubble / C. R. O\'Dell',
    type: 'Планетарная туманность (NGC 7293)',
    desc: 'Остаток умирающей звезды, похожий на глаз. То, чем Солнце станет через миллиарды лет, сбросив внешние слои.',
    distEarth: '≈ 650 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Ближайшая к нам планетарная туманность',
  },
  {
    id: 'south-ring', name: 'Южное Кольцо', kind: 'nebula', model: 'planetary',
    r: 0.48, a: 175, y: 5.5, color: 0xaad4ff, size: 3.9,
    image: 'https://upload.wikimedia.org/wikipedia/commons/a/af/NGC_3132.jpg',
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Планетарная туманность (NGC 3132)',
    desc: 'Кольцо сброшенного газа вокруг умирающей звезды. В центре — горячий белый карлик, который подсвечивает оболочку.',
    distEarth: '≈ 2 000 св. лет', distCenter: '≈ 25 000 св. лет',
    extra: 'Диаметр ≈ 0,5 св. года',
  },
  {
    id: 'rho-oph', name: 'Ро Офиуха', kind: 'nebula', model: 'nebula',
    r: 0.61, a: 8, y: 2.8, color: 0xff99cc, size: 4.5,
    image: WIKI('3/3d/Rho_Ophiuchi_cloud_complex_(weic2316a).jpg', 1280),
    imageCredit: 'NASA / ESA / CSA / JWST',
    type: 'Область звездообразования',
    desc: 'Одна из ближайших колыбелей звёзд. Снимок JWST показывает молодые светила, струи газа и цветные облака пыли рядом с Солнечной системой.',
    distEarth: '≈ 390 св. лет', distCenter: '≈ 26 000 св. лет',
    extra: 'Одно из ближайших к нам мест рождения звёзд',
  },
  {
    id: 'westerlund2', name: 'Вестерлунд 2', kind: 'cluster', model: 'young-cluster',
    r: 0.36, a: 215, y: -3.0, color: 0xff88aa, size: 4.0,
    image: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Westerlund_2.jpg',
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Молодое массивное скопление',
    desc: 'Тысячи новорождённых звёзд внутри туманности Gum 29. Снимок Hubble к 25-летию телескопа.',
    distEarth: '≈ 20 000 св. лет', distCenter: '≈ 16 000 св. лет',
    extra: 'Возраст скопления ≈ 2 млн лет',
  },
  {
    id: 'lagoon', name: 'Туманность Лагуна', kind: 'nebula', model: 'nebula',
    r: 0.4, a: 105, y: 3.2, color: 0xff6699, size: 4.3,
    image: WIKI('c/c4/Lagoon_Nebula.jpg', 1280),
    imageCredit: 'NASA / ESA / Hubble',
    type: 'Эмиссионная туманность (M8)',
    desc: 'Яркое облако в Стрельце, видимое даже в бинокль. Внутри — «час песочных часов» и молодые горячие звёзды.',
    distEarth: '≈ 4 100 св. лет', distCenter: '≈ 21 000 св. лет',
    extra: 'Диаметр ≈ 110 × 50 св. лет',
  },
  {
    id: 'cats-paw', name: 'Кошачья Лапа', kind: 'nebula', model: 'nebula',
    r: 0.33, a: 145, y: -4.5, color: 0xff5566, size: 4.1,
    image: WIKI('0/06/NGC_6334.jpg', 1280),
    imageCredit: 'ESO / NASA',
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
const armMats = [];
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
  armMats.push(m);

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
  armMats.push(armsGroup.children[armsGroup.children.length - 1].material);
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
  if (o.model === 'globular') return 40;
  if (o.model === 'planetary') return 30;
  if (o.model === 'nebula') return o.size * 8.2;
  if (o.model === 'open-cluster') return 22;
  if (o.model === 'young-cluster') return 28;
  if (o.model === 'bulge') return 26;
  if (o.model === 'system') return 16;
  if (o.model === 'star') return o.star?.corona || 8;
  return o.size * 5;
}

function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seedFromId(id) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

function attachModel(o, group, width) {
  group.position.copy(o.pos);
  o.photoGroup = group;
  o.photoWidth = width;
  if (o.core) o.core.visible = false;
  if (o.sprite) o.sprite.visible = false;
  scene.add(group);
}

function makePoints(positions, colors, pointSize = 0.2) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: pointSize,
    vertexColors: true,
    transparent: true,
    opacity: 0.95,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    map: glowSprite(0xffffff),
    sizeAttenuation: true,
  });
  return new THREE.Points(geo, mat);
}

function samplePhotoColors(image, maxSamples = 6000) {
  if (!image) return [];
  const sample = 220;
  const c = document.createElement('canvas');
  c.width = c.height = sample;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const srcW = image.width || sample;
  const srcH = image.height || sample;
  const cover = Math.max(sample / srcW, sample / srcH);
  ctx.drawImage(image, (sample - srcW * cover) / 2, (sample - srcH * cover) / 2, srcW * cover, srcH * cover);
  const px = ctx.getImageData(0, 0, sample, sample).data;
  const out = [];
  const step = 2;
  for (let y = 0; y < sample; y += step) {
    for (let x = 0; x < sample; x += step) {
      const i = (y * sample + x) * 4;
      const r = px[i], g = px[i + 1], b = px[i + 2];
      const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
      if (lum < 0.12) continue;
      out.push({ r: r / 255, g: g / 255, b: b / 255, lum });
      if (out.length >= maxSamples) return out;
    }
  }
  return out;
}

function photoAlphaTexture(image) {
  const maxDim = 768;
  const srcW = image.width || 512;
  const srcH = image.height || 512;
  const scale = maxDim / Math.max(srcW, srcH);
  const w = Math.max(2, Math.round(srcW * scale));
  const h = Math.max(2, Math.round(srcH * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const lum = (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11) / 255;
    px[i + 3] = lum < 0.05 ? 0 : Math.min(255, (lum - 0.04) * 1.55 * 255);
  }
  ctx.putImageData(data, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function photosphereTexture(hex, spec) {
  const w = 512, h = 256;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(hex);
  const rand = mulberry32(Math.round(hex) ^ 0x9e3779b9);
  const img = ctx.createImageData(w, h);
  const px = img.data;
  const cells = spec.cells ?? 0.2;
  const spots = spec.spots ?? 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const n =
        Math.sin(u * 28 + rand() * 4) * Math.sin(v * 18 + 1.7) * 0.35 +
        Math.sin(u * 71 + 2.1) * Math.sin(v * 53) * 0.18 +
        Math.sin((u + v) * 90) * 0.08;
      const grain = 1 + n * cells;
      let r = col.r * grain, g = col.g * grain, b = col.b * grain;
      if (spec.giant) {
        r = Math.min(1.4, r * (1.15 + n * 0.45));
        g = Math.min(1, g * (0.85 + n * 0.4));
        b = Math.min(0.7, b * (0.55 + n * 0.3));
      }
      if (spots > 0 && rand() < spots * 0.002) {
        r *= 0.35; g *= 0.3; b *= 0.25;
      }
      const i = (y * w + x) * 4;
      px[i] = Math.min(255, r * 255);
      px[i + 1] = Math.min(255, g * 255);
      px[i + 2] = Math.min(255, b * 255);
      px[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function nebulaVolumeFromPhoto(image, width, height, depth, count, rand) {
  const sample = 180;
  const c = document.createElement('canvas');
  c.width = c.height = sample;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const srcW = image.width || sample;
  const srcH = image.height || sample;
  ctx.drawImage(image, 0, 0, sample, sample);
  const px = ctx.getImageData(0, 0, sample, sample).data;
  const positions = [];
  const colors = [];
  const sizes = [];
  let guard = 0;
  while (positions.length / 3 < count && guard < count * 18) {
    guard++;
    const x = Math.floor(rand() * sample);
    const y = Math.floor(rand() * sample);
    const i = (y * sample + x) * 4;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    const lum = (r * 0.3 + g * 0.59 + b * 0.11) / 255;
    if (lum < 0.1) continue;
    const nx = (x / sample) * 2 - 1;
    const ny = 1 - (y / sample) * 2;
    const thick = depth * (0.18 + lum * 0.82);
    positions.push(nx * width * 0.5, ny * height * 0.5, (rand() * 2 - 1) * thick);
    const boost = 0.55 + lum * 0.7;
    colors.push(Math.min(1, r / 255 * boost), Math.min(1, g / 255 * boost), Math.min(1, b / 255 * boost));
    sizes.push(0.55 + lum * 1.1);
  }
  return makePoints(positions, colors, 0.22);
}

function buildStarModel(o) {
  const group = new THREE.Group();
  const spec = o.star || { radius: 2.6, corona: 8 };
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(spec.radius, 64, 48),
    new THREE.MeshBasicMaterial({ map: photosphereTexture(o.color, spec) })
  );
  group.add(body);
  const corona = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite(o.color), transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: spec.giant ? 0.7 : 0.85,
  }));
  corona.scale.set(spec.corona, spec.corona, 1);
  group.add(corona);

  if (spec.disk) {
    const disk = new THREE.Mesh(
      new THREE.RingGeometry(spec.radius * 1.8, spec.radius * 4.2, 64),
      new THREE.MeshBasicMaterial({
        color: 0xc9dcff, side: THREE.DoubleSide, transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
    );
    disk.rotation.x = Math.PI / 2.15;
    group.add(disk);
  }
  if (spec.companion) {
    const dwarf = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xeeffff })
    );
    dwarf.position.set(spec.radius * 3.2, 0.4, 0.6);
    group.add(dwarf);
  }
  if (spec.companions) {
    const a = new THREE.Mesh(new THREE.SphereGeometry(0.45, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffe6b0 }));
    a.position.set(spec.radius * 2.6, 0.3, 0.2);
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd89a }));
    b.position.set(-spec.radius * 2.1, -0.5, 0.4);
    group.add(a, b);
  }
  if (o.id === 'proxima') {
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0x88a0c8 })
    );
    planet.position.set(spec.radius * 3.4, 0.15, 0);
    group.add(planet);
  }
  o.spinMesh = body;
  attachModel(o, group, spec.corona * 1.15);
}

function buildGlobularModel(o, image) {
  const group = new THREE.Group();
  const rand = mulberry32(seedFromId(o.id));
  const palette = samplePhotoColors(image, 8000);
  const fallback = [
    { r: 1, g: 0.92, b: 0.72, lum: 0.8 },
    { r: 1, g: 0.72, b: 0.38, lum: 0.7 },
    { r: 0.85, g: 0.9, b: 1, lum: 0.75 },
    { r: 1, g: 0.55, b: 0.25, lum: 0.65 },
    { r: 0.7, g: 0.78, b: 1, lum: 0.6 },
  ];
  const colorsSrc = palette.length > 80 ? palette : fallback;
  const n = 24000;
  const a = 4.2;
  const rMax = 20;
  const positions = [];
  const colors = [];
  const sizes = [];
  for (let i = 0; i < n; i++) {
    let r;
    do {
      const u = Math.min(0.985, rand());
      r = a / Math.sqrt(Math.pow(u, -2 / 3) - 1);
    } while (r > rMax);
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    positions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
    const c = colorsSrc[Math.floor(rand() * colorsSrc.length)];
    const boost = 0.65 + c.lum * 0.55;
    colors.push(Math.min(1, c.r * boost), Math.min(1, c.g * boost), Math.min(1, c.b * boost));
    const core = 1 - Math.min(1, r / rMax);
    sizes.push((1.05 + c.lum * 1.35) * (0.85 + core * 1.25));
  }
  const stars = makePoints(positions, colors, 0.28);
  group.add(stars);
  const coreGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite(0xffe6b0), transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.38,
  }));
  coreGlow.scale.set(11, 11, 1);
  group.add(coreGlow);
  o.spinMesh = stars;
  attachModel(o, group, rMax * 2.15);
}

function buildOpenClusterModel(o, photoTex) {
  const group = new THREE.Group();
  const rand = mulberry32(seedFromId(o.id));
  const n = o.model === 'young-cluster' ? 2200 : 280;
  const spread = o.model === 'young-cluster' ? 9 : 11;
  const positions = [];
  const colors = [];
  const sizes = [];
  for (let i = 0; i < n; i++) {
    const r = Math.pow(rand(), o.model === 'young-cluster' ? 0.45 : 0.7) * spread;
    const t = rand() * Math.PI * 2;
    const p = Math.acos(2 * rand() - 1);
    positions.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.55, r * Math.sin(p) * Math.sin(t));
    if (o.model === 'young-cluster') {
      colors.push(1, 0.55 + rand() * 0.35, 0.62 + rand() * 0.3);
      sizes.push(0.7 + rand() * 1.3);
    } else {
      colors.push(0.65 + rand() * 0.35, 0.78 + rand() * 0.2, 1);
      sizes.push(1.1 + rand() * 1.8);
    }
  }
  group.add(makePoints(positions, colors, o.model === 'young-cluster' ? 0.24 : 0.32));
  if (photoTex?.image) {
    const tex = photoAlphaTexture(photoTex.image);
    const aspect = photoTex.image.width / photoTex.image.height;
    const w = spread * 2.4;
    const h = w / Math.max(0.75, Math.min(aspect, 1.7));
    const cloud = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.55, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    group.add(cloud);
  }
  o.spinMesh = group;
  attachModel(o, group, spread * 2.6);
}

function buildBulgeModel(o) {
  const group = new THREE.Group();
  const rand = mulberry32(seedFromId(o.id));
  const n = 9000;
  const positions = [];
  const colors = [];
  const sizes = [];
  for (let i = 0; i < n; i++) {
    const r = Math.pow(rand(), 1.6) * 12;
    const t = rand() * Math.PI * 2;
    const p = Math.acos(2 * rand() - 1);
    positions.push(r * Math.sin(p) * Math.cos(t), r * Math.cos(p) * 0.42, r * Math.sin(p) * Math.sin(t));
    const warm = 0.75 + rand() * 0.25;
    colors.push(1, 0.72 * warm, 0.38 * warm);
    sizes.push(0.45 + rand() * 0.7);
  }
  const stars = makePoints(positions, colors, 0.2);
  group.add(stars);
  o.spinMesh = stars;
  attachModel(o, group, 26);
}

function buildSystemModel(o) {
  const group = new THREE.Group();
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(1.15, 32, 32),
    new THREE.MeshBasicMaterial({ map: photosphereTexture(0xffdd66, { cells: 0.22 }) })
  );
  group.add(sun);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowSprite(0xffe08a), transparent: true, blending: THREE.AdditiveBlending,
    depthWrite: false, opacity: 0.8,
  }));
  halo.scale.set(4.8, 4.8, 1);
  group.add(halo);
  const planets = [
    { d: 2.1, s: 0.12, c: 0xb0b0b0 },
    { d: 2.6, s: 0.18, c: 0xe8d2a0 },
    { d: 3.2, s: 0.2, c: 0x4a8fe8 },
    { d: 3.9, s: 0.16, c: 0xd06040 },
    { d: 5.2, s: 0.42, c: 0xd9b38c },
    { d: 6.6, s: 0.36, c: 0xe8d9a0 },
    { d: 7.8, s: 0.26, c: 0x8fd0e8 },
    { d: 8.9, s: 0.24, c: 0x4a70d0 },
  ];
  planets.forEach((p, i) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(p.d - 0.02, p.d + 0.02, 64),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, side: THREE.DoubleSide, transparent: true, opacity: 0.22 })
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(p.s, 12, 12),
      new THREE.MeshBasicMaterial({ color: p.c })
    );
    const ang = i * 0.7;
    body.position.set(Math.cos(ang) * p.d, 0, Math.sin(ang) * p.d);
    group.add(body);
  });
  o.spinMesh = group;
  attachModel(o, group, 18);
}

function buildPlanetaryModel(o, photoTex) {
  const group = new THREE.Group();
  const rand = mulberry32(seedFromId(o.id));
  const outer = o.color;
  const inner = o.id === 'helix' ? 0xff3355 : 0xffc8a0;
  const n = 14000;
  const positions = [];
  const colors = [];
  const sizes = [];
  const oc = new THREE.Color(outer);
  const ic = new THREE.Color(inner);
  for (let i = 0; i < n; i++) {
    const ring = rand() < 0.72;
    if (ring) {
      const rad = 8.5 + (rand() - 0.5) * 3.4;
      const t = rand() * Math.PI * 2;
      const y = (rand() - 0.5) * 2.2;
      positions.push(Math.cos(t) * rad, y, Math.sin(t) * rad * 0.78);
      colors.push(oc.r * (0.7 + rand() * 0.4), oc.g * (0.7 + rand() * 0.4), oc.b * (0.7 + rand() * 0.4));
      sizes.push(0.7 + rand() * 0.8);
    } else {
      const rad = rand() * 5.2;
      const t = rand() * Math.PI * 2;
      const p = Math.acos(2 * rand() - 1);
      positions.push(rad * Math.sin(p) * Math.cos(t), rad * Math.cos(p) * 0.45, rad * Math.sin(p) * Math.sin(t));
      colors.push(ic.r, ic.g * (0.5 + rand() * 0.4), ic.b * 0.45);
      sizes.push(0.5 + rand() * 0.6);
    }
  }
  const cloud = makePoints(positions, colors, 0.24);
  group.add(cloud);
  const dwarf = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  group.add(dwarf);
  if (photoTex?.image) {
    const tex = photoAlphaTexture(photoTex.image);
    const aspect = photoTex.image.width / Math.max(1, photoTex.image.height);
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(22, 22 / Math.max(0.85, Math.min(aspect, 1.25))),
      new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    group.add(plane);
  }
  o.spinMesh = cloud;
  attachModel(o, group, 28);
}

function buildNebulaModel(o, photoTex) {
  const group = new THREE.Group();
  const rand = mulberry32(seedFromId(o.id));
  const s = modelSize(o);
  if (photoTex?.image) {
    const tex = photoAlphaTexture(photoTex.image);
    const aspect = photoTex.image.width / Math.max(1, photoTex.image.height);
    const w = s;
    const h = s / Math.max(0.72, Math.min(aspect, 1.65));
    const mat = new THREE.MeshBasicMaterial({
      map: tex, transparent: true, opacity: 0.95, side: THREE.DoubleSide,
      depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const main = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    group.add(main);
    if (!o.silhouette) {
      const side = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.92), mat.clone());
      side.material.opacity = 0.38;
      side.rotation.y = 0.55;
      group.add(side);
      const side2 = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.88, h * 0.88), mat.clone());
      side2.material.opacity = 0.28;
      side2.rotation.y = -0.55;
      group.add(side2);
    }
    const depth = o.silhouette ? s * 0.12 : s * 0.22;
    group.add(nebulaVolumeFromPhoto(photoTex.image, w, h, depth, o.silhouette ? 3500 : 7000, rand));
  } else {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSprite(o.color), transparent: true, blending: THREE.AdditiveBlending,
      depthWrite: false, opacity: 0.8,
    }));
    halo.scale.set(s, s, 1);
    group.add(halo);
  }
  o.spinMesh = group;
  attachModel(o, group, s);
}

function buildObjectModel(o, photoTex) {
  if (o.model === 'blackhole') return;
  if (o.model === 'star') return buildStarModel(o);
  if (o.model === 'globular') return buildGlobularModel(o, photoTex?.image);
  if (o.model === 'open-cluster' || o.model === 'young-cluster') return buildOpenClusterModel(o, photoTex);
  if (o.model === 'bulge') return buildBulgeModel(o);
  if (o.model === 'system') return buildSystemModel(o);
  if (o.model === 'planetary') return buildPlanetaryModel(o, photoTex);
  return buildNebulaModel(o, photoTex);
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
  warpState.toDist = o.solar ? 22 : Math.max((o.photoWidth || modelSize(o)) * 1.2, 14);
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
    if (o.photoGroup && o.spinMesh) {
      const speed = (o.model === 'nebula' || o.model === 'planetary') ? 0.03
        : o.model === 'globular' ? 0.08
        : o.model === 'star' ? 0.12
        : 0.1;
      o.spinMesh.rotation.y += dt * speed;
    }
  }

  updateWarp();
  applyCamera();
  const armFade = THREE.MathUtils.clamp((cam.distance - 28) / 140, 0.05, 0.9);
  for (const m of armMats) m.opacity = armFade;
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
  statusEl.textContent = 'Клик по объекту — прыжок к 3D-модели. У Омеги Центавра теперь шар из отдельных звёзд.';
});
arrivalIntro();
animate();

const vt = document.getElementById('version-tag');
if (vt) vt.textContent = APP_VERSION;
