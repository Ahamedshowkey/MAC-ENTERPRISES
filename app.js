// ==========================================================================
// PROFESSIONAL SHOP STOREFRONT — APP LOGIC
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
const stockLabel = (s) => s === 'out' ? 'Out of Stock' : s === 'low' ? 'Low Stock' : 'In Stock';

const imageUrl = (p) => {
  if (p.image) return p.image;
  const initial = (p.name || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#eff6ff"/>
        <stop offset="100%" stop-color="#dbeafe"/>
      </linearGradient>
    </defs>
    <rect width="200" height="200" fill="url(#g)"/>
    <text x="100" y="125" font-family="Inter,sans-serif" font-size="90" font-weight="800" fill="#3b82f6" text-anchor="middle">${initial}</text>
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
  `Hello! I'm interested in this product:`,
  ``,
  `*${product.name}*`,
  product.sku ? `SKU: ${product.sku}` : '',
  product.brand ? `Brand: ${product.brand}` : '',
  `Price: ${formatPrice(product.price)}`,
  product.category ? `Category: ${product.category}` : '',
  ``,
  `Please confirm availability. Thank you!`
].filter(Boolean).join('\n');


// ==========================================================================
// INITIAL LOAD
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

  populateBrand();
  populateHero();
  populateContact();
  populateCategories();
  populateFooter();
  wireEvents();

  render();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
};


// ==========================================================================
// POPULATE STATIC CONTENT
// ==========================================================================

const populateBrand = () => {
  const name = shopInfo.shopName || 'Our Shop';
  const tag  = shopInfo.description || '';

  document.title = name + ' — Products';
  document.getElementById('shop-name').textContent = name;
  document.getElementById('shop-tag').textContent = tag;

  const initial = name.trim().charAt(0).toUpperCase() || 'S';
  document.getElementById('brand-mark').textContent = initial;

  document.getElementById('meta-desc').setAttribute('content', tag || name);
  document.getElementById('og-title').setAttribute('content', name);
  document.getElementById('og-desc').setAttribute('content', tag || name);
};

const populateHero = () => {
  const name = shopInfo.shopName || 'Welcome';
  const tag  = shopInfo.description || 'Browse our collection of quality products.';

  document.getElementById('hero-title').textContent = name;
  document.getElementById('hero-sub').textContent   = tag;

  document.getElementById('stat-products').textContent   = products.length;
  document.getElementById('stat-categories').textContent = categories.length;

  const contactBtn = document.getElementById('hero-contact');
  const phone = shopInfo.phone;

  if (phone) {
    contactBtn.href = waLink(phone, 'Hello! I have a question about your products.');
    contactBtn.target = '_blank';
    contactBtn.rel = 'noopener noreferrer';
    document.getElementById('hero-contact-text').textContent = 'Chat on WhatsApp';
  } else {
    contactBtn.hidden = true;
  }
};

const populateContact = () => {
  const phone = shopInfo.phone;

  const headerBtn = document.getElementById('header-wa-btn');
  if (phone) {
    headerBtn.href = waLink(phone, 'Hello! I would like to inquire about your products.');
    headerBtn.target = '_blank';
    headerBtn.rel = 'noopener noreferrer';
  } else {
    headerBtn.hidden = true;
  }

  const fab = document.getElementById('wa-fab');
  if (phone) {
    fab.href = waLink(phone, 'Hello! I would like to inquire about your products.');
    fab.target = '_blank';
    fab.rel = 'noopener noreferrer';
  } else {
    fab.hidden = true;
  }
};

