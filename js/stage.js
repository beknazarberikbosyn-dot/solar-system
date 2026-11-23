// ─── Общая «сцена в карточке» ─────────────────────────────────────────
// Рендерер + камера + OrbitControls + bloom. Рисует только когда карточка
// видна; колесо мыши масштабирует модель лишь после клика по ней, чтобы
// не мешать прокрутке страницы. На сенсорных экранах управление
// включается кнопкой.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// Прозрачность по яркости: пустой космос сцены прозрачен, свечение мягко
// ложится на фон страницы, и у карточки не видно прямоугольника.
const AlphaFromLuma = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){
      vec4 c = texture2D(tDiffuse, vUv);
      float m = max(c.r, max(c.g, c.b));
      float a = clamp(m * 1.7, 0.0, 1.0);
      gl_FragColor = vec4(c.rgb, a);
    }`,
};
import { setMaxAnisotropy } from './planets.js';

const coarse = window.matchMedia('(hover: none), (pointer: coarse)').matches;

export function createStage(stageEl, opts = {}) {
  const {
    fov = 50, near = 0.1, far = 2000,
    bloom = { strength: 0.85, radius: 0.55, threshold: 0.82 },
    exposure = 1.1,
    hint = 'Тяните — вращение · клик по сцене, затем колесо — масштаб',
    maxPixelRatio = 1.75,
  } = opts;

  const canvas = document.createElement('canvas');
  canvas.setAttribute('tabindex', '0');
  stageEl.prepend(canvas);

  // прозрачный холст: фон страницы виден сквозь сцену, поэтому у карточки нет границ
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
  renderer.setClearColor(0x000000, 0);
  setMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, near, far);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enablePan = false;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 0.9;
  controls.enableZoom = false;

  let composer = null;
  let bloomPass = null;
  if (bloom) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom.strength, bloom.radius, bloom.threshold);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    composer.addPass(new ShaderPass(AlphaFromLuma));
  }

  // ─── активация управления ─────────────────────────────────────────
  let active = false;
  const hintEl = document.createElement('div');
  hintEl.className = 'stage-hint';
  hintEl.textContent = coarse ? 'Нажмите «Управлять», чтобы вращать модель' : hint;
  stageEl.appendChild(hintEl);

  const actBtn = document.createElement('button');
  actBtn.type = 'button';
  actBtn.className = 'stage-activate';
  actBtn.textContent = '👆 Управлять моделью';
  const relBtn = document.createElement('button');
  relBtn.type = 'button';
  relBtn.className = 'stage-release';
  relBtn.textContent = '✓ Готово';
  stageEl.append(actBtn, relBtn);

  function setActive(on) {
    active = on;
    stageEl.classList.toggle('active', on);
    controls.enableZoom = on;
    if (coarse) {
      controls.enabled = on;
      canvas.style.touchAction = on ? 'none' : 'pan-y';
      hintEl.style.opacity = on ? '0' : '1';
    } else {
      hintEl.textContent = on ? 'Колесо — масштаб · тяните — вращение' : hint;
    }
  }
  if (coarse) {
    controls.enabled = false;
    canvas.style.touchAction = 'pan-y';
    actBtn.addEventListener('click', () => setActive(true));
    relBtn.addEventListener('click', () => setActive(false));
  } else {
    stageEl.classList.add('active');
    canvas.addEventListener('pointerdown', () => setActive(true));
    stageEl.addEventListener('pointerleave', () => setActive(false));
    stageEl.classList.add('active');
  }

  // ─── размер и видимость ───────────────────────────────────────────
  let W = 1, H = 1;
  function resize() {
    W = Math.max(1, stageEl.clientWidth);
    H = Math.max(1, stageEl.clientHeight);
    renderer.setSize(W, H, false);
    composer?.setSize(W, H);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    api.onResize?.(W, H);
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stageEl);

  let visible = false;
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (!visible && coarse && active) setActive(false);
  }, { threshold: 0.01 });
  io.observe(stageEl);

  let last = performance.now();
  let elapsed = 0;
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible || document.hidden) return;
    elapsed += dt;
    api.onFrame?.(dt, elapsed);
    controls.update();
    if (composer) composer.render(dt);
    else renderer.render(scene, camera);
  }

  const api = {
    renderer, scene, camera, controls, canvas, composer, bloomPass, stageEl,
    get visible() { return visible; },
    get width() { return W; },
    get height() { return H; },
    get active() { return active; },
    setActive,
    onFrame: null,
    onResize: null,
    async start() {
      resize();
      // шейдеры компилируются параллельно, без подвисания страницы
      if (renderer.extensions.has('KHR_parallel_shader_compile')) {
        try { await renderer.compileAsync(scene, camera); } catch (_) { /* старый браузер */ }
      }
      stageEl.querySelector('.stage-loading')?.classList.add('gone');
      requestAnimationFrame(loop);
    },
  };
  return api;
}

// Звёздный фон для сцен: точки разных цветов + полоса Млечного Пути
export function addStarfield(scene, { count = 5000, band = 7000, radius = 700 } = {}) {
  const group = new THREE.Group();
  const mk = (n, fn, size, opacity) => {
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const p = fn(i);
      pos.set([p.x, p.y, p.z], i * 3);
      const r = Math.random();
      if (r < 0.12) c.setRGB(0.7, 0.8, 1);
      else if (r < 0.22) c.setRGB(1, 0.85, 0.7);
      else c.setRGB(1, 1, 1);
      c.multiplyScalar(0.55 + Math.random() * 0.45);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({
      size, sizeAttenuation: false, vertexColors: true, transparent: true, opacity, depthWrite: false,
    }));
  };
  const v = new THREE.Vector3();
  group.add(mk(count, () => {
    v.randomDirection().multiplyScalar(radius * (0.85 + Math.random() * 0.3));
    return v;
  }, 1.6, 0.95));
  // Млечный Путь: точки вблизи наклонённого большого круга
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(1.05, 0.3, 0.4));
  group.add(mk(band, () => {
    const a = Math.random() * Math.PI * 2;
    const spread = (Math.random() + Math.random() + Math.random() - 1.5) * 0.16;
    v.set(Math.cos(a), spread, Math.sin(a)).normalize().multiplyScalar(radius * 0.95).applyQuaternion(q);
    return v;
  }, 1.1, 0.55));
  scene.add(group);
  return group;
}
