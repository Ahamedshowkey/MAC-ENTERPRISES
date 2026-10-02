// ==========================================================================
// HARDWARE SHOP — APP LOGIC
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
// TOAST
// ==========================================================================

const showToast = (message, icon = 'ℹ️', duration = 3000) => {
  const wrap = $('toast-wrap');
  if (!wrap) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
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

const imageUrl = (p) => {
  if (p && p.image) return p.image;
  const initial = ((p && p.name) || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
    <rect width="400" height="300" fill="#f4f4f5"/>
    <rect x="40" y="40" width="320" height="220" fill="none" stroke="#d4d4d8" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="200" y="175" font-family="Archivo,sans-serif" font-size="90" font-weight="900" fill="#ea580c" text-anchor="middle">${initial}</text>
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

  const [loadedProducts, loadedCategories, loadedShop] = await Promise.all([
    loadJSON('products.json', []),
    loadJSON('categories.json', []),
    loadJSON('shop-info.json', {})
  ]);

  products   = Array.isArray(loadedProducts) ? loadedProducts : [];
  categories = Array.isArray(loadedCategories) ? loadedCategories : [];
  shopInfo   = (loadedShop && typeof loadedShop === 'object') ? loadedShop : {};

  currencySymbol = shopInfo.currencySymbol || 'Rs.';

  // Derive categories if empty
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
  populateCategoryBar();
  populateFooter();
  wireEvents();
  wireMainMenu();

  render();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
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
  const duration = 900;
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
    <button class="cat-tab active" data-cat="">
      All Products
      <span class="cat-tab-count">${products.length}</span>
    </button>
  `;

  const tabs = categories.map((c) => `
    <button class="cat-tab" data-cat="${escapeHtml(c.name)}">
      ${escapeHtml(c.name)}
      <span class="cat-tab-count">${c.count}</span>
    </button>
  `).join('');

  bar.innerHTML = allTab + tabs;

  bar.querySelectorAll('.cat-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      bar.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat || '';
      render();
      if (window.innerWidth < 900) {
        document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

const populateFooter = () => {
  const name = shopInfo.shopName || 'Hardware Shop';
  setText('footer-name', name);
  setText('footer-tagline', shopInfo.description || '');

  // Visit
  const visit = $('footer-visit');
  if (visit) {
    const items = [];
    if (shopInfo.address) items.push(`<div class="static">${escapeHtml(shopInfo.address)}</div>`);
    if (shopInfo.phone)   items.push(`<a href="tel:${escapeHtml(shopInfo.phone)}">${escapeHtml(shopInfo.phone)}</a>`);
    visit.innerHTML = items.join('') || '<div class="static">—</div>';
  }

  // Contact
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

  // Popular categories
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

  // Follow
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
// MAIN MENU WIRING
// ==========================================================================

const wireMainMenu = () => {

  const menuItems = document.querySelectorAll('.menu-item');

  buildDepartmentsPanel();
  buildBrandsPanel();

  menuItems.forEach((item) => {

    // Dropdown toggle
    if (item.classList.contains('menu-dropdown')) {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = item.classList.contains('open');
        document.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
      return;
    }

    // Regular links
    item.addEventListener('click', (e) => {
      e.preventDefault();
      handleMenuAction(item.dataset.action);
    });
  });

  // Close on outside click
  document.addEventListener('click', () => {
    document.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
  });

  // Prevent clicks inside panel from closing
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
    <div class="menu-panel-item" data-cat="${escapeHtml(c.name)}">
      <span>${escapeHtml(c.name)}</span>
      <span class="menu-panel-item-count">${c.count}</span>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="menu-panel-head">All Departments</div>
    ${items}
  `;

  panel.querySelectorAll('.menu-panel-item').forEach((el) => {
    el.addEventListener('click', () => {
      const cat = el.dataset.cat;
      const targetTab = document.querySelector(`.cat-tab[data-cat="${CSS.escape(cat)}"]`);
      if (targetTab) targetTab.click();
      document.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
    });
  });
};

const buildBrandsPanel = () => {
  const panel = $('brands-panel');
  if (!panel) return;

  const brandMap = new Map();
  products.forEach((p) => {
    const b = (p.brand || '').trim();
    if (!b) return;
    brandMap.set(b, (brandMap.get(b) || 0) + 1);
  });

  const brands = Array.from(brandMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  if (brands.length === 0) {
    panel.innerHTML = `
      <div class="menu-panel-head">Shop by Brands</div>
      <div class="menu-panel-empty">No brands listed yet</div>
    `;
    return;
  }

  const items = brands.map((b) => `
    <div class="menu-panel-item" data-brand="${escapeHtml(b.name)}">
      <span>${escapeHtml(b.name)}</span>
      <span class="menu-panel-item-count">${b.count}</span>
    </div>
  `).join('');

  panel.innerHTML = `
    <div class="menu-panel-head">Shop by Brands</div>
    ${items}
  `;

  panel.querySelectorAll('.menu-panel-item').forEach((el) => {
    el.addEventListener('click', () => {
      const brand = el.dataset.brand;
      const searchInput = $('search-input');
      if (searchInput) {
        searchInput.value = brand;
        searchTerm = brand.toLowerCase();
        render();
      }
      document.querySelectorAll('.menu-dropdown').forEach((d) => d.classList.remove('open'));
      document.querySelector('.products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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

    case 'diy':
      showToast('DIY advice section coming soon', '🛠️');
      break;

    case 'about':
      showToast('About us page coming soon', '📖');
      break;

    case 'services':
      showToast('Services page coming soon', '⚙️');
      break;

    case 'contact':
      document.querySelector('.footer')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;

    case 'blogs':
      showToast('Blog coming soon', '📝');
      break;

    default:
      break;
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
      <div class="empty-icon">🔍</div>
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
    <div class="grid">
      ${filtered.map((p) => {
        const waClickable = !!shopInfo.phone;
        return `
          <div class="card" data-id="${escapeHtml(p.id)}">
            <div class="card-img">
              <img src="${imageUrl(p)}" alt="${escapeHtml(p.name)}" loading="lazy" />
              <span class="card-badge ${stockClass(p.stockStatus)}">${stockLabel(p.stockStatus)}</span>
              ${waClickable ? `
                <button class="card-wa"
                        data-product-id="${escapeHtml(p.id)}"
                        aria-label="Order on WhatsApp">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
                <div class="card-arrow">
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
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-wa')) return;
      const id = card.dataset.id;
      const product = products.find((p) => String(p.id) === String(id));
      if (product) openModal(product);
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
    b.classList.toggle('active', i === 0);
  });

  render();
};


// ==========================================================================
// BOOT
// ==========================================================================

init();
