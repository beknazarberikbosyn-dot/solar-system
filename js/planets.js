// ─── Фабрика планет: текстуры, атмосферы, кольца, день/ночь ───────────
// Используется и моделью Солнечной системы, и экспериментами.
import * as THREE from 'three';

const LOCAL = 'textures';

export const PLANET_LOOK = {
  sun:      { tex: `${LOCAL}/sun.jpg`, color: 0xffdd44, glow: true },
  mercury:  { tex: `${LOCAL}/mercury.jpg`, color: 0x9a9a9a, roughness: 0.96 },
  venus:    { tex: `${LOCAL}/venus.jpg`, clouds: `${LOCAL}/venus_atmo.jpg`, color: 0xe8cda0, atmo: 0xf0c878, atmoScale: 1.05, atmoI: 0.9, roughness: 0.88 },
  earth:    { tex: `${LOCAL}/earth.jpg`, night: `${LOCAL}/earth_night.jpg`, clouds: `${LOCAL}/earth_clouds.jpg`, spec: `${LOCAL}/earth_spec.jpg`, color: 0x4488ff, atmo: 0x5c9dff, atmoScale: 1.06, atmoI: 1.25, ocean: true },
  moon:     { tex: `${LOCAL}/moon.jpg`, color: 0xb8b8b8, roughness: 1 },
  mars:     { tex: `${LOCAL}/mars.jpg`, color: 0xc1440e, atmo: 0xff8a66, atmoScale: 1.035, atmoI: 0.5, roughness: 0.92 },
  jupiter:  { tex: `${LOCAL}/jupiter.jpg`, color: 0xd4a574, atmo: 0xe0c49a, atmoScale: 1.03, atmoI: 0.45, roughness: 0.72 },
  saturn:   { tex: `${LOCAL}/saturn.jpg`, ring: `${LOCAL}/saturn_ring.png`, color: 0xc9b896, atmo: 0xeedc9e, atmoScale: 1.03, atmoI: 0.4, roughness: 0.74 },
  uranus:   { tex: `${LOCAL}/uranus.jpg`, color: 0x88ddff, atmo: 0x8fe3f2, atmoScale: 1.045, atmoI: 0.6, roughness: 0.7, thinRings: true },
  neptune:  { tex: `${LOCAL}/neptune.jpg`, color: 0x2244cc, atmo: 0x5a7dff, atmoScale: 1.045, atmoI: 0.7, roughness: 0.7 },
};

const loader = new THREE.TextureLoader();
const texCache = new Map();
let maxAniso = 8;
export function setMaxAnisotropy(v) { maxAniso = Math.min(16, v || 8); }

export function loadTexture(url, fallback = 0x888888, srgb = true) {
  const key = url + (srgb ? '' : '#lin');
  if (texCache.has(key)) return texCache.get(key);
  const p = new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        resolve(tex);
      },
      undefined,
      () => {
        const c = document.createElement('canvas');
        c.width = c.height = 64;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#' + fallback.toString(16).padStart(6, '0');
        ctx.fillRect(0, 0, 64, 64);
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        resolve(t);
      },
    );
  });
  texCache.set(key, p);
  return p;
}

