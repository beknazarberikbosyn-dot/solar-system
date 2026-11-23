// ─── Фоновый космос ────────────────────────────────────────────────────
// Фиксированный 2D-холст за контентом. Звёзды в три слоя с параллаксом,
// а глубинные объекты (галактики, туманности, чёрные дыры, квазары,
// скопления) распределены по высоте страницы так, что чем ниже —
// тем их больше и тем они крупнее.

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = {
  nebula: [
    ['255,80,150', '90,140,255', '255,170,90'],
    ['80,220,200', '120,90,255', '255,100,160'],
    ['255,120,60', '255,60,120', '120,60,200'],
    ['100,180,255', '180,100,255', '80,255,200'],
  ],
};

function makeCanvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

// ─── Генераторы спрайтов ───────────────────────────────────────────────
function spriteSpiral(rnd, size = 300) {
  const c = makeCanvas(size);
  const g = c.getContext('2d');
  const R = size / 2;
  g.translate(R, R);
  g.globalCompositeOperation = 'lighter';
  const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.42);
  core.addColorStop(0, 'rgba(255,240,210,0.95)');
  core.addColorStop(0.25, 'rgba(255,200,140,0.45)');
  core.addColorStop(1, 'rgba(255,170,110,0)');
  g.fillStyle = core;
  g.beginPath(); g.arc(0, 0, R * 0.42, 0, Math.PI * 2); g.fill();
  const arms = 2 + Math.floor(rnd() * 2);
  const twist = 2.4 + rnd() * 1.8;
  const blue = rnd() > 0.35;
  for (let i = 0; i < 2400; i++) {
    const arm = i % arms;
    const t = Math.pow(rnd(), 0.75);
    const r = t * R * 0.92;
    const a = (arm / arms) * Math.PI * 2 + t * twist * Math.PI + (rnd() - 0.5) * (0.55 - t * 0.3);
    const sc = (rnd() - 0.5) * R * 0.09 * (1 - t * 0.4);
    const x = Math.cos(a) * r + sc;
    const y = Math.sin(a) * r + sc;
    const pink = rnd() < 0.06;
    const col = pink ? '255,120,170' : blue ? (t < 0.25 ? '255,225,190' : '160,200,255') : '255,215,170';
    const al = (1 - t) * 0.55 + 0.08;
    g.fillStyle = `rgba(${col},${al.toFixed(3)})`;
    const s = rnd() * 1.6 + 0.4;
    g.fillRect(x, y, s, s);
  }
  const haze = g.createRadialGradient(0, 0, 0, 0, 0, R);
  haze.addColorStop(0, blue ? 'rgba(140,170,255,0.18)' : 'rgba(255,190,140,0.16)');
  haze.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = haze;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  return c;
}

