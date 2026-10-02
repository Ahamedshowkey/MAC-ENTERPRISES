// ==========================================================================
// EDITORIAL COMMERCE — APP LOGIC (hardened)
// ==========================================================================

let products = [];
let categories = [];
let shopInfo = {};
let activeCategory = '';
let searchTerm = '';
let sortMode = 'featured';
let currencySymbol = 'Rs.';


// ==========================================================================
// DOM SAFETY HELPERS
// ==========================================================================

/** Get element or null */
const $ = (id) => document.getElementById(id);

/** Safely set textContent */
const setText = (id, value) => {
  const el = $(id);
  if (!el) return false;
  el.textContent = value == null ? '' : String(value);
  return true;
};

/** Safely set an attribute */
const setAttr = (id, attr, value) => {
  const el = $(id);
  if (!el) return false;
  el.setAttribute(attr, value);
  return true;
};

/** Safely set innerHTML */
const setHtml = (id, html) => {
  const el = $(id);
  if (!el) return false;
  el.innerHTML = html;
  return true;
};

/** Safely set hidden */
const setHidden = (id, hidden) => {
  const el = $(id);
  if (!el) return false;
  el.hidden = !!hidden;
  return true;
};

/** Safely set href */
const setHref = (id, href) => {
  const el = $(id);
  if (!el) return false;
  el.href = href;
  return true;
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
const stockLabel = (s) => s === 'out' ? 'Out of stock' : s === 'low' ? 'Low stock' : 'In stock';

const imageUrl = (p) => {
  if (p && p.image) return p.image;
  const initial = ((p && p.name) || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="#ebe6df"/>
    <text x="200" y="270" font-family="Georgia,serif" font-style="italic" font-size="180" fill="#a3a3a3" text-anchor="middle">${initial}</text>
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
// WHATSAPP HELPERS
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
  `I'm interested in this item:`,
  ``,
  `${product.name}`,
  product.sku ? `Reference: ${product.sku}` : '',
  product.brand ? `Brand: ${product.brand}` : '',
  `Price: ${formatPrice(product.price)}`,
  ``,
  `Please confirm availability and delivery.`
].filter(Boolean).join('\n');


// ==========================================================================
// SANITY CHECK — warns about missing elements
// ==========================================================================

const REQUIRED_IDS = [
  'ticker-track',
  'shop-name',
  'brand-mark',
  'hero-sub',
  'hero-cta',
  'hero-contact',
  'hero-contact-text',
  'nav-call-link',
  'nav-wa-link',
  'search-toggle',
  'search-overlay',
  'search-input',
  'search-close',
  'sort-select',
  'categories',
  'cat-count-display',
  'products-title-text',
  'products-count-display',
  'content',
  'footer-big',
  'footer-visit',
  'footer-contact',
  'footer-categories',
  'footer-legal',
  'footer-follow',
  'modal',
  'modal-close',
  'modal-img',
  'modal-badge',
  'modal-cat',
  'modal-name',
  'modal-brand',
  'modal-price',
  'modal-sku',
  'modal-unit',
  'modal-status',
  'modal-order-btn',
  'modal-call-btn'
];

const checkDom = () => {
  const missing = REQUIRED_IDS.filter((id) => !document.getElementById(id));
  if (missing.length > 0) {
    console.error(
      '%c⚠️ SHOP PAGE — MISSING ELEMENTS',
      'color:#f43f5e;font-weight:700;font-size:14px'
    );
    console.error(
      'These IDs are in app.js but not in index.html. ' +
      'You likely need to replace index.html with the latest version.'
    );
    console.error('Missing:', missing);
  } else {
    console.log('%c✓ Shop page DOM verified — all elements present.',
      'color:#10b981;font-weight:600');
  }
  return missing;
};


// ==========================================================================
// INIT
// ==========================================================================

const init = async () => {

  // Check HTML structure first
  const missing = checkDom();
  if (missing.length > 0) {
    // Still try to continue in case only optional items are missing
  }

  const [loadedProducts, loadedCategories, loadedShop] = await Promise.all([
    loadJSON('products.json', []),
    loadJSON('categories.json', []),
    loadJSON('shop-info.json', {})
  ]);

  products   = Array.isArray(loadedProducts) ? loadedProducts : [];
  categories = Array.isArray(loadedCategories) ? loadedCategories : [];
  shopInfo   = (loadedShop && typeof loadedShop === 'object') ? loadedShop : {};

  currencySymbol = shopInfo.currencySymbol || 'Rs.';

  // Derive categories from products if empty
  if (categories.length === 0 && products.length > 0) {
    const map = new Map();
    products.forEach((p) => {
      const cat = (p.category || '').trim();
      if (!cat) return;
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    categories = Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
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

  populateTicker();
  populateBrand();
  populateHero();
  populateContact();
  populateCategories();
  populateFooter();
  wireEvents();

  render();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      closeSearch();
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      openSearch();
    }
  });
};


// ==========================================================================
// POPULATE
// ==========================================================================

const populateTicker = () => {
  const items = [
    shopInfo.shopName || 'Our shop',
    'Free delivery on bulk',
    'Trusted by local builders',
    'Order via WhatsApp',
    new Date().getFullYear() + ' collection'
  ];
  const chunk = items.map((t) => `<span class="ticker-item">${escapeHtml(t)}</span>`).join('');
  setHtml('ticker-track', chunk + chunk);
};

const populateBrand = () => {
  const name = shopInfo.shopName || 'Our Shop';
  const tag  = shopInfo.description || '';

  document.title = name + ' — Products';

  setText('shop-name', name);
  setText('brand-mark', name.trim().charAt(0).toUpperCase() || 'S');
  setAttr('meta-desc', 'content', tag || name);
  setAttr('og-title', 'content', name);
};

const populateHero = () => {
  const tag = shopInfo.description || 'Browse our collection of quality products, available for pickup or delivery.';
  setText('hero-sub', tag);

  const phone = shopInfo.phone;
  const contactBtn = $('hero-contact');

  if (phone && contactBtn) {
    contactBtn.href = waLink(phone, 'Hello, I have a question about your products.');
    contactBtn.target = '_blank';
    contactBtn.rel = 'noopener noreferrer';
    setText('hero-contact-text', 'Chat with us');
  } else {
    setHidden('hero-contact', true);
  }
};

const populateContact = () => {
  const phone = shopInfo.phone;

  if (phone) {
    setHref('nav-call-link', 'tel:' + phone);
    setHidden('nav-call-link', false);

    const navWa = $('nav-wa-link');
    if (navWa) {
      navWa.href = waLink(phone, 'Hello, I would like to inquire about your products.');
      navWa.target = '_blank';
      navWa.rel = 'noopener noreferrer';
      navWa.hidden = false;
    }
  }
};

const populateCategories = () => {
  const container = $('categories');
  if (!container) {
    console.warn('Cannot render categories — #categories missing from HTML');
    return;
  }

  setText('cat-count-display', `${categories.length} total`);

  const rows = [];

  rows.push(`
    <div class="cat-row active" data-cat="">
      <div class="cat-num">00</div>
      <div class="cat-name">All products</div>
      <div class="cat-count">${products.length} items</div>
      <div class="cat-arrow">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
          <path d="M7 17 17 7M7 7h10v10"/>
        </svg>
      </div>
    </div>
  `);

  categories.forEach((c, i) => {
    const num = String(i + 1).padStart(2, '0');
    rows.push(`
      <div class="cat-row" data-cat="${escapeHtml(c.name)}">
        <div class="cat-num">${num}</div>
        <div class="cat-name">${escapeHtml(c.name)}</div>
        <div class="cat-count">${c.count} ${c.count === 1 ? 'item' : 'items'}</div>
        <div class="cat-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
            <path d="M7 17 17 7M7 7h10v10"/>
          </svg>
        </div>
      </div>
    `);
  });

  container.innerHTML = rows.join('');

  container.querySelectorAll('.cat-row').forEach((row) => {
    row.addEventListener('click', () => {
      container.querySelectorAll('.cat-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');

      activeCategory = row.dataset.cat || '';

      setText('products-title-text', activeCategory || 'Selected Products');

      render();

      if (window.innerWidth < 900) {
        document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

const populateFooter = () => {
  const name = shopInfo.shopName || 'Our Shop';
  setText('footer-big', name);

  // Visit
  const visitItems = [];
  if (shopInfo.address) visitItems.push(`<div class="static">${escapeHtml(shopInfo.address)}</div>`);
  if (shopInfo.email)   visitItems.push(`<a href="mailto:${escapeHtml(shopInfo.email)}">${escapeHtml(shopInfo.email)}</a>`);
  setHtml('footer-visit', visitItems.join('') || '<div class="static">—</div>');

  // Contact
  const contactItems = [];
  if (shopInfo.phone) {
    contactItems.push(`<a href="tel:${escapeHtml(shopInfo.phone)}">${escapeHtml(shopInfo.phone)}</a>`);
    contactItems.push(`<a href="${waLink(shopInfo.phone, 'Hello!')}" target="_blank" rel="noopener noreferrer">WhatsApp chat</a>`);
  }
  setHtml('footer-contact', contactItems.join('') || '<div class="static">—</div>');

  // Categories
  const topCats = categories.slice(0, 5);
  const catHtml = topCats.map((c) => `
    <a href="#" data-footer-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</a>
  `).join('') || '<div class="static">—</div>';
  setHtml('footer-categories', catHtml);

  const catCol = $('footer-categories');
  if (catCol) {
    catCol.querySelectorAll('[data-footer-cat]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const cat = a.dataset.footerCat;
        const targetRow = document.querySelector(`.cat-row[data-cat="${CSS.escape(cat)}"]`);
        if (targetRow) {
          targetRow.click();
          document.querySelector('.categories')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Legal
  const year = new Date().getFullYear();
  setText('footer-legal', `© ${year} ${name} — All rights reserved`);

  // Follow
  const followItems = [];
  if (shopInfo.websiteUrl) {
    followItems.push(`<a href="${escapeHtml(shopInfo.websiteUrl)}" target="_blank" rel="noopener noreferrer">Website</a>`);
  }
  if (shopInfo.whatsappGroupUrl) {
    followItems.push(`<a href="${escapeHtml(shopInfo.whatsappGroupUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp Group</a>`);
  }
  setHtml('footer-follow', followItems.join(''));
};


// ==========================================================================
// EVENTS
// ==========================================================================

const wireEvents = () => {
  $('search-toggle')?.addEventListener('click', openSearch);
  $('search-close')?.addEventListener('click', closeSearch);

  $('search-input')?.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
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

const openSearch = () => {
  const overlay = $('search-overlay');
  const input = $('search-input');
  if (!overlay) return;
  overlay.hidden = false;
  setTimeout(() => input?.focus(), 50);
};

const closeSearch = () => {
  const overlay = $('search-overlay');
  const input = $('search-input');
  if (!overlay) return;
  overlay.hidden = true;
  if (input && input.value) {
    input.value = '';
    searchTerm = '';
    render();
  }
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
  if (!content) {
    console.warn('Cannot render — #content missing from HTML');
    return;
  }

  const filtered = getFiltered();
  setText('products-count-display', `(${filtered.length})`);

  if (filtered.length === 0) {
    content.className = 'state-empty';
    content.innerHTML = `
      <div class="empty-eyebrow">Nothing here yet</div>
      <div class="empty-h">No products match.</div>
      <div class="empty-p">${searchTerm
        ? `We couldn't find anything for "<em>${escapeHtml(searchTerm)}</em>". Try a different term or browse all products.`
        : 'This category is currently empty.'}</div>
      <button class="empty-btn" onclick="window.clearAllFilters()">
        View all products
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <path d="M7 17 17 7M7 7h10v10"/>
        </svg>
      </button>
    `;
    return;
  }

  content.className = '';
  content.innerHTML = `
    <div class="p-grid">
      ${filtered.map((p) => {
        const waClickable = !!shopInfo.phone;
        return `
          <div class="p-card" data-id="${escapeHtml(p.id)}">
            <div class="p-img">
              <img src="${imageUrl(p)}" alt="${escapeHtml(p.name)}" loading="lazy" />
              <span class="p-badge ${stockClass(p.stockStatus)}">
                ${stockLabel(p.stockStatus)}
              </span>
              ${waClickable ? `
                <button class="p-wa"
                        data-product-id="${escapeHtml(p.id)}"
                        title="Order on WhatsApp"
                        aria-label="Order on WhatsApp">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.1 1.6 5.9L0 24l6.3-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5ZM12 21.9c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.3-.4A9.9 9.9 0 0 1 2.1 12c0-5.5 4.4-9.9 9.9-9.9 2.6 0 5.1 1 7 2.9a9.9 9.9 0 0 1 2.9 7c0 5.5-4.4 9.9-9.9 9.9Zm5.4-7.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3Z"/>
                  </svg>
                </button>
              ` : ''}
            </div>
            <div class="p-info">
              ${p.category ? `<div class="p-cat">${escapeHtml(p.category)}</div>` : ''}
              <div class="p-name">${escapeHtml(p.name)}</div>
              <div class="p-meta">
                <div class="p-price">${formatPrice(p.price)}</div>
                ${p.brand ? `<div class="p-brand">${escapeHtml(p.brand)}</div>` : ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  content.querySelectorAll('.p-card').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.p-wa')) return;
      const id = card.dataset.id;
      const product = products.find((p) => String(p.id) === String(id));
      if (product) openModal(product);
    });
  });

  content.querySelectorAll('.p-wa').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.productId;
      const product = products.find((p) => String(p.id) === String(id));
      if (product && shopInfo.phone) {
        window.open(waLink(shopInfo.phone, orderMessage(product)), '_blank', 'noopener,noreferrer');
      }
    });
  });
};


// ==========================================================================
// MODAL
// ==========================================================================

const openModal = (product) => {

  const setVal = (id, value) => {
    const el = $(id);
    if (!el) return;
    const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
    el.textContent = hasValue ? String(value) : '—';
  };

  const img = $('modal-img');
  if (img) {
    img.src = imageUrl(product);
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

  const searchInput = $('search-input');
  const sortSelect = $('sort-select');

  if (searchInput) searchInput.value = '';
  if (sortSelect) sortSelect.value = 'featured';

  document.querySelectorAll('.cat-row').forEach((r, i) => {
    r.classList.toggle('active', i === 0);
  });

  setText('products-title-text', 'Selected Products');

  render();
};


// ==========================================================================
// BOOT
// ==========================================================================

init();
