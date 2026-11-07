// ==========================================================================
// HARDWARE SHOP — APP LOGIC (v2, dual theme)
// Data files: products.json, categories.json, shop-info.json (unchanged format)
// ==========================================================================
'use strict';

const state = { products: [], categories: [], shop: {}, cat: '', q: '', sort: 'featured', cur: 'Rs.' };

const $ = (id) => document.getElementById(id);
const setText = (id, v) => { const el = $(id); if (el) el.textContent = v == null ? '' : String(v); };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const icon = (id, size = 18) => `<svg width="${size}" height="${size}" aria-hidden="true"><use href="#${id}"/></svg>`;

const escapeHtml = (s) => s == null ? '' : String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#039;');


// ==========================================================================
// THEME
// ==========================================================================
const THEME_KEY = 'mac-theme';

const storedTheme = () => {
  try { const t = localStorage.getItem(THEME_KEY); if (t === 'light' || t === 'dark') return t; } catch (e) {}
  return null;
};

const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  $('meta-theme-color')?.setAttribute('content', theme === 'light' ? '#f8fafc' : '#060814');
  const next = theme === 'dark' ? 'light' : 'dark';
  $('theme-toggle')?.setAttribute('aria-label', `Switch to ${next} theme`);
};

const initTheme = () => {
  applyTheme(storedTheme() || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));

  $('theme-toggle')?.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
  });

  matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!storedTheme()) applyTheme(e.matches ? 'light' : 'dark');
  });
};


// ==========================================================================
// TOAST
// ==========================================================================
const showToast = (message, iconId = 'i-info', duration = 3000) => {
  const wrap = $('toast-wrap');
  if (!wrap) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = icon(iconId, 18);
  const span = document.createElement('span');
  span.textContent = message;                       // textContent: no HTML injection
  t.appendChild(span);
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 200); }, duration);
};


// ==========================================================================
// FORMAT HELPERS
// ==========================================================================
const formatPrice = (n) => state.cur + ' ' + (Number(n) || 0).toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const stockClass = (s) => (s === 'out' ? 'out' : s === 'low' ? 'low' : '');
const stockLabel = (s) => (s === 'out' ? 'Out of Stock' : s === 'low' ? 'Low Stock' : 'In Stock');

const UNIT_MAP = {
  piece: 'per piece', pcs: 'per piece', unit: 'per unit', meter: 'per metre', kg: 'per kg', gram: 'per gram',
  box: 'per box', packet: 'per packet', roll: 'per roll', set: 'per set', bottle: 'per bottle', liter: 'per litre'
};
const unitLabel = (u) => (u ? UNIT_MAP[String(u).toLowerCase()] || `per ${u}` : '');