// Атмосфера: френелевское свечение, ярче на дневной стороне
function atmosphereMaterial(color, intensity, sunDir) {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      intensity: { value: intensity },
      uSunDir: { value: sunDir },
    },
    vertexShader: `
      varying vec3 vWN;
      varying vec3 vWP;
      void main() {
        vWN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWP = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      uniform vec3 uSunDir;
      varying vec3 vWN;
      varying vec3 vWP;
      void main() {
        vec3 V = normalize(cameraPosition - vWP);
        vec3 N = normalize(vWN);
        float f = pow(1.0 - abs(dot(V, N)), 2.6);
        float day = smoothstep(-0.35, 0.45, dot(N, normalize(uSunDir)));
        float a = clamp(f * intensity * (0.15 + 0.85 * day), 0.0, 1.0);
        gl_FragColor = vec4(glowColor * (0.7 + 0.6 * day), a);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

export function glowSpriteTex(color, soft = false) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(color);
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
  const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(soft ? 0.15 : 0.3, `rgba(${r},${g},${b},${soft ? 0.5 : 0.55})`);
  grad.addColorStop(soft ? 0.45 : 0.6, `rgba(${r},${g},${b},${soft ? 0.12 : 0.15})`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Кольца Сатурна: подсветка с двух сторон и тень планеты на кольцах
function ringMaterial(tex, planetR, sunDir) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tex },
      uSunDir: { value: sunDir },
      uCenter: { value: new THREE.Vector3() },
      uR: { value: planetR },
      uInner: { value: planetR * 1.24 },
      uOuter: { value: planetR * 2.3 },
    },
    vertexShader: `
      varying vec3 vWP;
      varying vec3 vLocal;
      varying vec3 vWN;
      void main() {
        vLocal = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWP = wp.xyz;
        vWN = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 uSunDir;
      uniform vec3 uCenter;
      uniform float uR, uInner, uOuter;
      varying vec3 vWP;
      varying vec3 vLocal;
      varying vec3 vWN;
      void main() {
        float rr = length(vLocal.xy);
        float u = (rr - uInner) / (uOuter - uInner);
        if (u < 0.0 || u > 1.0) discard;
        vec4 c = texture2D(map, vec2(u, 0.5));
        vec3 L = normalize(uSunDir);
        // тень планеты: луч от точки кольца к Солнцу пересекает шар?
        vec3 oc = uCenter - vWP;
        float tt = dot(oc, L);
        float d = length(oc - L * tt);
        float shadow = tt > 0.0 ? smoothstep(uR * 0.96, uR * 1.04, d) : 1.0;
        float lit = 0.35 + 0.65 * abs(dot(normalize(vWN), L));
        vec3 col = c.rgb * lit * (0.12 + 0.88 * shadow) * 1.25;
        gl_FragColor = vec4(col, c.a * 0.95);
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
  });
}

function makeHeatCap(radius) {
  const geo = new THREE.SphereGeometry(radius * 1.012, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff3a00, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return mesh;
}

function makeFloodPainter(dayTex) {
  const img = dayTex.image;
  if (!img || !img.width) return null;
  const w = Math.min(1024, img.width);
  const h = Math.round(w * (img.height / img.width));
  const src = document.createElement('canvas');
  src.width = w; src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0, w, h);
  const srcData = sctx.getImageData(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const live = new THREE.CanvasTexture(out);
  live.colorSpace = THREE.SRGBColorSpace;
  live.anisotropy = maxAniso;
  let last = -1;
  function paint(level) {
    const v = Math.max(0, Math.min(1, level));
    if (Math.abs(v - last) < 0.012) return;
    last = v;
    const imgData = octx.createImageData(w, h);
    const dst = imgData.data;
    const px = srcData.data;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
      if (v < 0.02) continue;
      if (b - Math.max(r, g) * 0.68 > 12) continue;
      const ice = (r + g + b) / 3;
      if (ice > 210) continue;
      const elev = Math.min(1, (g / 255) * 0.62 + (r / 255) * 0.22 + (ice > 168 ? 0.42 : 0.12));
      if (v > elev + 0.08) {
        const t = Math.min(1, (v - elev) * 1.35);
        const deep = t > 0.55;
        dst[i] = Math.round(r * (1 - t) + (deep ? 8 : 22) * t);
        dst[i + 1] = Math.round(g * (1 - t) + (deep ? 36 : 110) * t);
        dst[i + 2] = Math.round(b * (1 - t) + (deep ? 88 : 138) * t);
      }
    }
    octx.putImageData(imgData, 0, 0);
    live.needsUpdate = true;
  }
  paint(0);
  return { live, paint };
}

// Земля: огни городов только на ночной стороне, океаны бликуют
function patchEarthMaterial(mat, sunDir) {
  const u = { uSunDir: { value: sunDir } };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDir = u.uSunDir;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWNrm;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWNrm = normalize(mat3(modelMatrix) * objectNormal);');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWNrm;\nuniform vec3 uSunDir;')
      .replace('#include <roughnessmap_fragment>', `
        float roughnessFactor = roughness;
        #ifdef USE_ROUGHNESSMAP
          vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
          roughnessFactor = mix(0.92, 0.32, texelRoughness.g);
        #endif
      `)
      .replace('#include <emissivemap_fragment>', `
        #include <emissivemap_fragment>
        float nightK = smoothstep(0.12, -0.22, dot(normalize(vWNrm), normalize(uSunDir)));
        totalEmissiveRadiance *= nightK;
      `);
  };
  mat.customProgramCacheKey = () => 'earth-daynight';
  return u;
}

