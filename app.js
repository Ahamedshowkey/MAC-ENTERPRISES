// ==========================================================================
// HARDWARE SHOP — APP LOGIC (DUAL-THEME BLUE + 3D WORKSHOP SCENE
// + 3D HARDWARE PRODUCT ICONS — WebGL-safe shared renderer)
// ==========================================================================

let products = [];
let categories = [];
let shopInfo = {};
let activeCategory = '';
let searchTerm = '';
let sortMode = 'featured';
let currencySymbol = 'Rs.';

const $ = (id) => document.getElementById(id);

const setText = (id, value) => {
  const el = $(id);
  if (el) el.textContent = value == null ? '' : String(value);
};


// ==========================================================================
// THEME
// ==========================================================================

const THEME_KEY = 'mac-theme';

const getStoredTheme = () => {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === 'light' || t === 'dark') return t;
  } catch (e) {}
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

const applyTheme = (theme, animate = true) => {
  const html = document.documentElement;
  if (animate) {
    html.classList.add('theme-transition');
    setTimeout(() => html.classList.remove('theme-transition'), 420);
  }
  html.setAttribute('data-theme', theme);

  const meta = $('meta-theme-color');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f8fafc' : '#060814');

  const btn = $('theme-toggle');
  if (btn) {
    btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    btn.setAttribute('title', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  }
};

const toggleTheme = () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next, true);
  try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  updateHero3DTheme();
};

const initTheme = () => {
  applyTheme(getStoredTheme(), false);
  const btn = $('theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    let stored = null;
    try { stored = localStorage.getItem(THEME_KEY); } catch (err) {}
    if (!stored) applyTheme(e.matches ? 'light' : 'dark', true);
  });
};


// ==========================================================================
// TOAST
// ==========================================================================

const showToast = (message, icon = 'ℹ️', duration = 3000) => {
  const wrap = $('toast-wrap');
  if (!wrap) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.innerHTML = `<span class="toast-icon" aria-hidden="true">${icon}</span><span>${message}</span>`;
  wrap.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 300);
  }, duration);
};


// ==========================================================================
// UTILITIES
// ==========================================================================

const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const formatPrice = (n) => {
  const num = Number(n) || 0;
  return currencySymbol + ' ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

const stockClass = (s) => s === 'out' ? 'out' : s === 'low' ? 'low' : '';
const stockLabel = (s) => s === 'out' ? 'Out of Stock' : s === 'low' ? 'Low Stock' : 'In Stock';

const unitLabel = (u) => {
  if (!u) return '';
  const map = {
    piece: 'per piece', pcs: 'per piece', unit: 'per unit',
    meter: 'per metre', kg: 'per kg', gram: 'per gram',
    box: 'per box', packet: 'per packet', roll: 'per roll',
    set: 'per set', bottle: 'per bottle', liter: 'per litre'
  };
  return map[String(u).toLowerCase()] || `per ${u}`;
};

const loadJSON = async (file, fallback = []) => {
  try {
    const res = await fetch(file + '?t=' + Date.now());
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.warn('Failed to load ' + file, err);
    return fallback;
  }
};


// ==========================================================================
// 3D HARDWARE ICONS — SHARED RENDERER (ONE WebGL context for ALL types)
// ==========================================================================

const _3dIconCache = new Map();

// Detect which 3D object to render
const detectHardwareType = (product) => {
  const nameText = (product && product.name) || '';
  const catText  = (product && product.category) || '';
  const text = `${nameText} ${catText}`.toLowerCase();

  if (/nut|hex/.test(text))                    return 'nut';
  if (/bolt/.test(text))                       return 'bolt';
  if (/screwdriver|driver/.test(text))         return 'screwdriver';
  if (/screw/.test(text))                      return 'bolt';
  if (/gear|cog/.test(text))                   return 'gear';
  if (/pipe|pvc|elbow|plumb|valve/.test(text)) return 'pipe';
  if (/wrench|spanner/.test(text))             return 'wrench';
  if (/hammer|mallet/.test(text))              return 'hammer';
  if (/paint|color|colour|brush/.test(text))   return 'paint';
  if (/brick|cement|block|concrete/.test(text))return 'brick';
  if (/wire|cable|electric/.test(text))        return 'wire';
  if (/sheet|roof|tin/.test(text))             return 'sheet';
  if (/saw|blade/.test(text))                  return 'saw';
  return 'nut';
};

// ========== HARDWARE OBJECT BUILDERS ==========

const buildNut = (pMat, dMat) => {
  const g = new THREE.Group();
  const prism = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.55, 6), pMat);
  g.add(prism);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.65, 24), dMat);
  g.add(hole);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 24), pMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.28;
  g.add(ring);
  return g;
};

const buildBolt = (pMat, dMat) => {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.4, 6), pMat);
  head.rotation.z = Math.PI / 2;
  head.position.x = -1.1;
  g.add(head);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2.1, 16), pMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = 0.3;
  g.add(shaft);
  for (let i = 0; i < 8; i++) {
    const thread = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.03, 5, 12), pMat);
    thread.rotation.y = Math.PI / 2;
    thread.position.x = -0.15 + i * 0.28;
    g.add(thread);
  }
  return g;
};

const buildGear = (pMat, aMat) => {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.4, 24), pMat);
  g.add(hub);
  const hole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.6, roughness: 0.4 })
  );
  g.add(hole);
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.28, 0.4), i % 3 === 0 ? aMat : pMat);
    tooth.position.set(Math.cos(angle) * 0.9, 0, Math.sin(angle) * 0.9);
    tooth.rotation.y = -angle;
    g.add(tooth);
  }
  return g;
};

const buildPipe = (pMat, aMat) => {
  const g = new THREE.Group();
  const pipe = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.28, 16, 32, Math.PI / 2), pMat);
  g.add(pipe);
  const f1 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 16), aMat);
  f1.position.set(0.85, 0, 0);
  f1.rotation.y = Math.PI / 2;
  g.add(f1);
  const f2 = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 16), aMat);
  f2.position.set(0, 0.85, 0);
  g.add(f2);
  return g;
};

