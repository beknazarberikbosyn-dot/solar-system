// ─── Точка входа ───────────────────────────────────────────────────────
import { initFx } from './fx.js';
import { initCosmos } from './cosmos.js';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (_) {
    return false;
  }
}

const webgl = hasWebGL();

initCosmos(document.getElementById('cosmos'));
initFx();

// ─── Header ───────────────────────────────────────────────────────────
const hero = document.getElementById('hero');
const heroFail = (err) => {
  console.warn('Hero fallback:', err);
  hero.classList.add('fallback', 'space');
  document.getElementById('hero-tagline').classList.add('show');
  document.querySelector('.scroll-cue').classList.add('show');
  document.getElementById('hero-skip').hidden = true;
};
if (webgl) {
  import('./hero.js')
    .then((m) => m.initHero({
      canvas: document.getElementById('hero-canvas'),
      header: hero,
      tagline: document.getElementById('hero-tagline'),
      skipBtn: document.getElementById('hero-skip'),
      replayBtn: document.getElementById('hero-replay'),
      cue: document.querySelector('.scroll-cue'),
    }))
    .catch(heroFail);
} else {
  heroFail(new Error('WebGL недоступен'));
}

// ─── 3D-карточки загружаются, когда к ним подъезжает прокрутка ─────────
function lazy(el, loader) {
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      loader().catch((err) => {
        console.error(err);
        const l = el.querySelector('.stage-loading');
        if (l) l.textContent = 'Не удалось загрузить 3D-сцену: ' + err.message;
      });
    }
  }, { rootMargin: '600px 0px' });
  io.observe(el);
}

if (webgl) {
  const solar = document.getElementById('solar-model');
  lazy(solar, () => import('./solar.js').then((m) => m.initSolar(solar)));

  document.querySelectorAll('[data-experiment]').forEach((card) => {
    lazy(card, () => import('./experiments.js').then((m) => m.initExperiment(card, card.dataset.experiment)));
  });
} else {
  document.querySelectorAll('.stage-loading').forEach((l) => { l.textContent = 'Для 3D-сцен нужен браузер с WebGL'; });
}