export async function createPlanet(id, opts = {}) {
  const look = PLANET_LOOK[id];
  if (!look) throw new Error('Unknown planet: ' + id);
  const radius = opts.radius ?? 1;
  const segs = opts.segments ?? 96;
  const sunDir = new THREE.Vector3(0.6, 0.35, 0.72).normalize();
  const [map, night, cloudsTex, ringTex, specTex] = await Promise.all([
    loadTexture(look.tex, look.color),
    look.night ? loadTexture(look.night, 0x000000) : Promise.resolve(null),
    look.clouds ? loadTexture(look.clouds, 0xffffff) : Promise.resolve(null),
    look.ring ? loadTexture(look.ring, 0xc9b896) : Promise.resolve(null),
    look.spec ? loadTexture(look.spec, 0x222222, false) : Promise.resolve(null),
  ]);

  const geo = new THREE.SphereGeometry(radius, segs, Math.round(segs * 0.66));
  let mat;
  let floodPainter = null;

  if (look.glow) {
    mat = new THREE.MeshBasicMaterial({ map, color: 0xffffff });
  } else {
    if (look.ocean && opts.flood) floodPainter = makeFloodPainter(map);
    mat = new THREE.MeshStandardMaterial({
      map: floodPainter ? floodPainter.live : map,
      roughness: look.roughness ?? 0.78,
      metalness: look.ocean ? 0.05 : 0.02,
      roughnessMap: specTex || null,
      emissive: night ? 0xffd9a0 : 0x000000,
      emissiveMap: night || null,
      emissiveIntensity: night ? 1.6 : 0,
    });
    if (look.ocean) patchEarthMaterial(mat, sunDir);
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.r = radius;
  mesh.userData.id = id;

  let clouds = null, atmo = null, ocean = null, heatGlow = null, heatCap = null, heatCore = null, ring = null;

  if (cloudsTex) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.012, segs, Math.round(segs * 0.66)),
      new THREE.MeshStandardMaterial({
        map: id === 'earth' ? null : cloudsTex,
        alphaMap: id === 'earth' ? cloudsTex : null,
        color: 0xffffff,
        transparent: true,
        opacity: id === 'venus' ? 0.9 : 0.85,
        depthWrite: false,
        roughness: 1,
      }),
    );
    mesh.add(clouds);
  }

  if (look.atmo) {
    atmo = new THREE.Mesh(
      new THREE.SphereGeometry(radius * (look.atmoScale || 1.05), 64, 48),
      atmosphereMaterial(look.atmo, look.atmoI ?? 0.8, sunDir),
    );
    mesh.add(atmo);
  }

  if (look.ocean) {
    ocean = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.008, 64, 64),
      new THREE.MeshPhysicalMaterial({ color: 0x1568a8, transparent: true, opacity: 0, roughness: 0.16, metalness: 0.08, depthWrite: false }),
    );
    ocean.visible = false;
    mesh.add(ocean);
  }

  if (!look.glow && opts.heat !== false) {
    heatCap = makeHeatCap(radius);
    heatCore = makeHeatCap(radius * 0.995);
    heatCore.material.color.setHex(0xffe6a0);
    heatGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSpriteTex(0xff6622), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    heatGlow.scale.set(radius * 4.4, radius * 4.4, 1);
    heatGlow.visible = false;
    mesh.add(heatCap, heatCore, heatGlow);
  }

  // кольца живут в отдельной группе, чтобы не вращаться вместе с планетой
  const ringGroup = new THREE.Group();
  if (ringTex) {
    const inner = radius * 1.24;
    const outer = radius * 2.3;
    ring = new THREE.Mesh(new THREE.RingGeometry(inner, outer, 180, 1), ringMaterial(ringTex, radius, sunDir));
    ring.rotation.x = Math.PI / 2;
    ringGroup.add(ring);
  }
  if (look.thinRings) {
    for (const [r0, w, a] of [[1.6, 0.02, 0.35], [1.75, 0.035, 0.5], [1.95, 0.025, 0.3]]) {
      const rr = new THREE.Mesh(
        new THREE.RingGeometry(radius * r0, radius * (r0 + w), 128),
        new THREE.MeshBasicMaterial({ color: 0x9fb6c8, transparent: true, opacity: a, side: THREE.DoubleSide, depthWrite: false }),
      );
      rr.rotation.x = Math.PI / 2;
      ringGroup.add(rr);
    }
  }
  mesh.add(ringGroup);
  if (look.tilt) mesh.rotation.z = look.tilt;

  const _from = new THREE.Vector3();
  const _here = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);

  function setSunDir(dir) {
    if (!dir || dir.lengthSq() < 1e-8) return;
    sunDir.copy(dir).normalize();
    if (ring) mesh.getWorldPosition(ring.material.uniforms.uCenter.value);
  }

  function setFlood(level, moonWorld) {
    const v = THREE.MathUtils.clamp(level, 0, 1);
    floodPainter?.paint(v);
    if (!ocean) return;
    if (v < 0.03) {
      ocean.visible = false;
      ocean.material.opacity = 0;
      ocean.scale.setScalar(1);
      return;
    }
    ocean.visible = true;
    ocean.material.opacity = Math.min(0.32, 0.05 + v * 0.22);
    ocean.scale.set(1 + v * 0.035, 1 - v * 0.012, 1 + v * 0.018);
    if (moonWorld) {
      mesh.getWorldPosition(_here);
      _from.copy(moonWorld).sub(_here);
      if (_from.lengthSq() > 1e-6) ocean.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), _from.normalize());
    }
  }

  function setHeat(amount, fromWorld) {
    const v = THREE.MathUtils.clamp(amount, 0, 1);
    if (fromWorld && (heatCap || heatCore)) {
      mesh.getWorldPosition(_here);
      _from.copy(fromWorld).sub(_here);
      if (_from.lengthSq() > 1e-8) {
        const q = new THREE.Quaternion().setFromUnitVectors(_up, _from.normalize());
        heatCap?.quaternion.copy(q);
        heatCore?.quaternion.copy(q);
      }
    }
    if (heatCap) {
      heatCap.visible = v > 0.04;
      heatCap.material.opacity = v * 0.72;
      heatCap.material.color.setHSL(THREE.MathUtils.lerp(0.04, 0.1, v), 1, THREE.MathUtils.lerp(0.42, 0.62, v));
    }
    if (heatCore) {
      heatCore.visible = v > 0.2;
      heatCore.material.opacity = Math.max(0, (v - 0.18) * 0.85);
      heatCore.scale.setScalar(0.92 + v * 0.12);
    }
    if (atmo) {
      atmo.material.uniforms.glowColor.value.setHSL(THREE.MathUtils.lerp(0.6, 0.045, v), 0.85, THREE.MathUtils.lerp(0.6, 0.62, v));
      atmo.material.uniforms.intensity.value = (look.atmoI ?? 0.8) + v * 1.6;
    }
    if (clouds) {
      clouds.material.opacity = Math.max(0, (id === 'venus' ? 0.9 : 0.85) * (1 - v * 1.15));
      clouds.material.color.setRGB(1, 1 - v * 0.45, 1 - v * 0.7);
    }
    if (heatGlow) {
      heatGlow.visible = v > 0.01;
      heatGlow.material.opacity = v * 0.8;
      const s = radius * (4.2 + v * 3.4);
      heatGlow.scale.set(s, s, 1);
    }
    if (mat.emissive && !night) {
      mat.emissive.setHSL(0.05, 0.85, 0.08 + v * 0.18);
      mat.emissiveIntensity = v * 1.35;
    } else if (night) {
      mat.emissiveIntensity = 1.6 + v * 1.1;
    }
    if (ocean && v > 0.35) {
      ocean.visible = true;
      ocean.material.color.setRGB(0.55 + v * 0.4, 0.12, 0.04);
      ocean.material.opacity = Math.max(ocean.material.opacity, v * 0.22);
    }
  }

  function tick(dt) {
    if (clouds) clouds.rotation.y += dt * (id === 'venus' ? 0.035 : 0.012);
    if (ring) {
      mesh.getWorldPosition(ring.material.uniforms.uCenter.value);
      // кольца не вращаются с планетой — компенсируем её поворот
      ringGroup.rotation.y = -mesh.rotation.y;
    }
  }

  mesh.userData.setFlood = setFlood;
  mesh.userData.setHeat = setHeat;
  mesh.userData.setSunDir = setSunDir;
  mesh.userData.tick = tick;

  return { mesh, radius, setFlood, setHeat, setSunDir, tick, ringGroup };
}