const buildScrewdriver = (pMat, aMat) => {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.32, 1.6, 12), aMat);
  handle.rotation.z = Math.PI / 2;
  handle.position.x = -0.9;
  g.add(handle);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8, 10), pMat);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.x = 0.9;
  g.add(shaft);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.25), pMat);
  tip.position.x = 1.85;
  g.add(tip);
  return g;
};

const buildWrench = (pMat) => {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.3, 0.35), pMat);
  g.add(body);
  const p1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.25), pMat);
  p1.position.set(-1.2, 0.55, 0);
  g.add(p1);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.25), pMat);
  p2.position.set(-1.2, -0.55, 0);
  g.add(p2);
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.25), pMat);
  bridge.position.set(-1.3, 0, 0);
  g.add(bridge);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.15, 10, 20), pMat);
  ring.position.set(1.2, 0, 0);
  g.add(ring);
  return g;
};

const buildHammer = (pMat, aMat) => {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 2.2, 10), aMat);
  handle.rotation.z = Math.PI / 2;
  g.add(handle);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.5), pMat);
  head.position.x = -1.1;
  g.add(head);
  const claw = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.3), pMat);
  claw.position.set(-1.35, -0.35, 0);
  claw.rotation.z = 0.5;
  g.add(claw);
  return g;
};

const buildPaint = (pMat, aMat) => {
  const g = new THREE.Group();
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.75, 1.4, 24), pMat);
  g.add(bucket);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.08, 8, 32), aMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.7;
  g.add(rim);
  const paint = new THREE.Mesh(
    new THREE.CylinderGeometry(0.85, 0.85, 0.05, 24),
    new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.1, roughness: 0.6 })
  );
  paint.position.y = 0.66;
  g.add(paint);
  return g;
};

const buildBrick = (pMat, aMat) => {
  const g = new THREE.Group();
  const brick = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.7, 0.9), pMat);
  g.add(brick);
  for (let i = -1; i <= 1; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.72, 0.92), aMat);
    line.position.x = i * 0.6;
    g.add(line);
  }
  const hLine = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.05, 0.92), aMat);
  g.add(hLine);
  return g;
};

const buildWire = (pMat, aMat) => {
  const g = new THREE.Group();
  const roll = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.35, 20, 40), pMat);
  g.add(roll);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.08, 10, 24), aMat);
  g.add(inner);
  return g;
};

const buildSheet = (pMat) => {
  const g = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.06, 1.4), pMat);
  g.add(sheet);
  for (let i = -2; i <= 2; i++) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 0.08), pMat);
    ridge.position.z = i * 0.28;
    ridge.position.y = 0.08;
    g.add(ridge);
  }
  return g;
};

const buildSaw = (pMat, dMat) => {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.55, 0.06), pMat);
  g.add(blade);
  for (let i = 0; i < 12; i++) {
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, 0.06), dMat);
    tooth.position.set(-1.05 + i * 0.19, -0.33, 0);
    tooth.rotation.z = (i % 2 === 0 ? -1 : 1) * 0.3;
    g.add(tooth);
  }
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.35), dMat);
  handle.position.set(1.55, 0, 0);
  g.add(handle);
  return g;
};

// Factory
const buildHardwareObject = (type, pMat, aMat, dMat) => {
  switch (type) {
    case 'nut':         return buildNut(pMat, dMat);
    case 'bolt':        return buildBolt(pMat, dMat);
    case 'gear':        return buildGear(pMat, aMat);
    case 'pipe':        return buildPipe(pMat, aMat);
    case 'screwdriver': return buildScrewdriver(pMat, aMat);
    case 'wrench':      return buildWrench(pMat);
    case 'hammer':      return buildHammer(pMat, aMat);
    case 'paint':       return buildPaint(pMat, aMat);
    case 'brick':       return buildBrick(pMat, aMat);
    case 'wire':        return buildWire(pMat, aMat);
    case 'sheet':       return buildSheet(pMat);
    case 'saw':         return buildSaw(pMat, dMat);
    default:            return buildNut(pMat, dMat);
  }
};

// Dispose geometry only (materials are shared — don't dispose them)
const disposeGroup = (obj) => {
  obj.traverse((child) => {
    if (child.geometry) child.geometry.dispose();
  });
};

// ========== PRE-RENDER — ONE shared renderer for ALL types ==========

const preRender3DIcons = () => {
  if (typeof THREE === 'undefined') {
    console.warn('[3D] Three.js not loaded — using SVG fallback for product icons');
    return;
  }

  const types = ['nut', 'bolt', 'gear', 'pipe', 'screwdriver',
                 'wrench', 'hammer', 'paint', 'brick', 'wire', 'sheet', 'saw'];

  const W = 400;
  const H = 300;
  const PIXEL_RATIO = 1.5;

  let renderer = null;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = W * PIXEL_RATIO;
    canvas.height = H * PIXEL_RATIO;

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true
    });
    renderer.setPixelRatio(PIXEL_RATIO);
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
    camera.position.set(3.8, 2.8, 4.8);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.55));

    const key = new THREE.DirectionalLight(0xffffff, 1.1);
    key.position.set(5, 8, 6);
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x60a5fa, 0.8);
    fill.position.set(-6, 2, 4);
    scene.add(fill);

    const rim = new THREE.DirectionalLight(0xf59e0b, 0.7);
    rim.position.set(0, -5, -4);
    scene.add(rim);

    const pMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6, metalness: 0.9, roughness: 0.25,
      emissive: 0x1e40af, emissiveIntensity: 0.25
    });
    const aMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, metalness: 0.8, roughness: 0.35,
      emissive: 0xb45309, emissiveIntensity: 0.2
    });
    const dMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, metalness: 0.7, roughness: 0.5
    });

    types.forEach((type) => {
      try {
        const obj = buildHardwareObject(type, pMat, aMat, dMat);
        if (!obj) return;

        obj.rotation.set(0.35, 0.65, 0.15);
        scene.add(obj);

        renderer.render(scene, camera);

        const dataUrl = canvas.toDataURL('image/png');
        if (dataUrl && dataUrl.length > 100) {
          _3dIconCache.set(type, dataUrl);
        }

        scene.remove(obj);
        disposeGroup(obj);
      } catch (innerErr) {
        console.warn('[3D] Render failed for', type, innerErr.message);
      }
    });

    console.log('[3D] Pre-rendered', _3dIconCache.size, 'hardware icons (1 shared context)');

  } catch (err) {
    console.warn('[3D] Icon pre-render failed:', err.message);
  } finally {
    try { if (renderer) renderer.dispose(); } catch (e) {}
  }
};

