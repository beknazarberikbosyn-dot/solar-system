// ─── UI-анимации: наклон карточек под курсором, печатный текст,
//     «вакуумная» сборка абзацев, счётчики, появление при прокрутке ───

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const nf = new Map();

function formatNum(v, decimals) {
  if (!nf.has(decimals)) {
    nf.set(decimals, new Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }));
  }
  return nf.get(decimals).format(v);
}

function onceVisible(el, cb, { threshold = 0.25, rootMargin = '0px 0px -8% 0px' } = {}) {
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        io.disconnect();
        cb();
      }
    }
  }, { threshold, rootMargin });
  io.observe(el);
}

// ─── Карточки: увеличение, наклон «под давлением» курсора, блик ─────────
// Точка под курсором уходит «вглубь» — будто палец давит на карточку.
function initTilt(el) {
  const max = el.classList.contains('b-xl') || el.classList.contains('th-big') ? 7 : 11;
  const hoverScale = 1.045;
  const st = { x: 0, y: 0, tx: 0, ty: 0, s: 1, ts: 1, g: 0, tg: 0, raf: 0 };

  function frame() {
    st.x += (st.tx - st.x) * 0.14;
    st.y += (st.ty - st.y) * 0.14;
    st.s += (st.ts - st.s) * 0.16;
    st.g += (st.tg - st.g) * 0.12;
    // знаки подобраны так, что край под курсором «проседает» вглубь
    const rx = (-st.y * max).toFixed(2);
    const ry = (st.x * max).toFixed(2);
    el.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${st.s.toFixed(4)})`;
    el.style.setProperty('--glare', st.g.toFixed(3));
    el.style.setProperty('--px', st.x.toFixed(3));
    el.style.setProperty('--py', st.y.toFixed(3));
    const done = Math.abs(st.tx - st.x) < 0.001 && Math.abs(st.ty - st.y) < 0.001
      && Math.abs(st.ts - st.s) < 0.0005 && Math.abs(st.tg - st.g) < 0.002;
    if (done) {
      st.raf = 0;
      if (st.ts === 1 && st.tx === 0 && st.ty === 0) el.style.transform = '';
    } else {
      st.raf = requestAnimationFrame(frame);
    }
  }
  const kick = () => { if (!st.raf) st.raf = requestAnimationFrame(frame); };

  el.addEventListener('pointerenter', () => {
    st.ts = hoverScale; st.tg = 1; kick();
    el.style.zIndex = 5;
  });
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
    st.tx = Math.max(-1, Math.min(1, nx));
    st.ty = Math.max(-1, Math.min(1, ny));
    el.style.setProperty('--mx', `${((nx + 1) * 50).toFixed(1)}%`);
    el.style.setProperty('--my', `${((ny + 1) * 50).toFixed(1)}%`);
    kick();
  });
  el.addEventListener('pointerdown', () => { st.ts = hoverScale * 0.965; kick(); });
  el.addEventListener('pointerup', () => { st.ts = hoverScale; kick(); });
  el.addEventListener('pointerleave', () => {
    st.tx = 0; st.ty = 0; st.ts = 1; st.tg = 0; kick();
    el.style.zIndex = '';
  });
}

// ─── Печатная машинка ──────────────────────────────────────────────────
function splitChars(el) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  el.setAttribute('aria-label', text);
  el.textContent = '';
  const chars = [];
  // Слова держим целыми, чтобы перенос строк не рвал их посередине
  text.split(' ').forEach((word, wi, arr) => {
    const w = document.createElement('span');
    w.style.whiteSpace = 'nowrap';
    w.setAttribute('aria-hidden', 'true');
    for (const c of word) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = c;
      w.appendChild(s);
      chars.push(s);
    }
    el.appendChild(w);
    if (wi < arr.length - 1) {
      const sp = document.createElement('span');
      sp.className = 'ch';
      sp.textContent = ' ';
      sp.setAttribute('aria-hidden', 'true');
      el.appendChild(sp);
      chars.push(sp);
    }
  });
  return chars;
}

export function typeText(el, { speed = 38, onDone } = {}) {
  const chars = el._chars || (el._chars = splitChars(el));
  const caret = document.createElement('span');
  caret.className = 'caret';
  caret.setAttribute('aria-hidden', 'true');
  if (reduceMotion) {
    chars.forEach((c) => c.classList.add('on'));
    onDone?.();
    return;
  }
  let i = 0;
  const tick = () => {
    if (i < chars.length) {
      chars[i].classList.add('on');
      chars[i].after(caret);
      i++;
      const ch = chars[i - 1].textContent;
      const pause = /[,.:—]/.test(ch) ? speed * 5 : speed * (0.6 + Math.random() * 0.8);
      setTimeout(tick, pause);
    } else {
      setTimeout(() => caret.remove(), 1600);
      onDone?.();
    }
  };
  tick();
}

// ─── «Вакуум»: слова прилетают с разных сторон и складываются в абзац ───
function splitWords(el) {
  const words = [];
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const parts = child.textContent.split(/(\s+)/);
        const frag = document.createDocumentFragment();
        for (const part of parts) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(' '));
          } else {
            const s = document.createElement('span');
            s.className = 'vw';
            s.textContent = part;
            frag.appendChild(s);
            words.push(s);
          }
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.hasAttribute('data-count')) {
        walk(child);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        child.classList.add('vw');
        words.push(child);
      }
    }
  };
  walk(el);
  return words;
}

function initVacuum(el) {
  if (reduceMotion) return;
  const words = splitWords(el);
  const n = words.length;
  words.forEach((w, i) => {
    // направление — от центра абзаца наружу, с разбросом
    const ang = Math.random() * Math.PI * 2;
    const dist = 160 + Math.random() * 520;
    w.style.setProperty('--vx', `${(Math.cos(ang) * dist).toFixed(0)}px`);
    w.style.setProperty('--vy', `${(Math.sin(ang) * dist * 0.7).toFixed(0)}px`);
    w.style.setProperty('--vr', `${((Math.random() - 0.5) * 300).toFixed(0)}deg`);
    w.style.setProperty('--vs', (0.2 + Math.random() * 1.8).toFixed(2));
    w.style.setProperty('--vd', `${(1.1 + Math.random() * 0.9).toFixed(2)}s`);
    w.style.transitionDelay = `${((i / n) * 0.9 + Math.random() * 0.45).toFixed(2)}s`;
  });
  onceVisible(el, () => el.classList.add('assembled'), { threshold: 0.3 });
}

// ─── Счётчики: рост от нуля до значения ────────────────────────────────
export function countUp(el, { duration = 1900 } = {}) {
  const to = parseFloat(el.dataset.count);
  const decimals = parseInt(el.dataset.decimals || '0', 10);
  if (reduceMotion || !Number.isFinite(to)) {
    el.textContent = formatNum(to, decimals);
    return;
  }
  const t0 = performance.now();
  const step = (now) => {
    const p = Math.min(1, (now - t0) / duration);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = formatNum(to * e, decimals);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// ─── Навигация: появление после hero и подсветка раздела ───────────────
function initNav() {
  const nav = document.getElementById('topnav');
  const hero = document.getElementById('hero');
  const links = [...nav.querySelectorAll('.links a')];
  const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  const update = () => {
    const y = window.scrollY;
    nav.classList.toggle('show', y > hero.offsetHeight * 0.7);
    let active = -1;
    sections.forEach((s, i) => { if (s.getBoundingClientRect().top < window.innerHeight * 0.4) active = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === active));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ─── Подготовка изображений: плавное появление и запасной фон ──────────
function initImages() {
  document.querySelectorAll('.b-img img').forEach((img) => {
    const ok = () => img.classList.add('loaded');
    if (img.complete && img.naturalWidth) ok();
    img.addEventListener('load', ok);
    img.addEventListener('error', () => { img.remove(); });
  });
}

export function initFx() {
  document.documentElement.classList.toggle('touch', !finePointer);

  if (finePointer && !reduceMotion) document.querySelectorAll('.tilt').forEach(initTilt);

  document.querySelectorAll('[data-vacuum]').forEach(initVacuum);

  document.querySelectorAll('[data-type]').forEach((el) => {
    el._chars = splitChars(el);
    onceVisible(el, () => typeText(el), { threshold: 0.6 });
  });

  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = formatNum(0, parseInt(el.dataset.decimals || '0', 10));
    onceVisible(el, () => countUp(el), { threshold: 0.6 });
  });

  const revealIO = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        revealIO.unobserve(e.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('[data-reveal]').forEach((el) => revealIO.observe(el));

  // На сенсорных экранах факт в карточке теории открывается тапом
  document.querySelectorAll('.th-card').forEach((c) => c.addEventListener('click', () => c.classList.toggle('open')));

  initImages();
  initNav();
}
