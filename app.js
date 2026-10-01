let products = [];
let categories = [];
let shopInfo = {};
let activeCategory = '';
let searchTerm = '';
let currencySymbol = 'Rs.';

const escapeHtml = (str) => {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

const formatPrice = (n) => {
  const num = Number(n) || 0;
  return currencySymbol + ' ' + num.toLocaleString('en-LK', {
    minimumFractionDigits: 2, maximumFractionDigits: 2
  });
};

const stockClass = (s) => s === 'out' ? 'out' : s === 'low' ? 'low' : '';
const stockLabel = (s) => s === 'out' ? 'Out of Stock' : s === 'low' ? 'Low Stock' : 'In Stock';

const imageUrl = (p) => {
  if (p.image) return p.image;
  const initial = (p.name || '?').charAt(0).toUpperCase();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#e5e7eb"/>
    <text x="100" y="125" font-family="Inter,sans-serif" font-size="90" font-weight="700" fill="#9ca3af" text-anchor="middle">${initial}</text>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
};

const loadJSON = async (file, fallback = []) => {
  try {
    const res = await fetch(file + '?t=' + Date.now());
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.warn('Failed ' + file, err);
    return fallback;
  }
};

const init = async () => {
  [products, categories, shopInfo] = await Promise.all([
    loadJSON('products.json', []),
    loadJSON('categories.json', []),
    loadJSON('shop-info.json', {})
  ]);

  currencySymbol = shopInfo.currencySymbol || 'Rs.';
  document.title = (shopInfo.shopName || 'Shop') + ' — Products';
  document.getElementById('shop-name').textContent = shopInfo.shopName || 'Our Shop';
  document.getElementById('shop-desc').textContent = shopInfo.description || '';

  const contact = document.getElementById('shop-contact');
  const items = [];
  if (shopInfo.phone)   items.push(`<span>📞 <a href="tel:${escapeHtml(shopInfo.phone)}">${escapeHtml(shopInfo.phone)}</a></span>`);
  if (shopInfo.address) items.push(`<span>📍 ${escapeHtml(shopInfo.address)}</span>`);
  if (shopInfo.email)   items.push(`<span>✉️ <a href="mailto:${escapeHtml(shopInfo.email)}">${escapeHtml(shopInfo.email)}</a></span>`);
  contact.innerHTML = items.join('');

  document.getElementById('footer-info').textContent =
    '© ' + new Date().getFullYear() + ' ' + (shopInfo.shopName || '');

  const catContainer = document.getElementById('categories');
  const all = '<button class="cat-pill active" data-cat="">All Products</button>';
  const pills = categories.map((c) =>
    `<button class="cat-pill" data-cat="${escapeHtml(c.name)}">${escapeHtml(c.name)}</button>`
  ).join('');
  catContainer.innerHTML = all + pills;

  catContainer.querySelectorAll('.cat-pill').forEach((btn) => {
    btn.addEventListener('click', () => {
      catContainer.querySelectorAll('.cat-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.cat || '';
      render();
    });
  });

  document.getElementById('search-input').addEventListener('input', (e) => {
    searchTerm = e.target.value.trim().toLowerCase();
    render();
  });

  render();
};

const render = () => {
  const content = document.getElementById('content');
  let filtered = products;

  if (activeCategory) filtered = filtered.filter(p => p.category === activeCategory);

  if (searchTerm) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(searchTerm) ||
      (p.brand || '').toLowerCase().includes(searchTerm) ||
      (p.sku || '').toLowerCase().includes(searchTerm)
    );
  }

  if (filtered.length === 0) {
    content.className = 'empty';
    content.innerHTML = `<h3>No products found</h3><p>Try a different category or search term.</p>`;
    return;
  }

  content.className = '';
  content.innerHTML = `
    <div class="product-grid">
      ${filtered.map((p) => `
        <div class="product">
          <div class="product-image">
            <img src="${imageUrl(p)}" alt="${escapeHtml(p.name)}" loading="lazy" />
            <span class="stock-badge ${stockClass(p.stockStatus)}">${stockLabel(p.stockStatus)}</span>
          </div>
          <div class="product-body">
            <span class="product-category">${escapeHtml(p.category)}</span>
            <div class="product-name">${escapeHtml(p.name)}</div>
            ${p.brand ? `<div class="product-brand">${escapeHtml(p.brand)}</div>` : ''}
            <div class="product-price">${formatPrice(p.price)}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
};

init();