// Cache-only lookup — NEVER creates new contexts
const getHardwareIcon = (type) => _3dIconCache.get(type) || null;


// ==========================================================================
// IMAGE RESOLVERS
// ==========================================================================

const svgFallbackImage = (name, categoryName) => {
  const initial = (name || '?').charAt(0).toUpperCase();
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const bg1 = isLight ? '#f1f5f9' : '#0a0e1f';
  const bg2 = isLight ? '#e2e8f0' : '#151b33';
  const stroke = isLight ? 'rgba(37,99,235,0.25)' : 'rgba(96,165,250,0.25)';
  const fill = isLight ? '#2563eb' : '#60a5fa';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg1}"/>
        <stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
      <pattern id="p" width="24" height="24" patternUnits="userSpaceOnUse">
        <path d="M0 24 L24 0" stroke="${stroke}" stroke-width="1"/>
      </pattern>
    </defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <rect width="400" height="300" fill="url(#p)"/>
    <rect x="40" y="40" width="320" height="220" fill="none" stroke="${stroke}" stroke-width="2" stroke-dasharray="6 4" rx="12"/>
    <text x="200" y="180" font-family="Barlow Condensed,Archivo,sans-serif" font-size="120" font-weight="700" fill="${fill}" text-anchor="middle" opacity="0.9">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

// Real photo → 3D cache → SVG fallback
const productImageUrl = (p) => {
  try {
    if (p && p.image && String(p.image).trim().length > 20) {
      return p.image;
    }
    const type = detectHardwareType(p);
    const rendered = getHardwareIcon(type);
    if (rendered) return rendered;
    return svgFallbackImage(p && p.name, p && p.category);
  } catch (e) {
    console.warn('[Image] resolve failed:', e.message);
    return svgFallbackImage(p && p.name, p && p.category);
  }
};


// ==========================================================================
// CATEGORY ICONS
// ==========================================================================

const CATEGORY_ICONS = {
  wrench: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z',
  pipe:   'M3 12h4a3 3 0 0 1 3 3v6M21 12h-4a3 3 0 0 0-3 3M3 9v6M21 9v6',
  brick:  'M3 7h18v4H3zM3 15h18v4H3zM11 7v4M7 15v4M15 15v4',
  bolt:   'M13 2 3 14h8l-1 8 10-12h-8l1-8z',
  paint:  'M19 3H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zM12 13v8M9 21h6',
  roof:   'M2 12 12 3l10 9M4 12v9h16v-9',
  bar:    'M4 6h16v3H4zM4 15h16v3H4z',
  box:    'M21 8 12 3 3 8v8l9 5 9-5V8zM3 8l9 5 9-5M12 13v8'
};

const CATEGORY_EMOJI = {
  wrench: '🔧', pipe: '🚿', brick: '🧱', bolt: '⚡',
  paint: '🎨', roof: '🏠', bar: '📏', box: '📦'
};

const pickCategoryIcon = (name) => {
  const n = (name || '').toLowerCase();
  if (n.includes('plumb') || n.includes('pipe') || n.includes('pvc')) return 'pipe';
  if (n.includes('tool') || n.includes('hard') || n.includes('wrench')) return 'wrench';
  if (n.includes('build') || n.includes('buld') || n.includes('cement') || n.includes('brick')) return 'brick';
  if (n.includes('wir') || n.includes('wair') || n.includes('electric') || n.includes('cable')) return 'bolt';
  if (n.includes('oil') || n.includes('paint') || n.includes('colour') || n.includes('color')) return 'paint';
  if (n.includes('tin') || n.includes('roof') || n.includes('sheet')) return 'roof';
  if (n.includes('box') || n.includes('bar') || n.includes('steel') || n.includes('metal')) return 'bar';
  return 'box';
};

const categoryIconEmoji = (name) => CATEGORY_EMOJI[pickCategoryIcon(name)] || '📦';

const categoryImageUrl = (cat) => {
  try {
    const catImg = cat && (cat.image || cat.imageUrl || cat.img || cat.thumbnail || cat.photo || cat.picture);
    if (typeof catImg === 'string' && catImg.trim().length > 20) return catImg;

    const productWithImage = products.find(
      (p) => p.category === cat.name && p.image && String(p.image).trim().length > 20
    );
    if (productWithImage) return productWithImage.image;

    const type = detectHardwareType({ name: '', category: cat.name });
    const rendered = getHardwareIcon(type);
    if (rendered) return rendered;

    return svgFallbackImage(cat.name, cat.name);
  } catch (e) {
    return svgFallbackImage(cat.name, cat.name);
  }
};


// ==========================================================================
// WHATSAPP
// ==========================================================================

const waPhone = (raw) => {
  if (!raw) return '';
  let d = String(raw).replace(/[^\d]/g, '');
  if (!d) return '';
  if (d.startsWith('94')) return d;
  if (d.startsWith('0'))  return '94' + d.slice(1);
  if (d.length === 9)     return '94' + d;
  return d;
};

