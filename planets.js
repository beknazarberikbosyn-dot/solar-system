import * as THREE from 'three';

const LOCAL = 'textures';

export const PLANET_LOOK = {
  sun:      { tex: `${LOCAL}/sun.jpg`, color: 0xffdd44, glow: true },
  mercury:  { tex: `${LOCAL}/mercury.jpg`, color: 0x9a9a9a, roughness: 0.96 },
  venus:    { tex: `${LOCAL}/venus.jpg`, clouds: `${LOCAL}/venus_atmo.jpg`, color: 0xe8cda0, atmo: 0xe8c070, atmoScale: 1.06, atmoI: 0.55, roughness: 0.88 },
  earth:    { tex: `${LOCAL}/earth.jpg`, night: `${LOCAL}/earth_night.jpg`, clouds: `${LOCAL}/earth_clouds.jpg`, spec: `${LOCAL}/earth_spec.jpg`, color: 0x4488ff, atmo: 0x6ea8ff, atmoScale: 1.055, atmoI: 0.9, ocean: true },
  moon:     { tex: `${LOCAL}/moon.jpg`, color: 0xb8b8b8, roughness: 1 },
  mars:     { tex: `${LOCAL}/mars.jpg`, color: 0xc1440e, atmo: 0xff7755, atmoScale: 1.035, atmoI: 0.32, roughness: 0.92 },
  jupiter:  { tex: `${LOCAL}/jupiter.jpg`, color: 0xd4a574, atmo: 0xd4b48c, atmoScale: 1.03, atmoI: 0.28, roughness: 0.72 },
  saturn:   { tex: `${LOCAL}/saturn.jpg`, ring: `${LOCAL}/saturn_ring.png`, color: 0xc9b896, atmo: 0xe8d9a0, atmoScale: 1.03, atmoI: 0.22, roughness: 0.74 },
  uranus:   { tex: `${LOCAL}/uranus.jpg`, color: 0x88ddff, atmo: 0x7ad0e8, atmoScale: 1.04, atmoI: 0.38, roughness: 0.7, tilt: 1.71 },
  neptune:  { tex: `${LOCAL}/neptune.jpg`, color: 0x2244cc, atmo: 0x4466dd, atmoScale: 1.04, atmoI: 0.42, roughness: 0.7 },
};

const loader = new THREE.TextureLoader();
const texCache = new Map();

export function loadTexture(url, fallback = 0x888888) {
  if (texCache.has(url)) return texCache.get(url);
  const p = new Promise((resolve) => {
    loader.load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 8;
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
  texCache.set(url, p);
  return p;
}

function atmosphereMaterial(color, power = 3.4, intensity = 0.85) {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(color) },
      coef: { value: power },
      intensity: { value: intensity },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vView = mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float coef;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(normalize(-vView), normalize(vNormal))), coef);
        gl_FragColor = vec4(glowColor, clamp(f * intensity, 0.0, 1.0));
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

function glowSpriteTex(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(color);
  const r = Math.round(col.r * 255), g = Math.round(col.g * 255), b = Math.round(col.b * 255);
  const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.3, `rgba(${r},${g},${b},0.55)`);
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function fixRingUVs(geo, inner, outer) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const rad = Math.hypot(x, y);
    uv.setXY(i, (rad - inner) / Math.max(0.0001, outer - inner), 0.5);
  }
  uv.needsUpdate = true;
}

