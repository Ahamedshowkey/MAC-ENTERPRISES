// ==========================================================================
// EDITORIAL COMMERCE — APP LOGIC
// ==========================================================================

let products = [];
let categories = [];
let shopInfo = {};
let activeCategory = '';
let searchTerm = '';
let sortMode = 'featured';
let currencySymbol = 'Rs.';


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
  if (p.image) return p.image;
  const initial = (p.name || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="#ebe6df"/>
    <text x="200" y="270" font-family="Instrument Serif,Georgia,serif" font-style="italic" font-size="180" fill="#a3a3a3" text-anchor="middle">${initial}</text>
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
// INIT
// ==========================================================================

const init = async () => {

  const [loadedProducts, loadedCategories, loadedShop] = await Promise.all([
    loadJSON('products.json', []),
    loadJSON('categories.json', []),
    loadJSON('shop-info.json', {})
  ]);

  products   = Array.isArray(loadedProducts) ? loadedProducts : [];
  categories = Array.isArray(loadedCategories) ? loadedCategories : [];
  shopInfo   = (loadedShop && typeof loadedShop === 'object') ? loadedShop : {};

  currencySymbol = shopInfo.currencySymbol || 'Rs.';

  // If no categories.json, derive from products
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
  const track = document.getElementById('ticker-track');
  if (!track) return;

  const items = [
    shopInfo.shopName || 'Our shop',
    'Free delivery on bulk',
    'Trusted by local builders',
    'Order via WhatsApp',
    new Date().getFullYear() + ' collection'
  ];

  const chunk = items.map((t) => `<span class="ticker-item">${escapeHtml(t)}</span>`).join('');
  track.innerHTML = chunk + chunk;
};

const populateBrand = () => {
  const name = shopInfo.shopName || 'Our Shop';
  const tag  = shopInfo.description || '';

  document.title = name + ' — Products';
  document.getElementById('shop-name').textContent = name;

  const initial = name.trim().charAt(0).toUpperCase() || 'S';
  document.getElementById('brand-mark').textContent = initial;

  const meta = document.getElementById('meta-desc');
  if (meta) meta.setAttribute('content', tag || name);
};

const populateHero = () => {
  const tag = shopInfo.description || 'Browse our collection of quality products, available for pickup or delivery.';
  document.getElementById('hero-sub').textContent = tag;

  const phone = shopInfo.phone;
  const contactBtn = document.getElementById('hero-contact');
  const ctaText = document.getElementById('hero-contact-text');

  if (phone) {
    contactBtn.href = waLink(phone, 'Hello, I have a question about your products.');
    contactBtn.target = '_blank';
    contactBtn.rel = 'noopener noreferrer';
  } else {
    contactBtn.hidden = true;
  }
};

const populateContact = () => {
  const phone = shopInfo.phone;

  const navCall = document.getElementById('nav-call-link');
  const navWa = document.getElementById('nav-wa-link');

  if (phone) {
    navCall.href = 'tel:' + phone;
    navCall.hidden = false;

    navWa.href = waLink(phone, 'Hello, I would like to inquire about your products.');
    navWa.target = '_blank';
    navWa.rel = 'noopener noreferrer';
    navWa.hidden = false;
  }
};

const populateCategories = () => {
  const container = document.getElementById('categories');
  const catCountEl = document.getElementById('cat-count-display');

  if (catCountEl) {
    catCountEl.textContent = `${categories.length} total`;
  }

  const rows = [];

  // "All" row
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

  // Category rows
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

      const titleEl = document.getElementById('products-title-text');
      if (titleEl) {
        titleEl.textContent = activeCategory || 'Selected Products';
      }

      render();

      if (window.innerWidth < 900) {
        document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

const populateFooter = () => {
  const name = shopInfo.shopName || 'Our Shop';
  document.getElementById('footer-big').textContent = name;

  // Visit
  const visit = document.getElementById('footer-visit');
  const visitItems = [];
  if (shopInfo.address) {
    visitItems.push(`<div class="static">${escapeHtml(shopInfo.address)}</div>`);
  }
  if (shopInfo.email) {
    visitItems.push(`<a href="mailto:${escapeHtml(shopInfo.email)}">${escapeHtml(shopInfo.email)}</a>`);
  }
  visit.innerHTML = visitItems.join('') || '<div class="static">—</div>';

  // Contact
  const contact = document.getElementById('footer-contact');
  const contactItems = [];
  if (shopInfo.phone) {
    contactItems.push(`<a href="tel:${escapeHtml(shopInfo.phone)}">${escapeHtml(shopInfo.phone)}</a>`);
    contactItems.push(`<a href="${waLink(shopInfo.phone, 'Hello!')}" target="_blank" rel="noopener noreferrer">WhatsApp chat</a>`);
  }
  contact.innerHTML = contactItems.join('') || '<div class="static">—</div>';

  // Categories
  const catCol = document.getElementById('footer-categories');
  const topCats = categories.slice(0, 5);
  catCol.innerHTML = topCats.map((c) => `
    <a href="#" data-footer-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</a>
  `).join('') || '<div class="static">—</div>';

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

  // Legal
  const year = new Date().getFullYear();
  document.getElementById('footer-legal').textContent =
    `© ${year} ${name} — All rights reserved`;

  // Follow
  const follow = document.getElementById('footer-follow');
  const followItems = [];
  if (shopInfo.websiteUrl) {
    followItems.push(`<a href="${escapeHtml(shopInfo.websiteUrl)}" target="_blank" rel="noopener noreferrer">Website</a>`);
  }
  if (shopInfo.whatsappGroupUrl) {
    followItems.push(`<a href="${escapeHtml(shopInfo.whatsappGroupUrl)}" target="_blank" rel="noopener noreferrer">WhatsApp Group</a>`);
  }
  follow.innerHTML = followItems.join('');
};


// ==========================================================================
// EVENTS
// ==========================================================================

const wireEvents = () => {
  const searchToggle = document.getElementById('search-toggle');
  const searchOverlay = document.getElementById('search-overlay');
  const searchInput = document.getElementById('search-input');
  const searchClose = document.getElementById('search-close');

  searchToggle?.addEventListener('click', openSearch);
  searchClose?.addEventListener('click', closeSearch);

  searchInput?.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
  });

  document.getElementById('hero-cta').addEventListener('click', () => {
    document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('modal').addEventListener('click', (e) => {
    if (e.target.id === 'modal') closeModal();
  });
};

const openSearch = () => {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
  if (!overlay) return;
  overlay.hidden = false;
  setTimeout(() => input?.focus(), 50);
};

const closeSearch = () => {
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('search-input');
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
    case 'price-asc':
      list.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
      break;
    case 'price-desc':
      list.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
      break;
    case 'name-asc':
      list.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      break;
    default:
      break;
  }

  return list;
};


// ==========================================================================
// RENDER
// ==========================================================================

const render = () => {

  const content = document.getElementById('content');
  const countDisplay = document.getElementById('products-count-display');
  const filtered = getFiltered();

  if (countDisplay) {
    countDisplay.textContent = `(${filtered.length})`;
  }

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

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (!el) return;
    const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
    el.textContent = hasValue ? String(value) : '—';
  };

  const img = document.getElementById('modal-img');
  if (img) {
    img.src = imageUrl(product);
    img.alt = product.name || '';
  }

  const badge = document.getElementById('modal-badge');
  if (badge) {
    badge.textContent = stockLabel(product.stockStatus);
    badge.className = 'modal-status ' + stockClass(product.stockStatus);
  }

  const cat = document.getElementById('modal-cat');
  if (cat) {
    const hasCat = !!(product.category && String(product.category).trim());
    cat.textContent = hasCat ? product.category : '';
    cat.hidden = !hasCat;
  }

  setText('modal-name', product.name);

  const brandEl = document.getElementById('modal-brand');
  if (brandEl) {
    const hasBrand = !!(product.brand && String(product.brand).trim());
    brandEl.textContent = hasBrand ? product.brand : '';
    brandEl.hidden = !hasBrand;
  }

  setText('modal-price', formatPrice(product.price));
  setText('modal-sku', product.sku);
  setText('modal-unit', product.unit);
  setText('modal-status', stockLabel(product.stockStatus));

  const orderBtn = document.getElementById('modal-order-btn');
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

  const callBtn = document.getElementById('modal-call-btn');
  if (callBtn) {
    if (shopInfo.phone) {
      callBtn.href = 'tel:' + shopInfo.phone;
      callBtn.hidden = false;
    } else {
      callBtn.hidden = true;
    }
  }

  const modal = document.getElementById('modal');
  if (modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }
};

const closeModal = () => {
  const modal = document.getElementById('modal');
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

  const searchInput = document.getElementById('search-input');
  const sortSelect = document.getElementById('sort-select');

  if (searchInput) searchInput.value = '';
  if (sortSelect) sortSelect.value = 'featured';

  document.querySelectorAll('.cat-row').forEach((r, i) => {
    r.classList.toggle('active', i === 0);
  });

  const titleEl = document.getElementById('products-title-text');
  if (titleEl) titleEl.textContent = 'Selected Products';

  render();
};


// ==========================================================================
// BOOT
// ==========================================================================

init();
