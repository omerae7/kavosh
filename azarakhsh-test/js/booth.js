/* =========================================================================
   آذرخش · اتاقکِ نور (سه‌بعدی)
   یک نمونهٔ آجر واقعی زیر سه صحنهٔ نورِ روز. دلیلِ وجودش کاربردی است:
   رنگِ آجر روی نمای ساختمان ساعت به ساعت عوض می‌شود و مشتری باید پیش از
   سفارش همان تغییر را ببیند.
   نکته‌ها: بافت یک‌بار خاکستری ساخته می‌شود و رنگ با material.color
   می‌آید؛ بیرونِ دید و در تبِ پنهان حلقه می‌ایستد؛ نبودِ WebGL به عکسِ
   استودیویی برمی‌گردد.
   ========================================================================= */
import * as THREE from '../vendor/three/three.module.min.js';

const SCENES = {
  noon: {
    key:   { color: 0xfff3e0, intensity: 3.5, pos: [2.2, 3.4, 2.6] },
    rim:   { color: 0xbfd4ff, intensity: 0.9, pos: [-2.8, 1.2, -2.2] },
    hemi:  { sky: 0xd8e6ff, ground: 0x3a2a1e, intensity: 0.55 },
    exp: 1.0, kelvin: '5600K', angle: '62°'
  },
  dusk: {
    key:   { color: 0xffb066, intensity: 3.2, pos: [3.4, 1.05, 1.5] },
    rim:   { color: 0xffd9a8, intensity: 1.5, pos: [-2.4, 0.7, -2.8] },
    hemi:  { sky: 0x5a4030, ground: 0x1a1210, intensity: 0.34 },
    exp: 1.05, kelvin: '3200K', angle: '18°'
  },
  shade: {
    key:   { color: 0xeaf1ff, intensity: 1.5, pos: [0.6, 3.2, 2.4] },
    rim:   { color: 0xc9d8e8, intensity: 0.7, pos: [-1.8, 1.4, -1.6] },
    hemi:  { sky: 0xe4edf7, ground: 0x2b3136, intensity: 1.55 },
    exp: 0.92, kelvin: '7500K', angle: '90°'
  }
};

/* ---------------- بافتِ خاک — یک‌بار ساخته و همه‌جا استفاده ------------- */
let CLAY = null;
function clay() {
  if (CLAY) return CLAY;
  const S = 512;
  const cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const g = cv.getContext('2d', { willReadFrequently: true });

  g.fillStyle = '#d8d8d8';
  g.fillRect(0, 0, S, S);

  /* لکه‌های نرمِ پخت */
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 24 + Math.random() * 90;
    const v = 190 + Math.random() * 70;
    const rad = g.createRadialGradient(x, y, 0, x, y, r);
    rad.addColorStop(0, `rgba(${v},${v},${v},.30)`);
    rad.addColorStop(1, `rgba(${v},${v},${v},0)`);
    g.fillStyle = rad;
    g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }

  /* دانه‌های ریزِ شن و ذراتِ آهن */
  const img = g.getImageData(0, 0, S, S);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - .5) * 34;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  g.putImageData(img, 0, 0);

  /* حفره‌های ریزِ سطح */
  for (let i = 0; i < 1400; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = .5 + Math.random() * 2.2;
    g.fillStyle = `rgba(${Math.random() < .55 ? 130 : 235},${Math.random() < .55 ? 126 : 232},${Math.random() < .55 ? 120 : 228},${.18 + Math.random() * .3})`;
    g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill();
  }

  const map = new THREE.CanvasTexture(cv);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;

  /* نقشهٔ نرمال از همان قابِ خاکستری (سوبل) */
  const nc = document.createElement('canvas');
  nc.width = nc.height = S;
  const ng = nc.getContext('2d', { willReadFrequently: true });
  const src = g.getImageData(0, 0, S, S).data;
  const out = ng.createImageData(S, S);
  const at = (x, y) => src[((y & (S - 1)) * S + (x & (S - 1))) * 4];
  const STR = 2.4;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) / 255 * STR;
      const dy = (at(x, y + 1) - at(x, y - 1)) / 255 * STR;
      let nx = -dx, ny = -dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * S + x) * 4;
      out.data[i]     = (nx * .5 + .5) * 255;
      out.data[i + 1] = (ny * .5 + .5) * 255;
      out.data[i + 2] = (nz * .5 + .5) * 255;
      out.data[i + 3] = 255;
    }
  }
  ng.putImageData(out, 0, 0);
  const nrm = new THREE.CanvasTexture(nc);
  nrm.wrapS = nrm.wrapT = THREE.RepeatWrapping;

  /* زبری — سطحِ مات با تفاوتِ جزئی */
  const rc = document.createElement('canvas');
  rc.width = rc.height = S;
  const rg = rc.getContext('2d');
  rg.drawImage(cv, 0, 0);
  rg.globalCompositeOperation = 'multiply';
  rg.fillStyle = 'rgba(150,150,150,1)';
  rg.fillRect(0, 0, S, S);
  const rgh = new THREE.CanvasTexture(rc);
  rgh.wrapS = rgh.wrapT = THREE.RepeatWrapping;

  CLAY = { map, nrm, rgh };
  return CLAY;
}