function spriteElliptical(rnd, size = 220) {
  const c = makeCanvas(size);
  const g = c.getContext('2d');
  const R = size / 2;
  g.translate(R, R);
  g.scale(1, 0.55 + rnd() * 0.35);
  const grd = g.createRadialGradient(0, 0, 0, 0, 0, R);
  grd.addColorStop(0, 'rgba(255,236,200,0.9)');
  grd.addColorStop(0.15, 'rgba(255,205,150,0.45)');
  grd.addColorStop(0.5, 'rgba(230,160,110,0.12)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  return c;
}

function spriteNebula(rnd, size = 320) {
  const c = makeCanvas(size);
  const g = c.getContext('2d');
  const R = size / 2;
  const pal = PALETTES.nebula[Math.floor(rnd() * PALETTES.nebula.length)];
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const col = pal[i % pal.length];
    const ang = rnd() * Math.PI * 2;
    const d = Math.pow(rnd(), 0.7) * R * 0.55;
    const x = R + Math.cos(ang) * d;
    const y = R + Math.sin(ang) * d * 0.75;
    const r = R * (0.18 + rnd() * 0.32);
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(${col},${(0.12 + rnd() * 0.14).toFixed(3)})`);
    grd.addColorStop(1, `rgba(${col},0)`);
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
  }
  // нити и пыль
  g.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 9; i++) {
    g.strokeStyle = `rgba(10,8,20,${(0.15 + rnd() * 0.25).toFixed(2)})`;
    g.lineWidth = 2 + rnd() * 8;
    g.beginPath();
    let x = R + (rnd() - 0.5) * R, y = R + (rnd() - 0.5) * R;
    g.moveTo(x, y);
    for (let k = 0; k < 4; k++) {
      x += (rnd() - 0.5) * R * 0.5; y += (rnd() - 0.5) * R * 0.5;
      g.quadraticCurveTo(x + (rnd() - 0.5) * 40, y + (rnd() - 0.5) * 40, x, y);
    }
    g.stroke();
  }
  g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const x = R + (rnd() - 0.5) * R * 1.2, y = R + (rnd() - 0.5) * R;
    const s = rnd() * 1.8 + 0.5;
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.fillRect(x, y, s, s);
  }
  // мягкая маска, чтобы края не были квадратными
  g.globalCompositeOperation = 'destination-in';
  const m = g.createRadialGradient(R, R, R * 0.25, R, R, R);
  m.addColorStop(0, 'rgba(0,0,0,1)');
  m.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = m;
  g.fillRect(0, 0, size, size);
  return c;
}

function spriteBlackHoleGlow(size = 320) {
  // аккреционный диск и фотонное кольцо (рисуются поверх тёмного центра)
  const c = makeCanvas(size);
  const g = c.getContext('2d');
  const R = size / 2;
  g.translate(R, R);
  g.globalCompositeOperation = 'lighter';
  const halo = g.createRadialGradient(0, 0, R * 0.18, 0, 0, R);
  halo.addColorStop(0, 'rgba(255,170,90,0.0)');
  halo.addColorStop(0.22, 'rgba(255,170,90,0.55)');
  halo.addColorStop(0.32, 'rgba(255,120,60,0.22)');
  halo.addColorStop(1, 'rgba(120,40,160,0)');
  g.fillStyle = halo;
  g.beginPath(); g.arc(0, 0, R, 0, Math.PI * 2); g.fill();
  // диск (эллипс) с доплеровской асимметрией
  g.save();
  g.scale(1, 0.28);
  for (let i = 0; i < 60; i++) {
    const r = R * (0.3 + (i / 60) * 0.62);
    g.strokeStyle = `rgba(255,${(150 + i).toFixed(0)},90,${(0.08 * (1 - i / 60)).toFixed(3)})`;
    g.lineWidth = 3;
    g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke();
  }
  const dop = g.createLinearGradient(-R, 0, R, 0);
  dop.addColorStop(0, 'rgba(255,230,200,0.5)');
  dop.addColorStop(0.5, 'rgba(255,200,150,0)');
  dop.addColorStop(1, 'rgba(255,120,80,0.08)');
  g.fillStyle = dop;
  g.beginPath(); g.ellipse(0, 0, R * 0.92, R * 0.92, 0, 0, Math.PI * 2); g.fill();
  g.restore();
  // фотонное кольцо
  g.strokeStyle = 'rgba(255,235,200,0.9)';
  g.lineWidth = 2.2;
  g.beginPath(); g.arc(0, 0, R * 0.205, 0, Math.PI * 2); g.stroke();
  return c;
}

function spriteQuasar(size = 260) {
  const c = makeCanvas(size);
  const g = c.getContext('2d');
  const R = size / 2;
  g.translate(R, R);
  g.globalCompositeOperation = 'lighter';
  const core = g.createRadialGradient(0, 0, 0, 0, 0, R * 0.35);
  core.addColorStop(0, 'rgba(230,240,255,1)');
  core.addColorStop(0.2, 'rgba(150,190,255,0.6)');
  core.addColorStop(1, 'rgba(100,120,255,0)');
  g.fillStyle = core;
  g.beginPath(); g.arc(0, 0, R * 0.35, 0, Math.PI * 2); g.fill();
  for (const dir of [-1, 1]) {
    const jet = g.createLinearGradient(0, 0, 0, dir * R);
    jet.addColorStop(0, 'rgba(160,200,255,0.75)');
    jet.addColorStop(1, 'rgba(120,80,255,0)');
    g.fillStyle = jet;
    g.beginPath();
    g.moveTo(-3, 0); g.lineTo(-R * 0.07, dir * R); g.lineTo(R * 0.07, dir * R); g.lineTo(3, 0);
    g.closePath(); g.fill();
  }
  return c;
}

function spriteCluster(rnd, size = 200) {
  const c = makeCanvas(size);
  const g = c.getContext('2d');
  const R = size / 2;
  g.globalCompositeOperation = 'lighter';
  const glow = g.createRadialGradient(R, R, 0, R, R, R);
  glow.addColorStop(0, 'rgba(255,230,190,0.35)');
  glow.addColorStop(1, 'rgba(255,230,190,0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 700; i++) {
    const u = rnd(), v = rnd();
    const r = Math.sqrt(-2 * Math.log(u + 1e-6)) * R * 0.22;
    const a = v * Math.PI * 2;
    const x = R + Math.cos(a) * r, y = R + Math.sin(a) * r;
    if (Math.hypot(x - R, y - R) > R) continue;
    g.fillStyle = rnd() < 0.2 ? 'rgba(170,200,255,0.9)' : 'rgba(255,225,180,0.85)';
    const s = rnd() * 1.4 + 0.5;
    g.fillRect(x, y, s, s);
  }
  return c;
}

// ─── Основной модуль ───────────────────────────────────────────────────
export function initCosmos(canvas) {
  const ctx = canvas.getContext('2d');
  const rnd = mulberry32(20261123);
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, docH = 0, heroH = 0;
  let mx = 0, my = 0, smx = 0, smy = 0;
  const layers = [];
  let objects = [];

  const sprites = {
    spiral: Array.from({ length: 5 }, () => spriteSpiral(rnd)),
    elliptical: Array.from({ length: 3 }, () => spriteElliptical(rnd)),
    nebula: Array.from({ length: 6 }, () => spriteNebula(rnd)),
    blackhole: [spriteBlackHoleGlow()],
    quasar: [spriteQuasar()],
    cluster: Array.from({ length: 3 }, () => spriteCluster(rnd)),
  };

  function buildStars() {
    layers.length = 0;
    const area = (W * H) / (1280 * 800);
    const specs = [
      { n: 260, speed: 0.04, size: [0.4, 1.0], alpha: [0.25, 0.6] },
      { n: 150, speed: 0.11, size: [0.7, 1.5], alpha: [0.35, 0.8] },
      { n: 60, speed: 0.22, size: [1.0, 2.2], alpha: [0.5, 1.0] },
    ];
    for (const sp of specs) {
      const n = Math.round(sp.n * Math.max(0.5, area));
      const stars = [];
      for (let i = 0; i < n; i++) {
        const tint = rnd();
        stars.push({
          x: rnd() * W,
          y: rnd() * H,
          s: sp.size[0] + rnd() * (sp.size[1] - sp.size[0]),
          a: sp.alpha[0] + rnd() * (sp.alpha[1] - sp.alpha[0]),
          tw: rnd() * Math.PI * 2,
          ts: 0.6 + rnd() * 2.2,
          c: tint < 0.15 ? '170,200,255' : tint < 0.25 ? '255,215,170' : '255,255,255',
        });
      }
      layers.push({ ...sp, stars });
    }
  }

  // Всего шесть крупных небесных тел, разнесённых по странице и по краям
  // экрана, чтобы они не наслаивались друг на друга и на контент.
  const PLAN = [
    { type: 'nebula', f: 0.05, x: 0.9, size: 340 },
    { type: 'spiral', f: 0.22, x: 0.08, size: 260 },
    { type: 'cluster', f: 0.4, x: 0.92, size: 170 },
    { type: 'blackhole', f: 0.58, x: 0.07, size: 230 },
    { type: 'spiral', f: 0.76, x: 0.9, size: 300 },
    { type: 'quasar', f: 0.94, x: 0.1, size: 210 },
  ];
  function buildObjects() {
    const maxScroll = Math.max(1, docH - H);
    const start = heroH * 0.9;
    objects = PLAN.map((p, i) => {
      const pool = sprites[p.type];
      const depth = 0.55;
      const s = start + p.f * (maxScroll - start + H * 0.3);
      return {
        type: p.type,
        img: pool[i % pool.length],
        anchor: s,
        depth,
        x: W < 700 ? (p.x < 0.5 ? 0.04 : 0.96) : p.x,
        yOff: 0,
        size: p.size * (W < 700 ? 0.6 : 1),
        rot: rnd() * Math.PI * 2,
        rotSpeed: p.type === 'spiral' ? 0.03 : p.type === 'blackhole' ? 0.3 : 0.005,
        tilt: p.type === 'spiral' ? 0.55 : 1,
        alpha: 0.75,
        phase: rnd() * 10,
      };
    });
  }

  const meteors = [];
  function spawnMeteor() {
    meteors.push({
      x: rnd() * W, y: rnd() * H * 0.6,
      vx: -(300 + rnd() * 500), vy: 160 + rnd() * 240,
      life: 1,
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    docH = document.documentElement.scrollHeight;
    heroH = document.getElementById('hero')?.offsetHeight || H;
    buildStars();
    buildObjects();
  }

  let last = performance.now();
  let meteorTimer = 3;
  let lastDocH = 0;

  function draw(now) {
    requestAnimationFrame(draw);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const scroll = window.scrollY;
    // пока hero закрывает экран — фон не рисуем
    if (scroll < heroH * 0.35 || document.hidden) return;
    if (Math.abs(document.documentElement.scrollHeight - lastDocH) > 200) {
      lastDocH = document.documentElement.scrollHeight;
      docH = lastDocH;
      buildObjects();
    }
    smx += (mx - smx) * 0.05;
    smy += (my - smy) * 0.05;
    const t = now / 1000;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // звёзды
    for (const L of layers) {
      const off = (scroll * L.speed) % H;
      for (const s of L.stars) {
        let y = s.y - off;
        if (y < 0) y += H;
        const x = (s.x + smx * L.speed * 60 + W) % W;
        const tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t * s.ts + s.tw);
        ctx.fillStyle = `rgba(${s.c},${(s.a * tw).toFixed(3)})`;
        ctx.fillRect(x, y + smy * L.speed * 40, s.s, s.s);
      }
    }

    // глубинные объекты
    for (const o of objects) {
      const y = H / 2 + o.yOff + (o.anchor - scroll) * o.depth;
      const sz = o.size;
      if (y < -sz || y > H + sz) continue;
      const x = o.x * W + smx * o.depth * 30;
      const yy = y + smy * o.depth * 20;
      const rot = reduce ? o.rot : o.rot + t * o.rotSpeed;
      ctx.save();
      ctx.translate(x, yy);
      if (o.type === 'blackhole') {
        // тёмный «провал» с гравитационной линзой
        ctx.globalCompositeOperation = 'source-over';
        const r0 = sz * 0.2;
        const lens = ctx.createRadialGradient(0, 0, r0 * 0.9, 0, 0, r0 * 2.4);
        lens.addColorStop(0, 'rgba(0,0,0,1)');
        lens.addColorStop(0.45, 'rgba(0,0,0,0.65)');
        lens.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lens;
        ctx.beginPath(); ctx.arc(0, 0, r0 * 2.4, 0, Math.PI * 2); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        ctx.rotate(Math.sin(o.phase) * 0.4);
        ctx.globalAlpha = o.alpha * (0.85 + 0.15 * Math.sin(t * 1.3 + o.phase));
        ctx.drawImage(o.img, -sz / 2, -sz / 2, sz, sz);
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(0, 0, r0 * 0.92, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.rotate(rot);
        if (o.tilt !== 1) ctx.scale(1, o.tilt);
        let a = o.alpha;
        if (o.type === 'quasar') a *= 0.75 + 0.25 * Math.sin(t * 3 + o.phase);
        ctx.globalAlpha = a;
        ctx.drawImage(o.img, -sz / 2, -sz / 2, sz, sz);
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    // метеоры
    if (!reduce) {
      meteorTimer -= dt;
      if (meteorTimer <= 0) { spawnMeteor(); meteorTimer = 3 + rnd() * 6; }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt * 1.2;
        if (m.life <= 0) { meteors.splice(i, 1); continue; }
        const grd = ctx.createLinearGradient(m.x, m.y, m.x - m.vx * 0.12, m.y - m.vy * 0.12);
        grd.addColorStop(0, `rgba(255,255,255,${(m.life * 0.9).toFixed(2)})`);
        grd.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = grd;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(m.x - m.vx * 0.12, m.y - m.vy * 0.12); ctx.stroke();
      }
    }
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', (e) => {
    mx = (e.clientX / window.innerWidth) * 2 - 1;
    my = (e.clientY / window.innerHeight) * 2 - 1;
  }, { passive: true });
  window.addEventListener('load', () => { docH = document.documentElement.scrollHeight; buildObjects(); });
  resize();
  requestAnimationFrame(draw);
}