const loadJSON = async (file, fallback) => {
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
// IMAGES + CATEGORY ICONS (SVG sprite ids live in index.html)
// ==========================================================================
const isRealImage = (v) => typeof v === 'string' && v.trim().length > 20 &&
  (v.startsWith('data:image') || v.startsWith('http') || v.startsWith('/') || v.startsWith('./') || v.startsWith('../'));

const pickCategoryIcon = (name) => {
  const n = (name || '').toLowerCase();
  if (/plumb|pipe|pvc/.test(n)) return 'c-pipe';
  if (/tool|hard|wrench/.test(n)) return 'i-wrench';
  if (/build|buld|cement|brick/.test(n)) return 'c-brick';
  if (/wir|wair|electric|cable/.test(n)) return 'c-bolt';
  if (/oil|paint|colou?r/.test(n)) return 'c-paint';
  if (/tin|roof|sheet/.test(n)) return 'c-roof';
  if (/box|bar|steel|metal/.test(n)) return 'c-bar';
  return 'c-box';
};

const placeholder = (inner) => `<div class="ph" aria-hidden="true">${inner}</div>`;
const productPlaceholder = (p) => placeholder(escapeHtml(((p && p.name) || '?').charAt(0).toUpperCase()));
const categoryPlaceholder = (name) => placeholder(icon(pickCategoryIcon(name), 96));

// Media block: real image if available, otherwise a styled placeholder (no emoji, no data-URI SVGs)
const mediaHtml = (src, alt, ph, eager = false) => isRealImage(src)
  ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" width="400" height="300" ${eager ? '' : 'loading="lazy" decoding="async"'} data-ph="${escapeHtml(ph)}" />`
  : ph;

// If an image fails to load, swap in the placeholder (works for dynamically added images)
document.addEventListener('error', (e) => {
  const img = e.target;
  if (img instanceof HTMLImageElement && img.dataset.ph) img.replaceWith(Object.assign(document.createElement('div'), { innerHTML: img.dataset.ph }).firstElementChild);
}, true);

const categoryImage = (cat) => {
  const own = cat && (cat.image || cat.imageUrl || cat.img || cat.thumbnail || cat.photo || cat.picture);
  if (isRealImage(own)) return own;
  const p = state.products.find((x) => x.category === cat.name && isRealImage(x.image));
  return p ? p.image : '';
};


// ==========================================================================
// WHATSAPP
// ==========================================================================
const waPhone = (raw) => {
  const d = String(raw || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('94')) return d;
  if (d.startsWith('0')) return '94' + d.slice(1);
  if (d.length === 9) return '94' + d;
  return d;
};

const waLink = (phone, message = '') => {
  const p = waPhone(phone);
  const base = p ? `https://wa.me/${p}` : 'https://wa.me/';
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
};

const orderMessage = (p) => [
  'Hello,', '', 'I would like to order:', '', `*${p.name}*`,
  p.sku ? `Code: ${p.sku}` : '',
  p.brand ? `Brand: ${p.brand}` : '',
  `Price: ${formatPrice(p.price)}${p.unit ? ' ' + unitLabel(p.unit) : ''}`,
  'Quantity: __________', '', 'Please confirm stock and total.'
].filter(Boolean).join('\n');

const openLink = (el, href, external = true) => {
  el.href = href;
  if (external) { el.target = '_blank'; el.rel = 'noopener noreferrer'; }
};


// ==========================================================================
// INIT
// ==========================================================================
const init = async () => {
  initTheme();

  const [prods, cats, shop] = await Promise.all([
    loadJSON('products.json', []), loadJSON('categories.json', []), loadJSON('shop-info.json', {})
  ]);

  state.products = Array.isArray(prods) ? prods : [];
  state.categories = Array.isArray(cats) ? cats : [];
  state.shop = shop && typeof shop === 'object' ? shop : {};
  state.cur = state.shop.currencySymbol || 'Rs.';

  // Build categories from products if categories.json is empty
  if (!state.categories.length && state.products.length) {
    const map = new Map();
    state.products.forEach((p) => {
      const c = (p.category || '').trim();
      if (c) map.set(c, { name: c, image: '', count: (map.get(c)?.count || 0) + 1 });
    });
    state.categories = [...map.values()].sort((a, b) => b.count - a.count);
  }

  // Always recount from live products
  const counts = {};
  state.products.forEach((p) => { if (p.category) counts[p.category] = (counts[p.category] || 0) + 1; });
  state.categories = state.categories.map((c) => ({ ...c, count: counts[c.name] || c.count || 0 }));

  populateBrand();
  populateHero();
  populateContact();
  populateCategoryBar();
  populateCategoryShowcase();
  populateFooter();
  wireEvents();
  wireMainMenu();
  syncHeaderHeight();

  readHash();
  render();
  $('content')?.setAttribute('aria-busy', 'false');
  observeReveals();
};


// ==========================================================================
// LAYOUT HELPERS
// ==========================================================================
// Toolbar sticks directly below the header, whatever the header's real height is
const syncHeaderHeight = () => {
  const header = document.querySelector('.header');
  if (!header) return;
  const set = () => document.documentElement.style.setProperty('--hh', header.offsetHeight + 'px');
  set();
  if ('ResizeObserver' in window) new ResizeObserver(set).observe(header);
  else addEventListener('resize', set);
};

const revealObserver = 'IntersectionObserver' in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); revealObserver.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' })
  : null;

const observeReveals = () => {
  document.querySelectorAll('.reveal:not(.in)').forEach((el) => {
    if (reduceMotion || !revealObserver) el.classList.add('in');
    else revealObserver.observe(el);
  });
};

const scrollToProducts = () =>
  document.querySelector('.products')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });


// ==========================================================================
// POPULATE
// ==========================================================================
const populateBrand = () => {
  const { shopName, description, logo } = state.shop;
  const name = shopName || 'Hardware Shop';
  const tag = description || 'Hardware & Building Supplies';

  document.title = name + ' — Hardware & Supplies';
  setText('shop-name', name);
  setText('shop-tag', tag);
  $('meta-desc')?.setAttribute('content', tag);

  if (!logo) return;
  [['logo-img', 'logo-svg', 'logo-mark'], ['footer-logo-img', 'footer-logo-svg', 'footer-mark']].forEach(([i, s, m]) => {
    const img = $(i), svg = $(s), mark = $(m);
    if (!img || !svg) return;
    img.src = logo; img.alt = name; img.hidden = false; svg.hidden = true;
    if (mark) mark.style.background = 'transparent';
  });
};

const animateNum = (id, target) => {
  const el = $(id);
  if (!el) return;
  if (reduceMotion) { el.textContent = target; return; }
  const start = performance.now(), dur = 1000;
  const tick = (now) => {
    const p = Math.min((now - start) / dur, 1);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const populateHero = () => {
  const { description, phone } = state.shop;
  if (description) setText('hero-sub', description);

  animateNum('stat-products', state.products.length);
  animateNum('stat-categories', state.categories.length);

  const contact = $('hero-contact');
  if (contact) {
    if (phone) openLink(contact, waLink(phone, 'Hello, I have a question about your products.'));
    else contact.hidden = true;
  }

  const bulk = $('bulk-cta');
  if (bulk) {
    if (phone) openLink(bulk, waLink(phone, "Hello,\n\nI'd like a trade quote for a bulk order.\n\nItems needed:\n1. \n2. \n3. \n\nDelivery to: \n\nThank you."));
    else bulk.hidden = true;
  }
};

const populateContact = () => {
  const { phone } = state.shop;
  if (!phone) return;

  const phoneBtn = $('phone-btn');
  if (phoneBtn) { openLink(phoneBtn, 'tel:' + phone, false); phoneBtn.hidden = false; setText('phone-text', phone); }

  const wa = $('wa-btn');
  if (wa) { openLink(wa, waLink(phone, 'Hello, I would like to inquire about your products.')); wa.hidden = false; }

  const fab = $('wa-fab');
  if (fab) { openLink(fab, waLink(phone, 'Hello! I would like to inquire about your products.')); fab.hidden = false; }
};

const populateCategoryBar = () => {
  const bar = $('category-bar');
  if (!bar) return;

  const tab = (name, label, count, active) => `
    <button class="cat-tab${active ? ' active' : ''}" type="button" role="tab" data-cat="${escapeHtml(name)}" aria-selected="${active}">
      ${escapeHtml(label)}<b>${count}</b>
    </button>`;

  bar.innerHTML = tab('', 'All Products', state.products.length, true) +
    state.categories.map((c) => tab(c.name, c.name, c.count, false)).join('');

  bar.addEventListener('click', (e) => {
    const btn = e.target.closest('.cat-tab');
    if (btn) { setCategory(btn.dataset.cat); if (innerWidth < 900) scrollToProducts(); }
  });
};

const populateCategoryShowcase = () => {
  const grid = $('category-showcase');
  if (!grid) return;

  if (!state.categories.length) {
    grid.innerHTML = '<p style="grid-column:1/-1;padding:48px;text-align:center;color:var(--text-3)">No categories yet.</p>';
    return;
  }

  grid.innerHTML = state.categories.map((c, i) => {
    const ph = categoryPlaceholder(c.name);
    return `
      <button class="cat-card reveal" style="--i:${i % 6}" type="button" data-cat="${escapeHtml(c.name)}"
              aria-label="Browse ${escapeHtml(c.name)} — ${c.count} product${c.count === 1 ? '' : 's'}">
        <span class="media">
          ${mediaHtml(categoryImage(c), c.name, ph)}
          <span class="cat-ico" aria-hidden="true">${icon(pickCategoryIcon(c.name), 20)}</span>
          <span class="cat-num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
        </span>
        <span class="cat-body">
          <span class="cat-text">
            <span class="cat-name" style="display:block">${escapeHtml(c.name)}</span>
            <span class="cat-count" style="display:block">${c.count} ${c.count === 1 ? 'product' : 'products'}</span>
          </span>
          <span class="arrow" aria-hidden="true">${icon('i-arrow', 14)}</span>
        </span>
      </button>`;
  }).join('');

  grid.addEventListener('click', (e) => {
    const card = e.target.closest('.cat-card');
    if (card) { setCategory(card.dataset.cat); scrollToProducts(); }
  });
};

const populateFooter = () => {
  const s = state.shop;
  const name = s.shopName || 'Hardware Shop';
  setText('footer-name', name);
  setText('footer-tagline', s.description || '');

  const dash = '<div class="static">—</div>';
  const ext = 'target="_blank" rel="noopener noreferrer"';

  const visit = [];
  if (s.address) visit.push(`<div class="static">${escapeHtml(s.address)}</div>`);
  if (s.phone) visit.push(`<a href="tel:${escapeHtml(s.phone)}">${escapeHtml(s.phone)}</a>`);
  $('footer-visit').innerHTML = visit.join('') || dash;

  const contact = [];
  if (s.phone) contact.push(`<a href="${waLink(s.phone, 'Hello!')}" ${ext}>WhatsApp chat</a>`);
  if (s.email) contact.push(`<a href="mailto:${escapeHtml(s.email)}">${escapeHtml(s.email)}</a>`);
  $('footer-contact').innerHTML = contact.join('') || dash;

  const cats = $('footer-cats');
  cats.innerHTML = state.categories.slice(0, 5)
    .map((c) => `<a href="#" data-footer-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</a>`).join('') || dash;
  cats.addEventListener('click', (e) => {
    const a = e.target.closest('[data-footer-cat]');
    if (!a) return;
    e.preventDefault();
    setCategory(a.dataset.footerCat);
    scrollToProducts();
  });

  const follow = [];
  if (s.websiteUrl) follow.push(`<a href="${escapeHtml(s.websiteUrl)}" ${ext}>Website</a>`);
  if (s.whatsappGroupUrl) follow.push(`<a href="${escapeHtml(s.whatsappGroupUrl)}" ${ext}>WhatsApp Group</a>`);
  if (s.phone) follow.push(`<a href="${waLink(s.phone, 'Hello!')}" ${ext}>Chat with us</a>`);
  $('footer-follow').innerHTML = follow.join('') || dash;

  setText('footer-legal', `© ${new Date().getFullYear()} ${name}`);
};


// ==========================================================================
// MAIN MENU
// ==========================================================================
const closeMenus = () => {
  document.querySelectorAll('.menu-dropdown.open').forEach((d) => {
    d.classList.remove('open');
    d.querySelector('button')?.setAttribute('aria-expanded', 'false');
  });
};

const buildDepartmentsPanel = () => {
  const panel = $('departments-panel');
  if (!panel) return;

  panel.innerHTML = '<div class="menu-panel-head">All Departments</div>' + (state.categories.length
    ? state.categories.map((c) => `
        <button class="menu-panel-item" type="button" role="menuitem" data-cat="${escapeHtml(c.name)}">
          <span>${escapeHtml(c.name)}</span><b>${c.count}</b>
        </button>`).join('')
    : '<div class="menu-panel-empty">No departments yet</div>');

  panel.addEventListener('click', (e) => {
    const item = e.target.closest('.menu-panel-item');
    if (!item) return;
    setCategory(item.dataset.cat);
    closeMenus();
    scrollToProducts();
  });
};

const handleMenuAction = (action) => {
  switch (action) {
    case 'home': scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' }); break;
    case 'offers': {
      const n = state.products.filter((p) => p.stockStatus === 'low' || p.stockStatus === 'out').length;
      if (n) { showToast(`${n} product${n === 1 ? '' : 's'} on special`, 'i-flame'); scrollToProducts(); }
      else showToast('Special offers coming soon', 'i-flame');
      break;
    }
    case 'about': showToast('About us page coming soon'); break;
    case 'services': showToast('Services page coming soon'); break;
    case 'contact': document.querySelector('.footer')?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }); break;
  }
};

