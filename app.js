// ==========================================================================
// HARDWARE SHOP — APP LOGIC (DUAL-THEME BLUE)
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
// THEME TOGGLE
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
};

const initTheme = () => {
  applyTheme(getStoredTheme(), false);

  const btn = $('theme-toggle');
  if (btn) btn.addEventListener('click', toggleTheme);

  // React to system preference changes if user hasn't chosen
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
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <span>${message}</span>
  `;
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

const productImageUrl = (p) => {
  if (p && p.image && String(p.image).trim().length > 20) return p.image;
  const initial = ((p && p.name) || '?').charAt(0).toUpperCase();
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
// CATEGORY ICONS + FALLBACK SVG
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

const categoryFallbackSvg = (name) => {
  const iconKey = pickCategoryIcon(name);
  const iconPath = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS.box;
  const isLight = document.documentElement.getAttribute('data-theme') === 'light';

  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  const rot = Math.abs(hash) % 24;

  const bg1 = isLight ? '#f1f5f9' : '#0a0e1f';
  const bg2 = isLight ? '#e2e8f0' : '#151b33';
  const stroke = isLight ? 'rgba(37,99,235,0.10)' : 'rgba(96,165,250,0.10)';
  const glow = isLight ? 'rgba(37,99,235,0.18)' : 'rgba(96,165,250,0.28)';
  const icon = isLight ? '#2563eb' : '#60a5fa';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${bg1}"/>
        <stop offset="1" stop-color="${bg2}"/>
      </linearGradient>
      <pattern id="p" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(${rot})">
        <path d="M0 28 L28 0" stroke="${stroke}" stroke-width="1"/>
      </pattern>
      <radialGradient id="v" cx="0.5" cy="0.4" r="0.7">
        <stop offset="0" stop-color="${glow}"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="400" height="300" fill="url(#g)"/>
    <rect width="400" height="300" fill="url(#p)"/>
    <rect width="400" height="300" fill="url(#v)"/>
    <g transform="translate(200 150) scale(4.2) translate(-12 -12)"
       fill="none" stroke="${icon}" stroke-width="1.5"
       stroke-linecap="round" stroke-linejoin="round" opacity="0.9">
      <path d="${iconPath}"/>
    </g>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

const isRealImage = (v) =>
  typeof v === 'string' && v.trim().length > 20 &&
  (v.startsWith('data:image') || v.startsWith('http') || v.startsWith('/') ||
   v.startsWith('./') || v.startsWith('../'));

const categoryImageUrl = (cat) => {
  const catImg = cat && (
    cat.image || cat.imageUrl || cat.img ||
    cat.thumbnail || cat.photo || cat.picture
  );
  if (isRealImage(catImg)) return catImg;

  const productWithImage = products.find(
    (p) => p.category === cat.name && isRealImage(p.image)
  );
  if (productWithImage) return productWithImage.image;

  return categoryFallbackSvg(cat.name || 'Category');
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
  `Hello,`,
  ``,
  `I would like to order:`,
  ``,
  `*${product.name}*`,
  product.sku ? `Code: ${product.sku}` : '',
  product.brand ? `Brand: ${product.brand}` : '',
  `Price: ${formatPrice(product.price)}${product.unit ? ' ' + unitLabel(product.unit) : ''}`,
  `Quantity: __________`,
  ``,
  `Please confirm stock and total.`
].filter(Boolean).join('\n');


// ==========================================================================
// INIT
// ==========================================================================

const init = async () => {

  initTheme();

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
// HERO / CARD SPOTLIGHT
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

const initCardSpotlight = () => {
  document.querySelectorAll('.card').forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty('--mx', x + '%');
      card.style.setProperty('--my', y + '%');
    });
  });
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
      `Hello,\n\nI'd like a trade quote for a bulk order.\n\nItems needed:\n1. \n2. \n3. \n\nDelivery to: \n\nThank you.`
    );
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
    grid.innerHTML = `
      <div style="grid-column:1/-1; padding:48px; text-align:center; color:var(--text-3); font-style:italic;">
        No categories yet.
      </div>
    `;
    return;
  }

  grid.innerHTML = categories.map((c, i) => {
    const img = categoryImageUrl(c);
    const emoji = categoryIconEmoji(c.name);
    const num = String(i + 1).padStart(2, '0');
    const fallbackSvg = categoryFallbackSvg(c.name);

    return `
      <button class="cat-card reveal" style="--i:${i % 6}" data-cat="${escapeHtml(c.name)}" type="button" aria-label="Browse ${escapeHtml(c.name)} — ${c.count} products">
        <div class="cat-card-img">
          <img src="${img}"
               alt="${escapeHtml(c.name)}"
               loading="lazy"
               width="400" height="300"
               data-fallback="${fallbackSvg}"
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
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
    if (shopInfo.phone) {
      items.push(`<a href="${waLink(shopInfo.phone, 'Hello!')}" target="_blank" rel="noopener noreferrer">WhatsApp chat</a>`);
    }
    if (shopInfo.email) {
      items.push(`<a href="mailto:${escapeHtml(shopInfo.email)}">${escapeHtml(shopInfo.email)}</a>`);
    }
    contact.innerHTML = items.join('') || '<div class="static">—</div>';
  }

  const catCol = $('footer-cats');
  if (catCol) {
    const top = categories.slice(0, 5);
    catCol.innerHTML = top.map((c) => `
      <a href="#" data-footer-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</a>
    `).join('') || '<div class="static">—</div>';

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
    if (shopInfo.websiteUrl) {
      items.push(`<a href="${escapeHtml(shopInfo.websiteUrl)}" target="_blank" rel="noopener noreferrer">Website</a>`);
    }
    if (shopInfo.whatsappGroupUrl) {
      items.push(`<a href="${escapeHtml(shopInfo.whatsappGroupUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp Group</a>`);
    }
    if (shopInfo.phone) {
      items.push(`<a href="${waLink(shopInfo.phone, 'Hello!')}" target="_blank" rel="noopener noreferrer">Chat with us</a>`);
    }
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
    panel.innerHTML = `
      <div class="menu-panel-head">All Departments</div>
      <div class="menu-panel-empty">No departments yet</div>
    `;
    return;
  }

  const items = categories.map((c) => `
    <div class="menu-panel-item" data-cat="${escapeHtml(c.name)}" role="menuitem" tabindex="0">
      <span>${escapeHtml(c.name)}</span>
      <span class="menu-panel-item-count">${c.count}</span>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="menu-panel-head">All Departments</div>
    ${items}
  `;

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
      const offerCount = products.filter(
        (p) => p.stockStatus === 'low' || p.stockStatus === 'out'
      ).length;
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

  if (activeCategory) {
    list = list.filter((p) => p.category === activeCategory);
  }

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
      <button class="empty-btn" onclick="window.clearAllFilters()">
        View all products
      </button>
    `;
    return;
  }

  content.className = '';
  content.innerHTML = `
    <div class="grid" role="list">
      ${filtered.map((p, i) => {
        const waClickable = !!shopInfo.phone;
        return `
          <div class="card reveal" style="--i:${i % 8}" data-id="${escapeHtml(p.id)}" role="listitem" tabindex="0">
            <div class="card-img">
              <img src="${productImageUrl(p)}" alt="${escapeHtml(p.name)}" loading="lazy" width="400" height="300" />
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
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
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
// MODAL
// ==========================================================================

const openModal = (product) => {

  const setVal = (id, value) => {
    const el = $(id);
    if (!el) return;
    const has = value !== null && value !== undefined && String(value).trim() !== '';
    el.textContent = has ? String(value) : '—';
  };

  const img = $('modal-img');
  if (img) {
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
// BOOT
// ==========================================================================

init();