function makeHeatCap(radius) {
  const geo = new THREE.SphereGeometry(radius * 1.012, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xff3a00,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return mesh;
}

function makeFloodPainter(dayTex) {
  const img = dayTex.image;
  if (!img || !img.width) return null;
  const w = img.width;
  const h = img.height;
  const src = document.createElement('canvas');
  src.width = w;
  src.height = h;
  const sctx = src.getContext('2d', { willReadFrequently: true });
  sctx.drawImage(img, 0, 0);
  const srcData = sctx.getImageData(0, 0, w, h);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  const live = new THREE.CanvasTexture(out);
  live.colorSpace = THREE.SRGBColorSpace;
  live.anisotropy = 8;
  let last = -1;

  function paint(level) {
    const v = Math.max(0, Math.min(1, level));
    if (Math.abs(v - last) < 0.012) return;
    last = v;
    const imgData = octx.createImageData(w, h);
    const dst = imgData.data;
    const srcPx = srcData.data;
    const deepR = 8, deepG = 36, deepB = 88;
    const shR = 22, shG = 110, shB = 138;
    for (let i = 0; i < srcPx.length; i += 4) {
      const r = srcPx[i], g = srcPx[i + 1], b = srcPx[i + 2];
      dst[i] = r; dst[i + 1] = g; dst[i + 2] = b; dst[i + 3] = 255;
      if (v < 0.02) continue;
      const ocean = b - Math.max(r, g) * 0.68;
      if (ocean > 12) continue;
      const ice = (r + g + b) / 3;
      if (ice > 210) continue;
      const elev = Math.min(1, (g / 255) * 0.62 + (r / 255) * 0.22 + (ice > 168 ? 0.42 : 0.12));
      if (v > elev + 0.08) {
        const t = Math.min(1, (v - elev) * 1.35);
        dst[i]     = Math.round(r * (1 - t) + (t > 0.55 ? deepR : shR) * t);
        dst[i + 1] = Math.round(g * (1 - t) + (t > 0.55 ? deepG : shG) * t);
        dst[i + 2] = Math.round(b * (1 - t) + (t > 0.55 ? deepB : shB) * t);
      }
    }
    octx.putImageData(imgData, 0, 0);
    live.needsUpdate = true;
  }

  paint(0);
  return { live, paint };
}

export async function createPlanet(id, opts = {}) {
  const look = PLANET_LOOK[id];
  if (!look) throw new Error('Unknown planet: ' + id);
  const radius = opts.radius ?? 1;
  const [map, night, cloudsTex, ringTex, specTex] = await Promise.all([
    loadTexture(look.tex, look.color),
    look.night ? loadTexture(look.night, 0x000000) : Promise.resolve(null),
    look.clouds ? loadTexture(look.clouds, 0xffffff) : Promise.resolve(null),
    look.ring ? loadTexture(look.ring, 0xc9b896) : Promise.resolve(null),
    look.spec ? loadTexture(look.spec, 0x222222) : Promise.resolve(null),
  ]);

  const segs = look.glow ? 48 : 64;
  const geo = new THREE.SphereGeometry(radius, segs, segs);
  let mat;
  let floodPainter = null;

  if (look.glow) {
    mat = new THREE.MeshBasicMaterial({ map });
  } else {
    if (look.ocean) floodPainter = makeFloodPainter(map);
    mat = new THREE.MeshStandardMaterial({
      map: floodPainter ? floodPainter.live : map,
      roughness: look.ocean ? 0.42 : (look.roughness ?? 0.78),
      metalness: look.ocean ? 0.12 : 0.04,
      metalnessMap: specTex || undefined,
      emissive: night ? 0xffe6b0 : 0x111122,
      emissiveMap: night || undefined,
      emissiveIntensity: night ? 0.95 : 0.1,
    });
  }

  const mesh = new THREE.Mesh(geo, mat);
  mesh.userData.r = radius;
  mesh.userData.id = id;

  let clouds = null;
  let atmo = null;
  let ocean = null;
  let heatGlow = null;
  let heatCap = null;
  let heatCore = null;

  if (look.glow) {
    const corona = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.28, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffb14a, transparent: true, opacity: 0.16, depthWrite: false,
      }),
    );
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSpriteTex(0xffcc66), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7,
    }));
    halo.scale.set(radius * 5.2, radius * 5.2, 1);
    mesh.add(corona, halo);
  }

  if (cloudsTex) {
    clouds = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.018, 64, 64),
      new THREE.MeshLambertMaterial({
        map: cloudsTex,
        transparent: true,
        opacity: id === 'venus' ? 0.92 : 0.58,
        depthWrite: false,
      }),
    );
    mesh.add(clouds);
  }

  if (look.atmo) {
    atmo = new THREE.Mesh(
      new THREE.SphereGeometry(radius * (look.atmoScale || 1.05), 48, 48),
      atmosphereMaterial(look.atmo, 3.2, look.atmoI ?? 0.7),
    );
    mesh.add(atmo);
  }

  if (look.ocean) {
    ocean = new THREE.Mesh(
      new THREE.SphereGeometry(radius * 1.008, 64, 64),
      new THREE.MeshPhysicalMaterial({
        color: 0x1568a8,
        transparent: true,
        opacity: 0,
        roughness: 0.16,
        metalness: 0.08,
        depthWrite: false,
      }),
    );
    ocean.visible = false;
    mesh.add(ocean);
  }

  if (!look.glow) {
    heatCap = makeHeatCap(radius);
    heatCore = makeHeatCap(radius * 0.995);
    heatCore.material.color.setHex(0xffe6a0);
    heatGlow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowSpriteTex(0xff6622), transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    heatGlow.scale.set(radius * 4.4, radius * 4.4, 1);
    mesh.add(heatCap, heatCore, heatGlow);
  }

  if (ringTex) {
    const inner = radius * 1.45;
    const outer = radius * 2.35;
    const ringGeo = new THREE.RingGeometry(inner, outer, 96);
    fixRingUVs(ringGeo, inner, outer);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      map: ringTex, transparent: true, opacity: 0.88,
      side: THREE.DoubleSide, depthWrite: false, alphaMap: ringTex,
    }));
    ring.rotation.x = Math.PI / 2.15;
    mesh.add(ring);
  }

  if (look.tilt) mesh.rotation.z = look.tilt;

  const _from = new THREE.Vector3();
  const _here = new THREE.Vector3();
  const _up = new THREE.Vector3(0, 1, 0);

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
      if (_from.lengthSq() > 1e-6) {
        ocean.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), _from.normalize());
      }
    }
  }

  function setHeat(amount, fromWorld) {
    const v = THREE.MathUtils.clamp(amount, 0, 1);
    if (fromWorld && (heatCap || heatCore)) {
      mesh.getWorldPosition(_here);
      _from.copy(fromWorld).sub(_here);
      if (_from.lengthSq() > 1e-8) {
        const q = new THREE.Quaternion().setFromUnitVectors(_up, _from.normalize());
        if (heatCap) heatCap.quaternion.copy(q);
        if (heatCore) heatCore.quaternion.copy(q);
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
    if (atmo?.material.uniforms) {
      atmo.material.uniforms.glowColor.value.setHSL(
        THREE.MathUtils.lerp(0.58, 0.045, v),
        0.85,
        THREE.MathUtils.lerp(0.58, 0.62, v),
      );
      atmo.material.uniforms.intensity.value = (look.atmoI ?? 0.7) + v * 1.6;
    }
    if (clouds) {
      clouds.material.opacity = Math.max(0, (id === 'venus' ? 0.92 : 0.58) * (1 - v * 1.15));
      clouds.material.color.setRGB(1, 1 - v * 0.45, 1 - v * 0.7);
    }
    if (heatGlow) {
      heatGlow.material.opacity = v * 0.8;
      const s = radius * (4.2 + v * 3.4);
      heatGlow.scale.set(s, s, 1);
    }
    if (mat.emissive && !night) {
      mat.emissive.setHSL(0.05, 0.85, 0.08 + v * 0.18);
      mat.emissiveIntensity = 0.1 + v * 1.35;
    } else if (night) {
      mat.emissiveIntensity = 0.95 + v * 1.1;
    }
    if (ocean && v > 0.35) {
      ocean.material.color.setRGB(0.55 + v * 0.4, 0.12, 0.04);
      ocean.material.opacity = Math.max(ocean.material.opacity, v * 0.22);
    }
  }

  function setSunDir() {}

  function tick(dt) {
    if (clouds) clouds.rotation.y += dt * (id === 'venus' ? 0.035 : 0.018);
  }

  mesh.userData.setFlood = setFlood;
  mesh.userData.setHeat = setHeat;
  mesh.userData.setSunDir = setSunDir;
  mesh.userData.tick = tick;

  return { mesh, radius, setFlood, setHeat, setSunDir, tick };
}