const waLink = (phone, message = '') => {
  const p = waPhone(phone);
  const base = p ? `https://wa.me/${p}` : 'https://wa.me/';
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

const orderMessage = (product) => [
  `Hello,`, ``,
  `I would like to order:`, ``,
  `*${product.name}*`,
  product.sku ? `Code: ${product.sku}` : '',
  product.brand ? `Brand: ${product.brand}` : '',
  `Price: ${formatPrice(product.price)}${product.unit ? ' ' + unitLabel(product.unit) : ''}`,
  `Quantity: __________`, ``,
  `Please confirm stock and total.`
].filter(Boolean).join('\n');


// ==========================================================================
// INIT
// ==========================================================================

const init = async () => {

  initTheme();

  // Pre-render all 3D icons with ONE shared renderer
  preRender3DIcons();

  const [loadedProducts, loadedCategories, loadedShop] = await Promise.all([
    loadJSON('products.json', []),
    loadJSON('categories.json', []),
    loadJSON('shop-info.json', {})
  ]);

  products   = Array.isArray(loadedProducts) ? loadedProducts : [];
  categories = Array.isArray(loadedCategories) ? loadedCategories : [];
  shopInfo   = (loadedShop && typeof loadedShop === 'object') ? loadedShop : {};

  currencySymbol = shopInfo.currencySymbol || 'Rs.';

  console.log('[MAC] Products:', products.length);
  console.log('[MAC] Categories:', categories.length);

  if (categories.length === 0 && products.length > 0) {
    const map = new Map();
    products.forEach((p) => {
      const cat = (p.category || '').trim();
      if (!cat) return;
      const existing = map.get(cat);
      if (existing) existing.count += 1;
      else map.set(cat, { name: cat, image: '', count: 1 });
    });
    categories = Array.from(map.values()).sort((a, b) => b.count - a.count);
  }

  const productCountByCat = {};
  products.forEach((p) => {
    const c = p.category || '';
    if (!c) return;
    productCountByCat[c] = (productCountByCat[c] || 0) + 1;
  });
  categories = categories.map((c) => ({
    ...c,
    count: productCountByCat[c.name] || c.count || 0
  }));

  populateBrand();
  populateHero();
  populateContact();
  populateCategoryBar();
  populateCategoryShowcase();
  populateFooter();
  wireEvents();
  wireMainMenu();

  render();

  const content = $('content');
  if (content) content.setAttribute('aria-busy', 'false');

  initScrollReveal();
  initHeroSpotlight();
  initCardSpotlight();
  initHero3D();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
};


// ==========================================================================
// SCROLL REVEAL
// ==========================================================================

const initScrollReveal = () => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -80px 0px' });
  document.querySelectorAll('.reveal:not(.in)').forEach(el => io.observe(el));
};

const observeNewReveals = () => {
  const fresh = document.querySelectorAll('.reveal:not(.in):not([data-obs])');
  if (!fresh.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    fresh.forEach(el => el.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
  fresh.forEach(el => {
    el.setAttribute('data-obs', '1');
    io.observe(el);
  });
};


// ==========================================================================
// SPOTLIGHT / TILT
// ==========================================================================

const initHeroSpotlight = () => {
  const hero = $('hero');
  const spotlight = hero?.querySelector('.hero-spotlight');
  if (!hero || !spotlight) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    spotlight.style.setProperty('--mx', x + '%');
    spotlight.style.setProperty('--my', y + '%');
  });
};

const TILT_SELECTOR = '.card, .cat-card, .bento';

const attachTilt = (el) => {
  if (!el || el.dataset.tilt === '1') return;
  el.dataset.tilt = '1';
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const strength =
    el.classList.contains('card') ? 12 :
    el.classList.contains('cat-card') ? 10 : 8;

  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    el.style.setProperty('--mx', (px * 100) + '%');
    el.style.setProperty('--my', (py * 100) + '%');
    el.style.transition = 'transform 0.12s ease-out, box-shadow 0.3s, border-color 0.3s';
    const rX = (0.5 - py) * strength;
    const rY = (px - 0.5) * strength;
    el.style.transform =
      `perspective(900px) rotateX(${rX}deg) rotateY(${rY}deg) translateY(-10px) scale(1.02)`;
  });

  el.addEventListener('mouseleave', () => {
    el.style.transition = '';
    el.style.transform = '';
  });
};

const initCardSpotlight = () => {
  document.querySelectorAll(TILT_SELECTOR).forEach(attachTilt);
};


// ==========================================================================
// POPULATE
// ==========================================================================

const populateBrand = () => {
  const name = shopInfo.shopName || 'Hardware Shop';
  const tag  = shopInfo.description || 'Hardware & Building Supplies';
  document.title = name + ' — Hardware & Supplies';
  setText('shop-name', name);
  setText('shop-tag', tag);
  const meta = $('meta-desc');
  if (meta) meta.setAttribute('content', tag);
  renderLogo();
};

const renderLogo = () => {
  const logo = shopInfo.logo;

  const headerImg = $('logo-img');
  const headerSvg = $('logo-svg');
  const headerMark = $('logo-mark');
  if (logo && headerImg && headerSvg) {
    headerImg.src = logo;
    headerImg.alt = shopInfo.shopName || 'Logo';
    headerImg.hidden = false;
    headerSvg.hidden = true;
    if (headerMark) {
      headerMark.style.background = 'transparent';
      headerMark.style.boxShadow = '0 0 24px -4px var(--primary-glow)';
    }
  }

  const footerImg = $('footer-logo-img');
  const footerSvg = $('footer-logo-svg');
  const footerMark = $('footer-mark');
  if (logo && footerImg && footerSvg) {
    footerImg.src = logo;
    footerImg.alt = shopInfo.shopName || 'Logo';
    footerImg.hidden = false;
    footerSvg.hidden = true;
    if (footerMark) footerMark.style.background = 'transparent';
  }
};

const populateHero = () => {
  const tag = shopInfo.description ||
    'Professional-grade hardware, tools, and building supplies. Trade prices, honest service, fast delivery.';
  setText('hero-sub', tag);
  animateNum('stat-products', products.length);
  animateNum('stat-categories', categories.length);

  const phone = shopInfo.phone;
  const contactBtn = $('hero-contact');
  if (phone && contactBtn) {
    contactBtn.href = waLink(phone, 'Hello, I have a question about your products.');
    contactBtn.target = '_blank';
    contactBtn.rel = 'noopener noreferrer';
    setText('hero-contact-text', 'Chat with us');
  } else if (contactBtn) {
    contactBtn.hidden = true;
  }

  const bulkCta = $('bulk-cta');
  if (phone && bulkCta) {
    bulkCta.href = waLink(phone,
      `Hello,\n\nI'd like a trade quote for a bulk order.\n\nItems needed:\n1. \n2. \n3. \n\nDelivery to: \n\nThank you.`);
    bulkCta.target = '_blank';
    bulkCta.rel = 'noopener noreferrer';
  } else if (bulkCta) {
    bulkCta.hidden = true;
  }
};