const populateCategories = () => {
  const container = document.getElementById('categories');

  const all = `
    <button class="cat-pill active" data-cat="">
      All Products <span class="cat-count">${products.length}</span>
    </button>
  `;

  const pills = categories.map((c) => `
    <button class="cat-pill" data-cat="${escapeHtml(c.name)}">
      ${escapeHtml(c.name)}
      <span class="cat-count">${c.count || 0}</span>
    </button>
  `).join('');

  container.innerHTML = all + pills;

  container.querySelectorAll('.cat-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat || '';
      render();
      if (window.innerWidth < 700) {
        document.querySelector('.toolbar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

const populateFooter = () => {
  const name = shopInfo.shopName || 'Our Shop';

  document.getElementById('footer-brand').textContent = name;
  document.getElementById('footer-tag').textContent =
    shopInfo.description || 'Quality products, honest prices.';

  const contact = document.getElementById('footer-contact');
  const contactItems = [];
  if (shopInfo.phone) {
    contactItems.push(`
      <a href="tel:${escapeHtml(shopInfo.phone)}">📞 ${escapeHtml(shopInfo.phone)}</a>
    `);
  }
  if (shopInfo.email) {
    contactItems.push(`
      <a href="mailto:${escapeHtml(shopInfo.email)}">✉️ ${escapeHtml(shopInfo.email)}</a>
    `);
  }
  if (shopInfo.address) {
    contactItems.push(`
      <div class="footer-static">📍 ${escapeHtml(shopInfo.address)}</div>
    `);
  }
  contact.innerHTML = contactItems.join('') || '<div class="footer-static">—</div>';

  const catCol = document.getElementById('footer-categories');
  const topCats = categories.slice(0, 6);
  catCol.innerHTML = topCats.map((c) => `
    <a href="#" data-footer-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</a>
  `).join('') || '<div class="footer-static">—</div>';

  catCol.querySelectorAll('[data-footer-cat]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = a.dataset.footerCat;
      const pill = document.querySelector(`.cat-pill[data-cat="${CSS.escape(cat)}"]`);
      if (pill) {
        pill.click();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  });

  const follow = document.getElementById('footer-follow');
  const followItems = [];

  if (shopInfo.websiteUrl) {
    followItems.push(`
      <a href="${escapeHtml(shopInfo.websiteUrl)}" target="_blank" rel="noopener noreferrer">
        🌐 Website
      </a>
    `);
  }
  if (shopInfo.whatsappGroupUrl) {
    followItems.push(`
      <a href="${escapeHtml(shopInfo.whatsappGroupUrl)}" target="_blank" rel="noopener noreferrer">
        👥 WhatsApp Group
      </a>
    `);
  }
  if (shopInfo.phone) {
    followItems.push(`
      <a href="${waLink(shopInfo.phone, 'Hello!')}" target="_blank" rel="noopener noreferrer">
        💬 Chat on WhatsApp
      </a>
    `);
  }
  follow.innerHTML = followItems.join('') || '<div class="footer-static">—</div>';

  const year = new Date().getFullYear();
  document.getElementById('footer-bottom').textContent =
    `© ${year} ${name}. All rights reserved.`;
};


// ==========================================================================
// EVENTS
// ==========================================================================

const wireEvents = () => {
  const searchInput = document.getElementById('search-input');
  const searchClear = document.getElementById('search-clear');

  searchInput.addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    searchClear.hidden = !searchTerm;
    render();
  });

  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchTerm = '';
    searchClear.hidden = true;
    render();
    searchInput.focus();
  });

  document.getElementById('sort-select').addEventListener('change', (e) => {
    sortMode = e.target.value;
    render();
  });

  document.getElementById('hero-cta').addEventListener('click', () => {
    document.querySelector('.container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);

  document.getElementById('modal').addEventListener('click', (e) => {
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
      const hay = [
        p.name || '',
        p.brand || '',
        p.sku || '',
        p.category || ''
      ].join(' ').toLowerCase();
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
  const filtered = getFiltered();

  const total = products.length;
  const shown = filtered.length;
  const rc = document.getElementById('result-count');
  rc.innerHTML = shown === total
    ? `<strong>${total}</strong> product${total === 1 ? '' : 's'}`
    : `<strong>${shown}</strong> of ${total} products`;


  if (filtered.length === 0) {
    content.className = 'empty';
    content.innerHTML = `
      <h3>No products found</h3>
      <p>${searchTerm
        ? `Nothing matches "<strong>${escapeHtml(searchTerm)}</strong>".`
        : 'No products in this category yet.'}</p>
      <button class="empty-btn" onclick="window.clearAllFilters()">Clear filters</button>
    `;
    return;
  }


  content.className = '';
  content.innerHTML = `
    <div class="product-grid">
      ${filtered.map((p) => {
        const waClickable = !!shopInfo.phone;

        return `
          <div class="product" data-id="${escapeHtml(p.id)}">
            <div class="product-image">
              <img src="${imageUrl(p)}" alt="${escapeHtml(p.name)}" loading="lazy" />
              <span class="stock-badge ${stockClass(p.stockStatus)}">
                ${stockLabel(p.stockStatus)}
              </span>
              ${waClickable ? `
                <button class="quick-wa"
                        data-product-id="${escapeHtml(p.id)}"
                        title="Order on WhatsApp"
                        aria-label="Order on WhatsApp">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.5 3.5A11.9 11.9 0 0 0 12 0C5.4 0 0 5.4 0 12c0 2.1.6 4.1 1.6 5.9L0 24l6.3-1.6A11.9 11.9 0 0 0 12 24c6.6 0 12-5.4 12-12 0-3.2-1.2-6.2-3.5-8.5ZM12 21.9c-1.8 0-3.6-.5-5.1-1.4l-.4-.2-3.7 1 1-3.6-.3-.4A9.9 9.9 0 0 1 2.1 12c0-5.5 4.4-9.9 9.9-9.9 2.6 0 5.1 1 7 2.9a9.9 9.9 0 0 1 2.9 7c0 5.5-4.4 9.9-9.9 9.9Zm5.4-7.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.2-.7.1-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-.3-.1-1.2-.5-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.2.2-.3.3-.5.1-.2 0-.4 0-.5-.1-.1-.7-1.6-.9-2.2-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4 0 1.4 1 2.8 1.2 3 .1.2 2 3 4.8 4.2.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3Z"/>
                  </svg>
                </button>
              ` : ''}
            </div>
            <div class="product-body">
              ${p.category ? `<span class="product-cat">${escapeHtml(p.category)}</span>` : ''}
              <div class="product-name">${escapeHtml(p.name)}</div>
              ${p.brand ? `<div class="product-brand">${escapeHtml(p.brand)}</div>` : ''}
              <div class="product-footer">
                <div class="product-price">${formatPrice(p.price)}</div>
                <div class="product-arrow">→</div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;


  content.querySelectorAll('.product').forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.quick-wa')) return;
      const id = card.dataset.id;
      const product = products.find((p) => String(p.id) === String(id));
      if (product) openModal(product);
    });
  });


  content.querySelectorAll('.quick-wa').forEach((btn) => {
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

  const setHidden = (id, hide) => {
    const el = document.getElementById(id);
    if (el) el.hidden = hide;
  };

  const img = document.getElementById('modal-img');
  if (img) {
    img.src = imageUrl(product);
    img.alt = product.name || '';
  }

  const badge = document.getElementById('modal-badge');
  if (badge) {
    badge.textContent = stockLabel(product.stockStatus);
    badge.className = 'modal-badge ' + stockClass(product.stockStatus);
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
  setText('modal-sku',    product.sku);
  setText('modal-unit',   product.unit);
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
  const searchClear = document.getElementById('search-clear');
  const sortSelect = document.getElementById('sort-select');

  if (searchInput) searchInput.value = '';
  if (searchClear) searchClear.hidden = true;
  if (sortSelect) sortSelect.value = 'featured';

  document.querySelectorAll('.cat-pill').forEach((b, i) => {
    b.classList.toggle('active', i === 0);
  });

  render();
};


// ==========================================================================
// BOOT
// ==========================================================================

init();