const wireMainMenu = () => {
  buildDepartmentsPanel();

  const dd = document.querySelector('.menu-dropdown');
  const btn = $('dept-btn');
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = !dd.classList.contains('open');
    closeMenus();
    if (open) { dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
  });

  document.querySelectorAll('a.menu-item[data-action]').forEach((a) => {
    a.addEventListener('click', (e) => { e.preventDefault(); handleMenuAction(a.dataset.action); });
  });

  document.addEventListener('click', (e) => { if (!e.target.closest('.menu-dropdown')) closeMenus(); });
};


// ==========================================================================
// CATEGORY STATE + DEEP LINKS (#category=Name)
// ==========================================================================
const setCategory = (name, { updateHash = true } = {}) => {
  state.cat = name || '';

  document.querySelectorAll('.cat-tab').forEach((b) => {
    const on = b.dataset.cat === state.cat;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
    if (on) b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
  });

  if (updateHash) {
    const h = state.cat ? '#category=' + encodeURIComponent(state.cat) : location.pathname + location.search;
    history.replaceState(null, '', h);
  }
  render();
};

const readHash = () => {
  const m = location.hash.match(/^#category=(.+)$/);
  if (!m) return;
  let name = '';
  try { name = decodeURIComponent(m[1]); } catch (e) { return; }
  if (state.categories.some((c) => c.name === name)) {
    state.cat = name;
    document.querySelectorAll('.cat-tab').forEach((b) => {
      const on = b.dataset.cat === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
  }
};


// ==========================================================================
// EVENTS
// ==========================================================================
const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

const wireEvents = () => {
  const input = $('search-input');
  const clear = $('search-clear');

  const runSearch = debounce(() => { state.q = input.value.trim().toLowerCase(); render(); }, 150);
  input?.addEventListener('input', () => { clear.hidden = !input.value; runSearch(); });

  clear?.addEventListener('click', () => {
    input.value = ''; state.q = ''; clear.hidden = true; render(); input.focus();
  });

  $('sort-select')?.addEventListener('change', (e) => { state.sort = e.target.value; render(); });
  $('hero-cta')?.addEventListener('click', scrollToProducts);

  $('modal-close')?.addEventListener('click', closeModal);
  $('modal')?.addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });

  // Product grid: one delegated listener for clicks + keyboard (replaces per-card listeners)
  const content = $('content');
  content?.addEventListener('click', (e) => {
    const wa = e.target.closest('.card-wa');
    if (wa) {
      e.stopPropagation();
      const p = findProduct(wa.dataset.productId);
      if (p && state.shop.phone) open(waLink(state.shop.phone, orderMessage(p)), '_blank', 'noopener,noreferrer');
      return;
    }
    const card = e.target.closest('.card');
    if (card) { const p = findProduct(card.dataset.id); if (p) openModal(p, card); }
  });
  content?.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) {
      e.preventDefault();
      const p = findProduct(e.target.dataset.id);
      if (p) openModal(p, e.target);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeMenus(); closeModal(); }
    trapFocus(e);
  });

  addEventListener('hashchange', () => {
    const m = location.hash.match(/^#category=(.+)$/);
    if (m) { try { setCategory(decodeURIComponent(m[1]), { updateHash: false }); } catch (err) {} }
  });
};