const animateNum = (id, target) => {
  const el = $(id);
  if (!el) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    el.textContent = target;
    return;
  }
  const duration = 1100;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const populateContact = () => {
  const phone = shopInfo.phone;

  const phoneBtn = $('phone-btn');
  if (phone && phoneBtn) {
    phoneBtn.href = 'tel:' + phone;
    phoneBtn.hidden = false;
    setText('phone-text', phone);
  }

  const waBtn = $('wa-btn');
  if (phone && waBtn) {
    waBtn.href = waLink(phone, 'Hello, I would like to inquire about your products.');
    waBtn.target = '_blank';
    waBtn.rel = 'noopener noreferrer';
    waBtn.hidden = false;
  }

  const fab = $('wa-fab');
  if (phone && fab) {
    fab.href = waLink(phone, 'Hello! I would like to inquire about your products.');
    fab.target = '_blank';
    fab.rel = 'noopener noreferrer';
    fab.hidden = false;
  }
};

const populateCategoryBar = () => {
  const bar = $('category-bar');
  if (!bar) return;

  const allTab = `
    <button class="cat-tab active" data-cat="" role="tab" aria-selected="true">
      All Products
      <span class="cat-tab-count">${products.length}</span>
    </button>
  `;
  const tabs = categories.map((c) => `
    <button class="cat-tab" data-cat="${escapeHtml(c.name)}" role="tab" aria-selected="false">
      ${escapeHtml(c.name)}
      <span class="cat-tab-count">${c.count}</span>
    </button>
  `).join('');

  bar.innerHTML = allTab + tabs;

  bar.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.cat-tab').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      activeCategory = btn.dataset.cat || '';
      render();
      if (window.innerWidth < 900) {
        document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

const populateCategoryShowcase = () => {
  const grid = $('category-showcase');
  if (!grid) return;
  if (!categories || categories.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; padding:48px; text-align:center; color:var(--text-muted); font-style:italic;">No categories yet.</div>`;
    return;
  }

  grid.innerHTML = categories.map((c, i) => {
    const img = categoryImageUrl(c);
    const emoji = categoryIconEmoji(c.name);
    const num = String(i + 1).padStart(2, '0');
    const fallback = svgFallbackImage(c.name, c.name);

    return `
      <button class="cat-card reveal" style="--i:${i % 6}" data-cat="${escapeHtml(c.name)}" type="button" aria-label="Browse ${escapeHtml(c.name)} — ${c.count} products">
        <div class="cat-card-img">
          <img src="${img}"
               alt="${escapeHtml(c.name)}"
               loading="lazy"
               width="400" height="300"
               data-fallback="${escapeHtml(fallback)}"
               onerror="this.onerror=null;this.src=this.dataset.fallback;" />
          <span class="cat-card-icon" aria-hidden="true">${emoji}</span>
          <span class="cat-card-num">${num}</span>
        </div>
        <div class="cat-card-body">
          <div class="cat-card-text">
            <div class="cat-card-name">${escapeHtml(c.name)}</div>
            <div class="cat-card-count">${c.count} ${c.count === 1 ? 'product' : 'products'}</div>
          </div>
          <div class="cat-card-arrow" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </div>
        </div>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.cat-card').forEach((card) => {
    card.addEventListener('click', () => {
      const cat = card.dataset.cat;
      const targetTab = document.querySelector(`.cat-tab[data-cat="${CSS.escape(cat)}"]`);
      if (targetTab) targetTab.click();
      document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  observeNewReveals();
};

const populateFooter = () => {
  const name = shopInfo.shopName || 'Hardware Shop';
  setText('footer-name', name);
  setText('footer-tagline', shopInfo.description || '');

  const visit = $('footer-visit');
  if (visit) {
    const items = [];
    if (shopInfo.address) items.push(`<div class="static">${escapeHtml(shopInfo.address)}</div>`);
    if (shopInfo.phone)   items.push(`<a href="tel:${escapeHtml(shopInfo.phone)}">${escapeHtml(shopInfo.phone)}</a>`);
    visit.innerHTML = items.join('') || '<div class="static">—</div>';
  }

  const contact = $('footer-contact');
  if (contact) {
    const items = [];
    if (shopInfo.phone) items.push(`<a href="${waLink(shopInfo.phone, 'Hello!')}" target="_blank" rel="noopener noreferrer">WhatsApp chat</a>`);
    if (shopInfo.email) items.push(`<a href="mailto:${escapeHtml(shopInfo.email)}">${escapeHtml(shopInfo.email)}</a>`);
    contact.innerHTML = items.join('') || '<div class="static">—</div>';
  }

  const catCol = $('footer-cats');
  if (catCol) {
    const top = categories.slice(0, 5);
    catCol.innerHTML = top.map((c) => `<a href="#" data-footer-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</a>`).join('') || '<div class="static">—</div>';
    catCol.querySelectorAll('[data-footer-cat]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = a.dataset.footerCat;
        const targetBtn = document.querySelector(`.cat-tab[data-cat="${CSS.escape(cat)}"]`);
        if (targetBtn) {
          targetBtn.click();
          document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  const follow = $('footer-follow');
  if (follow) {
    const items = [];
    if (shopInfo.websiteUrl) items.push(`<a href="${escapeHtml(shopInfo.websiteUrl)}" target="_blank" rel="noopener noreferrer">Website</a>`);
    if (shopInfo.whatsappGroupUrl) items.push(`<a href="${escapeHtml(shopInfo.whatsappGroupUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp Group</a>`);
    if (shopInfo.phone) items.push(`<a href="${waLink(shopInfo.phone, 'Hello!')}" target="_blank" rel="noopener noreferrer">Chat with us</a>`);
    follow.innerHTML = items.join('') || '<div class="static">—</div>';
  }

  setText('footer-legal', `© ${new Date().getFullYear()} ${name}`);
};


// ==========================================================================
// MAIN MENU
// ==========================================================================

const wireMainMenu = () => {
  const menuItems = document.querySelectorAll('.menu-item');
  buildDepartmentsPanel();

  menuItems.forEach((item) => {
    if (item.classList.contains('menu-dropdown')) {
      const toggle = () => {
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.menu-dropdown').forEach((d) => {
          d.classList.remove('open');
          d.setAttribute('aria-expanded', 'false');
        });
        if (!wasOpen) {
          item.classList.add('open');
          item.setAttribute('aria-expanded', 'true');
        }
      };
      item.addEventListener('click', (e) => { e.stopPropagation(); toggle(); });
      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
      return;
    }
    item.addEventListener('click', (e) => {
      e.preventDefault();
      handleMenuAction(item.dataset.action);
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.menu-dropdown').forEach((d) => {
      d.classList.remove('open');
      d.setAttribute('aria-expanded', 'false');
    });
  });

  document.querySelectorAll('.menu-panel').forEach((p) => {
    p.addEventListener('click', (e) => e.stopPropagation());
  });
};

const buildDepartmentsPanel = () => {
  const panel = $('departments-panel');
  if (!panel) return;

  if (!categories || categories.length === 0) {
    panel.innerHTML = `<div class="menu-panel-head">All Departments</div><div class="menu-panel-empty">No departments yet</div>`;
    return;
  }

  const items = categories.map((c) => `
    <div class="menu-panel-item" data-cat="${escapeHtml(c.name)}" role="menuitem" tabindex="0">
      <span>${escapeHtml(c.name)}</span>
      <span class="menu-panel-item-count">${c.count}</span>
    </div>
  `).join('');

  panel.innerHTML = `<div class="menu-panel-head">All Departments</div>${items}`;

  panel.querySelectorAll('.menu-panel-item').forEach((el) => {
    const activate = () => {
      const cat = el.dataset.cat;
      const targetTab = document.querySelector(`.cat-tab[data-cat="${CSS.escape(cat)}"]`);
      if (targetTab) targetTab.click();
      document.querySelectorAll('.menu-dropdown').forEach((d) => {
        d.classList.remove('open');
        d.setAttribute('aria-expanded', 'false');
      });
    };
    el.addEventListener('click', activate);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); activate(); }
    });
  });
};