/* ------------------ هندسهٔ آجر: مکعبِ لب‌پخ‌خورده --------------------- */
function brickGeometry(w, h, d, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);

  const bev = Math.min(0.018, d * 0.16);
  const g = new THREE.ExtrudeGeometry(s, {
    depth: d - bev * 2,
    bevelEnabled: true,
    bevelThickness: bev,
    bevelSize: bev,
    bevelSegments: 3,
    curveSegments: 6
  });
  g.center();
  g.computeVertexNormals();
  return g;
}

/* =========================== نصبِ اتاقک ============================== */
export function mount(host, opts = {}) {
  const canvas = host.querySelector('.stage__gl');
  if (!canvas) return null;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    host.classList.add('is-flat');
    return null;
  }
  if (!renderer.getContext()) { host.classList.add('is-flat'); return null; }

  const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  camera.position.set(0, 0.62, 4.5);
  camera.lookAt(0, -0.02, 0);

  const tex = clay();
  tex.map.repeat.set(2.2, 1);
  tex.nrm.repeat.set(2.2, 1);
  tex.rgh.repeat.set(2.2, 1);

  const mat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(opts.hex || '#8d4a30'),
    map: tex.map,
    normalMap: tex.nrm,
    normalScale: new THREE.Vector2(1.15, 1.15),
    roughnessMap: tex.rgh,
    roughness: 1,
    metalness: 0
  });

  /* ۲۴۰×۷۰×۲۰ میلی‌متر، مقیاسِ صحنه */
  const brick = new THREE.Mesh(brickGeometry(2.4, 0.7, 0.2, 0.035), mat);
  brick.castShadow = true;
  brick.receiveShadow = true;
  brick.rotation.set(-0.32, -0.66, 0.03);
  scene.add(brick);

  /* میزِ نمونه — فقط سایه می‌گیرد */
  const deck = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.ShadowMaterial({ opacity: 0.42 })
  );
  deck.rotation.x = -Math.PI / 2;
  deck.position.y = -0.72;
  deck.receiveShadow = true;
  scene.add(deck);

  const key = new THREE.DirectionalLight(0xffffff, 1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 14;
  key.shadow.camera.left = -3; key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;   key.shadow.camera.bottom = -3;
  key.shadow.bias = -0.0016;
  key.shadow.radius = 3;
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xffffff, 1);
  scene.add(rim);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemi);

  /* ------------------------- صحنهٔ نور ---------------------------- */
  let sceneId = opts.scene || 'noon';
  function applyScene(id, animate) {
    const s = SCENES[id] || SCENES.noon;
    sceneId = id;
    const go = (o, p) => {
      if (animate && window.gsap) gsap.to(o, { ...p, duration: 1.05, ease: 'power2.inOut', overwrite: true });
      else Object.assign(o, p);
    };
    go(key.position, { x: s.key.pos[0], y: s.key.pos[1], z: s.key.pos[2] });
    go(key, { intensity: s.key.intensity });
    go(key.color, new THREE.Color(s.key.color));
    go(rim.position, { x: s.rim.pos[0], y: s.rim.pos[1], z: s.rim.pos[2] });
    go(rim, { intensity: s.rim.intensity });
    go(rim.color, new THREE.Color(s.rim.color));
    go(hemi, { intensity: s.hemi.intensity });
    go(hemi.color, new THREE.Color(s.hemi.sky));
    go(hemi.groundColor, new THREE.Color(s.hemi.ground));
    go(renderer, { toneMappingExposure: s.exp });
    return s;
  }
  applyScene(sceneId, false);

  /* ---------------------------- چرخش ------------------------------ */
  let spin = brick.rotation.y;
  let tilt = brick.rotation.x;
  let vel = 0;
  let idle = 0;
  let held = false;
  let lastX = 0, lastY = 0;

  const onDown = e => {
    held = true; idle = 0;
    lastX = e.clientX; lastY = e.clientY;
    host.classList.add('is-held');
    host.setPointerCapture?.(e.pointerId);
    document.body.classList.add('is-dragging');
  };
  const onMove = e => {
    if (!held) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    spin -= dx * 0.0072;          /* راست‌چین: کشیدن به راست، چرخش به راست */
    tilt = Math.max(-0.85, Math.min(0.55, tilt - dy * 0.005));
    vel = -dx * 0.0072;
    e.preventDefault();
  };
  const onUp = e => {
    if (!held) return;
    held = false; idle = 0;
    host.classList.remove('is-held');
    host.releasePointerCapture?.(e.pointerId);
    document.body.classList.remove('is-dragging');
  };
  host.addEventListener('pointerdown', onDown);
  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onUp);
  host.addEventListener('pointercancel', onUp);
  host.addEventListener('pointerleave', onUp);

  /* --------------------------- اندازه ----------------------------- */
  function size() {
    const r = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    renderer.setPixelRatio(DPR());
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    /* آجر باید در قاب‌های باریک هم کامل دیده شود */
    /* نمونه باید قاب را پر کند، نه اینکه وسطش شناور بماند */
    const ar = w / h;
    camera.position.z = ar < 0.95 ? 4.7 : ar < 1.4 ? 3.9 : 3.5;
    camera.fov = w < 460 ? 33 : 30;
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(size);
  ro.observe(host);
  size();

  /* --------------------------- حلقه ------------------------------- */
  let visible = true;
  const io = new IntersectionObserver(en => { visible = en[0].isIntersecting; }, { threshold: 0.02 });
  io.observe(host);

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0, prev = performance.now();
  let onTick = opts.onTick || null;

  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - prev) / 1000);
    prev = now;
    if (!visible || document.hidden) return;

    if (!held) {
      idle += dt;
      vel *= Math.pow(0.02, dt);            /* میرایی */
      spin += vel;
      if (!REDUCED && idle > 2.2) spin += 0.16 * dt * Math.min(1, (idle - 2.2) / 1.4);
    }
    brick.rotation.y += (spin - brick.rotation.y) * Math.min(1, dt * 11);
    brick.rotation.x += (tilt - brick.rotation.x) * Math.min(1, dt * 9);

    renderer.render(scene, camera);
    if (onTick) onTick(deg());
  }
  const deg = () => {
    let d = (-brick.rotation.y * 180 / Math.PI) % 360;
    if (d < 0) d += 360;
    return Math.round(d);
  };
  raf = requestAnimationFrame(frame);
  requestAnimationFrame(() => host.classList.add('is-lit'));

  /* --------------------------- بیرون ------------------------------ */
  return {
    setTone(hex) {
      const to = new THREE.Color(hex);
      if (window.gsap) gsap.to(mat.color, { r: to.r, g: to.g, b: to.b, duration: .65, ease: 'power2.out', overwrite: true });
      else mat.color.copy(to);
    },
    setScene(id) { return applyScene(id, true); },
    getScene() { return sceneId; },
    nudge(v) { vel = v; idle = 0; },
    deg,
    destroy() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      host.removeEventListener('pointerdown', onDown);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerup', onUp);
      host.removeEventListener('pointercancel', onUp);
      host.removeEventListener('pointerleave', onUp);
      brick.geometry.dispose(); mat.dispose(); deck.geometry.dispose(); deck.material.dispose();
      renderer.dispose();
    }
  };
}

export { SCENES };