const findProduct = (id) => state.products.find((p) => String(p.id) === String(id));


// ==========================================================================
// FILTER + SORT
// ==========================================================================
const getFiltered = () => {
  let list = state.products.slice();
  if (state.cat) list = list.filter((p) => p.category === state.cat);
  if (state.q) {
    list = list.filter((p) => [p.name, p.brand, p.sku, p.category].join(' ').toLowerCase().includes(state.q));
  }
  const price = (p) => Number(p.price) || 0;
  if (state.sort === 'price-asc') list.sort((a, b) => price(a) - price(b));
  else if (state.sort === 'price-desc') list.sort((a, b) => price(b) - price(a));
  else if (state.sort === 'name-asc') list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  return list;
};


// ==========================================================================
// RENDER
// ==========================================================================
const cardHtml = (p, i) => {
  const ph = productPlaceholder(p);
  const waBtn = state.shop.phone ? `
    <button class="card-wa" type="button" data-product-id="${escapeHtml(p.id)}" aria-label="Order ${escapeHtml(p.name)} on WhatsApp">${icon('i-wa', 20)}</button>` : '';

  return `
    <div class="card reveal" style="--i:${i % 8}" data-id="${escapeHtml(p.id)}" role="listitem" tabindex="0">
      <div class="media">
        ${mediaHtml(p.image, p.name, ph)}
        <span class="status ${stockClass(p.stockStatus)}">${stockLabel(p.stockStatus)}</span>
        ${waBtn}
      </div>
      <div class="card-body">
        ${p.category ? `<span class="chip">${escapeHtml(p.category)}</span>` : ''}
        <div class="card-name">${escapeHtml(p.name)}</div>
        ${p.brand ? `<div class="card-brand">${escapeHtml(p.brand)}</div>` : ''}
        <div class="card-foot">
          <div>
            <div class="card-unit">${escapeHtml(unitLabel(p.unit) || '—')}</div>
            <div class="card-price">${formatPrice(p.price)}</div>
          </div>
          <span class="arrow" aria-hidden="true">${icon('i-arrow', 14)}</span>
        </div>
      </div>
    </div>`;
};