const handleMenuAction = (action) => {
  switch (action) {
    case 'home':
      window.scrollTo({ top: 0, behavior: 'smooth' });
      break;
    case 'offers': {
      const offerCount = products.filter((p) => p.stockStatus === 'low' || p.stockStatus === 'out').length;
      if (offerCount > 0) {
        showToast(`${offerCount} product${offerCount === 1 ? '' : 's'} on special`, '🔥');
        document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        showToast('Special offers coming soon', '🔥');
      }
      break;
    }
    case 'about':    showToast('About us page coming soon', '📖'); break;
    case 'services': showToast('Services page coming soon', '⚙️'); break;
    case 'contact':  document.querySelector('.footer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); break;
    default: break;
  }
};


// ==========================================================================
// EVENTS
// ==========================================================================

const wireEvents = () => {
  const searchInput = $('search-input');
  const searchClear = $('search-clear');

  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    if (searchClear) searchClear.hidden = !searchTerm;
    render();
  });

  searchClear?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    searchTerm = '';
    if (searchClear) searchClear.hidden = true;
    render();
    searchInput?.focus();
  });

  $('sort-select')?.addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
  });

  $('hero-cta')?.addEventListener('click', () => {
    document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  $('modal-close')?.addEventListener('click', closeModal);
  $('modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
};


// ==========================================================================
// FILTER + SORT
// ==========================================================================

const getFiltered = () => {
  let list = products.slice();
  if (activeCategory) list = list.filter((p) => p.category === activeCategory);
  if (searchTerm) {
    list = list.filter((p) => {
      const hay = [p.name || '', p.brand || '', p.sku || '', p.category || ''].join(' ').toLowerCase();
      return hay.includes(searchTerm);
    });
  }
  switch (sortMode) {
    case 'price-asc':  list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); break;
    case 'price-desc': list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)); break;
    case 'name-asc':   list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))); break;
    default: break;
  }
  return list;
};


// ==========================================================================
// RENDER
// ==========================================================================

const render = () => {
  const content = $('content');
  if (!content) return;

  const filtered = getFiltered();
  const total = products.length;
  const shown = filtered.length;

  const rc = $('result-count');
  if (rc) {
    rc.innerHTML = shown === total
      ? `Showing <strong>${total}</strong> product${total === 1 ? '' : 's'}`
      : `<strong>${shown}</strong> of <strong>${total}</strong> products`;
  }

  if (filtered.length === 0) {
    content.className = 'state-empty';
    content.innerHTML = `
      <div class="empty-icon" aria-hidden="true">🔍</div>
      <div class="empty-h">No products found</div>
      <div class="empty-p">${searchTerm
        ? `Nothing matches "<strong>${escapeHtml(searchTerm)}</strong>". Try a different search term.`
        : 'No products in this category yet.'}</div>
      <button class="empty-btn" onclick="window.clearAllFilters()">View all products</button>
    `;
    return;
  }

  content.className = '';
  content.innerHTML = `
    <div class="grid" role="list">
      ${filtered.map((p, i) => {
        const waClickable = !!shopInfo.phone;
        const fallback = svgFallbackImage(p.name, p.category);
        return `
          <div class="card reveal" style="--i:${i % 8}" data-id="${escapeHtml(p.id)}" role="listitem" tabindex="0">
            <div class="card-img">
              <img src="${productImageUrl(p)}"
                   alt="${escapeHtml(p.name)}"
                   loading="lazy"
                   width="400" height="300"
                   data-fallback="${escapeHtml(fallback)}"
                   onerror="this.onerror=null;this.src=this.dataset.fallback;" />
              <span class="card-badge ${stockClass(p.stockStatus)}">${stockLabel(p.stockStatus)}</span>
              ${waClickable ? `
                <button class="card-wa" data-product-id="${escapeHtml(p.id)}" aria-label="Order ${escapeHtml(p.name)} on WhatsApp">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.1 1.6 5.9L0 24l6.3-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5ZM12 21.9c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.3-.4A9.9 9.9 0 0 1 2.1 12c0-5.5 4.4-9.9 9.9-9.9 2.6 0 5.1 1 7 2.9a9.9 9.9 0 0 1 2.9 7c0 5.5-4.4 9.9-9.9 9.9Zm5.4-7.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3Z"/>
                  </svg>
                </button>
              ` : ''}
            </div>
            <div class="card-body">
              ${p.category ? `<span class="card-cat">${escapeHtml(p.category)}</span>` : ''}
              <div class="card-name">${escapeHtml(p.name)}</div>
              ${p.brand ? `<div class="card-brand">${escapeHtml(p.brand)}</div>` : ''}
              <div class="card-foot">
                <div class="card-price-wrap">
                  <div class="card-unit">${escapeHtml(unitLabel(p.unit) || '—')}</div>
                  <div class="card-price">${formatPrice(p.price)}</div>
                </div>
                <div class="card-arrow" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  content.querySelectorAll('.card').forEach((card) => {
    const openProduct = () => {
      const id = card.dataset.id;
      const product = products.find((p) => String(p.id) === String(id));
      if (product) openModal(product);
    };
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-wa')) return;
      openProduct();
    });
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openProduct(); }
    });
  });

  content.querySelectorAll('.card-wa').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.productId;
      const product = products.find((p) => String(p.id) === String(id));
      if (product && shopInfo.phone) {
        window.open(waLink(shopInfo.phone, orderMessage(product)), '_blank', 'noopener,noreferrer');
      }
    });
  });

  initCardSpotlight();
  observeNewReveals();
};