const render = () => {
  const content = $('content');
  if (!content) return;

  const list = getFiltered();
  const total = state.products.length;

  const rc = $('result-count');
  if (rc) {
    rc.innerHTML = list.length === total
      ? `Showing <strong>${total}</strong> product${total === 1 ? '' : 's'}`
      : `<strong>${list.length}</strong> of <strong>${total}</strong> products`;
  }

  if (!list.length) {
    content.className = 'state-empty';
    content.innerHTML = `
      <div class="empty-icon" aria-hidden="true">${icon('i-search', 40)}</div>
      <div class="empty-h">No products found</div>
      <p class="empty-p">${state.q
        ? `Nothing matches “<strong>${escapeHtml(state.q)}</strong>”. Try a different search term.`
        : 'No products in this category yet.'}</p>
      <button class="btn btn-primary" type="button" onclick="window.clearAllFilters()">View all products</button>`;
    return;
  }

  content.className = '';
  content.innerHTML = `<div class="grid" role="list">${list.map(cardHtml).join('')}</div>`;
  observeReveals();
};


// ==========================================================================
// MODAL (focus trap + focus restore)
// ==========================================================================
let lastFocus = null;

const openModal = (p, trigger) => {
  lastFocus = trigger || document.activeElement;

  $('modal-media').innerHTML = mediaHtml(p.image, p.name, productPlaceholder(p), true);

  const badge = $('modal-badge');
  badge.textContent = stockLabel(p.stockStatus);
  badge.className = 'status ' + stockClass(p.stockStatus);

  const cat = $('modal-cat');
  cat.textContent = p.category || '';
  cat.hidden = !p.category;

  const brand = $('modal-brand');
  brand.textContent = p.brand || '';
  brand.hidden = !p.brand;

  const val = (v) => (v != null && String(v).trim() !== '' ? String(v) : '—');
  setText('modal-name', val(p.name));
  setText('modal-price', formatPrice(p.price));
  setText('modal-unit-tag', unitLabel(p.unit));
  setText('modal-sku', val(p.sku));
  setText('modal-unit', val(p.unit));
  setText('modal-status', stockLabel(p.stockStatus));

  const phone = state.shop.phone;
  const order = $('modal-order-btn');
  order.hidden = !phone;
  if (phone) openLink(order, waLink(phone, orderMessage(p)));

  const call = $('modal-call-btn');
  call.hidden = !phone;
  if (phone) openLink(call, 'tel:' + phone, false);

  $('modal').hidden = false;
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('modal-close')?.focus(), 30);
};

const closeModal = () => {
  const modal = $('modal');
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.style.overflow = '';
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  lastFocus = null;
};

// Keep Tab / Shift+Tab inside the open dialog
const trapFocus = (e) => {
  const modal = $('modal');
  if (e.key !== 'Tab' || !modal || modal.hidden) return;
  const f = [...modal.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.hidden && el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
};


// ==========================================================================
// GLOBAL HELPER (used by the "View all products" button)
// ==========================================================================
window.clearAllFilters = () => {
  state.q = ''; state.sort = 'featured';
  const si = $('search-input'), ss = $('sort-select'), sc = $('search-clear');
  if (si) si.value = '';
  if (ss) ss.value = 'featured';
  if (sc) sc.hidden = true;
  setCategory('');
};


// ==========================================================================
// BOOT
// ==========================================================================
init();