// ==========================================================================
// MODAL — DEFENSIVE
// ==========================================================================

const openModal = (product) => {
  try {
    const setVal = (id, value) => {
      const el = $(id);
      if (!el) return;
      const has = value !== null && value !== undefined && String(value).trim() !== '';
      el.textContent = has ? String(value) : '—';
    };

    const img = $('modal-img');
    if (img) {
      const fallback = svgFallbackImage(product.name, product.category);
      img.onerror = () => {
        img.onerror = null;
        img.src = fallback;
      };
      img.src = productImageUrl(product);
      img.alt = product.name || '';
    }

    const badge = $('modal-badge');
    if (badge) {
      badge.textContent = stockLabel(product.stockStatus);
      badge.className = 'modal-status ' + stockClass(product.stockStatus);
    }

    const cat = $('modal-cat');
    if (cat) {
      const hasCat = !!(product.category && String(product.category).trim());
      cat.textContent = hasCat ? product.category : '';
      cat.hidden = !hasCat;
    }

    setVal('modal-name', product.name);

    const brandEl = $('modal-brand');
    if (brandEl) {
      const hasBrand = !!(product.brand && String(product.brand).trim());
      brandEl.textContent = hasBrand ? product.brand : '';
      brandEl.hidden = !hasBrand;
    }

    setVal('modal-price', formatPrice(product.price));
    setVal('modal-unit-tag', unitLabel(product.unit));
    setVal('modal-sku', product.sku);
    setVal('modal-unit', product.unit);
    setVal('modal-status', stockLabel(product.stockStatus));

    const orderBtn = $('modal-order-btn');
    if (orderBtn) {
      if (shopInfo.phone) {
        orderBtn.href = waLink(shopInfo.phone, orderMessage(product));
        orderBtn.target = '_blank';
        orderBtn.rel = 'noopener noreferrer';
        orderBtn.hidden = false;
      } else {
        orderBtn.hidden = true;
      }
    }

    const callBtn = $('modal-call-btn');
    if (callBtn) {
      if (shopInfo.phone) {
        callBtn.href = 'tel:' + shopInfo.phone;
        callBtn.hidden = false;
      } else {
        callBtn.hidden = true;
      }
    }

    const modal = $('modal');
    if (modal) {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      setTimeout(() => $('modal-close')?.focus(), 50);
    }

  } catch (err) {
    console.error('[Modal] open failed:', err);
    showToast('Could not open product details', 'error');
  }
};

const closeModal = () => {
  const modal = $('modal');
  if (modal) modal.hidden = true;
  document.body.style.overflow = '';
};


// ==========================================================================
// GLOBAL HELPER
// ==========================================================================

window.clearAllFilters = () => {
  searchTerm = '';
  activeCategory = '';
  sortMode = 'featured';

  const si = $('search-input');
  const sc = $('search-clear');
  const ss = $('sort-select');

  if (si) si.value = '';
  if (sc) sc.hidden = true;
  if (ss) ss.value = 'featured';

  document.querySelectorAll('.cat-tab').forEach((b, i) => {
    const active = i === 0;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active ? 'true' : 'false');
  });

  render();
};


// ==========================================================================
// HERO 3D WORKSHOP SCENE
// ==========================================================================

let hero3D = null;

const hero3DColor = () => {
  const css = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim();
  try { return new THREE.Color(css || '#3b82f6'); }
  catch (e) { return new THREE.Color('#3b82f6'); }
};

const wireMat = (color, opacity = 0.85) => new THREE.MeshBasicMaterial({
  color, wireframe: true, transparent: true, opacity
});

const glowMat = (color, opacity = 0.15) => new THREE.MeshBasicMaterial({
  color, transparent: true, opacity, depthWrite: false
});

const heroMakeHexNut = (color, scale = 1) => {
  const g = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.45, 6), wireMat(color, 0.9));
  outer.rotation.x = Math.PI / 2;
  g.add(outer);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 32), wireMat(color, 0.55)));
  g.add(new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.04, 6, 32), wireMat(color, 0.55)));
  g.scale.setScalar(scale);
  return g;
};

const heroMakeBolt = (color, scale = 1) => {
  const g = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 6), wireMat(color, 0.9));
  head.rotation.x = Math.PI / 2;
  head.position.z = 1.2;
  g.add(head);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 2, 12), wireMat(color, 0.7));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.15;
  g.add(shaft);
  for (let i = 0; i < 8; i++) {
    const thread = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 4, 16), wireMat(color, 0.55));
    thread.position.z = -0.6 - i * 0.18;
    g.add(thread);
  }
  g.scale.setScalar(scale);
  return g;
};

const heroMakeGear = (color, scale = 1) => {
  const g = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), wireMat(color, 0.85));
  hub.rotation.x = Math.PI / 2;
  g.add(hub);
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 16), wireMat(color, 0.6)));
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.22, 0.4), wireMat(color, 0.85));
    tooth.position.set(Math.cos(angle) * 0.78, Math.sin(angle) * 0.78, 0);
    tooth.rotation.z = angle;
    g.add(tooth);
  }
  g.scale.setScalar(scale);
  return g;
};

const heroMakePipe = (color, scale = 1) => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.2, 10, 24, Math.PI / 2), wireMat(color, 0.85)));
  const f1 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), wireMat(color, 0.6));
  f1.position.set(0.7, 0, 0);
  f1.rotation.y = Math.PI / 2;
  g.add(f1);
  const f2 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 16), wireMat(color, 0.6));
  f2.position.set(0, 0.7, 0);
  g.add(f2);
  g.scale.setScalar(scale);
  return g;
};

const heroMakeScrewdriver = (color, scale = 1) => {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.2, 8), wireMat(color, 0.85));
  handle.rotation.x = Math.PI / 2;
  handle.position.z = 0.6;
  g.add(handle);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.5, 8), wireMat(color, 0.7));
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = -0.75;
  g.add(shaft);
  const tip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.06, 0.2), wireMat(color, 0.85));
  tip.position.z = -1.55;
  g.add(tip);
  g.scale.setScalar(scale);
  return g;
};

const initHero3D = () => {
  const canvas = $('hero-3d');
  const hero = $('hero');
  if (!canvas || !hero) return;
  if (typeof THREE === 'undefined') { canvas.remove(); return; }

  const isMobile = window.innerWidth < 768;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: !isMobile, powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  } catch (e) {
    console.warn('[Hero3D] WebGL unavailable:', e.message);
    canvas.remove();
    return;
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(0, 0, isMobile ? 11 : 9);

  const primary = hero3DColor();

  const core = new THREE.Group();
  core.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), glowMat(primary, 0.25)));
  const coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 0), wireMat(primary, 0.9));
  core.add(coreWire);

  const electronMat = new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.9 });
  for (let i = 0; i < 3; i++) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), electronMat);
    e.userData.baseAngle = (i / 3) * Math.PI * 2;
    e.userData.orbitRadius = 1.4;
    core.add(e);
  }
  scene.add(core);

  const orbiters = [];
  const addOrbiter = (obj, radius, angle, yOffset = 0, speed = 1) => {
    obj.userData = { ...obj.userData, orbitRadius: radius, baseAngle: angle, speed, yOffset };
    scene.add(obj);
    orbiters.push(obj);
  };

  addOrbiter(heroMakeHexNut(primary, 0.55), 3.2, Math.PI * 0.9, 1.2, 0.4);
  addOrbiter(heroMakeBolt(primary, 0.5), 3.5, 0, 0.5, -0.3);
  addOrbiter(heroMakeGear(primary, 0.55), 3.0, -Math.PI * 0.3, 1.5, 0.35);
  addOrbiter(heroMakePipe(primary, 0.6), 3.3, Math.PI * 0.8, -1.2, -0.25);
  addOrbiter(heroMakeScrewdriver(primary, 0.5), 3.7, Math.PI * 0.15, -1.0, 0.3);

  const ring1 = new THREE.Mesh(
    new THREE.TorusGeometry(2.8, 0.012, 6, 120),
    new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.4 })
  );
  ring1.rotation.x = Math.PI / 2.2;
  scene.add(ring1);

  const ring2 = new THREE.Mesh(
    new THREE.TorusGeometry(3.6, 0.012, 6, 120),
    new THREE.MeshBasicMaterial({ color: primary, transparent: true, opacity: 0.25 })
  );
  ring2.rotation.x = Math.PI / 1.6;
  ring2.rotation.y = 0.5;
  scene.add(ring2);

  const pCount = isMobile ? 100 : 200;
  const positions = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 22;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 10;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: primary, size: 0.04, transparent: true, opacity: 0.55
  }));
  scene.add(particles);

  const resize = () => {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  let mx = 0, my = 0;
  hero.addEventListener('mousemove', (e) => {
    const rect = hero.getBoundingClientRect();
    mx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    my = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();

  const frame = () => {
    const t = clock.getElapsedTime();
    core.rotation.y = t * 0.3;
    core.rotation.x = Math.sin(t * 0.4) * 0.2;
    coreWire.rotation.y = -t * 0.5;
    core.position.y = Math.sin(t * 0.8) * 0.15;

    core.children.forEach((child) => {
      if (child.userData.baseAngle !== undefined) {
        const a = child.userData.baseAngle + t * 0.8;
        child.position.x = Math.cos(a) * child.userData.orbitRadius;
        child.position.y = Math.sin(a) * child.userData.orbitRadius * 0.5;
      }
    });

    orbiters.forEach((obj) => {
      const d = obj.userData;
      const a = d.baseAngle + t * 0.15 * d.speed;
      obj.position.x = Math.cos(a) * d.orbitRadius;
      obj.position.z = Math.sin(a) * d.orbitRadius * 0.6;
      obj.position.y = d.yOffset + Math.sin(t * 0.6 + d.baseAngle) * 0.3;
      obj.rotation.y = t * 0.4 * d.speed;
      obj.rotation.x = Math.sin(t * 0.3 + d.baseAngle) * 0.3;
    });

    ring1.rotation.z = t * 0.1;
    ring2.rotation.z = -t * 0.08;
    particles.rotation.y = t * 0.02;

    camera.position.x += (mx * 1.2 - camera.position.x) * 0.05;
    camera.position.y += (-my * 0.8 - camera.position.y) * 0.05;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
    if (!reduceMotion) requestAnimationFrame(frame);
  };
  frame();

  hero3D = { core, orbiters, ring1, ring2, particles, renderer, scene, camera };
};

const updateHero3DTheme = () => {
  if (!hero3D || typeof THREE === 'undefined') return;
  const c = hero3DColor();
  hero3D.scene.traverse((obj) => {
    if (obj.material && obj.material.color) obj.material.color.copy(c);
  });
  hero3D.renderer.render(hero3D.scene, hero3D.camera);
};


// ==========================================================================
// BOOT
// ==========================================================================

init();
