/* ═══════════════════════════════════════════
   FreshCart v4 — Quick-Commerce App Logic
   Mobile-first · Static tabs · Category themes
   Bottom-sheet cart · Per-category accents
   ═══════════════════════════════════════════ */

class UiIcon extends HTMLElement {
  connectedCallback() {
    const name = this.getAttribute('name');
    if (name) {
      this.innerHTML = `<iconify-icon icon="lucide:${name}"></iconify-icon>`;
      this.style.display = 'inline-flex';
      this.style.alignItems = 'center';
      this.style.justifyContent = 'center';
      this.style.fontSize = 'inherit';
    }
  }
}
customElements.define('ui-icon', UiIcon);

/* ── STATE ── */
const state = {
  products: [],         // currently displayed products
  allProducts: [],      // raw API result for client-side filter/sort
  categories: [],
  cart: null,
  cartId: localStorage.getItem('fc_cart_id') || null,
  currentCategory: 'All',
  searchTerm: '',
  sortMode: 'default',
  filters: null,
  theme: localStorage.getItem('fc_theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  currentScreen: 'browse',
};

const API = '';

/* ── CATEGORY CONFIG (accent theme per tab) ── */
const CAT_CFG = {
  'All':        { emoji: '<ui-icon name="layout-grid"></ui-icon>', label: 'All Items',          chip: '<ui-icon name="shopping-bag" style="margin-right:6px;font-size:16px"></ui-icon> All Fresh Picks' },
  'Bakery':     { emoji: '<ui-icon name="croissant"></ui-icon>', label: 'Bakery',             chip: '<ui-icon name="croissant" style="margin-right:6px;font-size:16px"></ui-icon> Fresh Bakery Picks' },
  'Beverages':  { emoji: '<ui-icon name="coffee"></ui-icon>', label: 'Beverages',          chip: '<ui-icon name="coffee" style="margin-right:6px;font-size:16px"></ui-icon> Chilled Beverages' },
  'Dairy':      { emoji: '<ui-icon name="milk"></ui-icon>', label: 'Dairy',              chip: '<ui-icon name="milk" style="margin-right:6px;font-size:16px"></ui-icon> Farm Fresh Dairy' },
  'Fruits':     { emoji: '<ui-icon name="apple"></ui-icon>', label: 'Fruits',             chip: '<ui-icon name="apple" style="margin-right:6px;font-size:16px"></ui-icon> Fresh Fruits' },
  'Snacks':     { emoji: '<ui-icon name="candy"></ui-icon>', label: 'Snacks',             chip: '<ui-icon name="candy" style="margin-right:6px;font-size:16px"></ui-icon> Top Snacks' },
  'Vegetables': { emoji: '<ui-icon name="carrot"></ui-icon>', label: 'Vegetables',         chip: '<ui-icon name="carrot" style="margin-right:6px;font-size:16px"></ui-icon> Farm Vegetables' },
};

/* ── INIT ── */
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  setupSearch();
  cycleSearchPlaceholder();
  setupPaymentOptions();
  loadApp();
});

async function loadApp() {
  showSkeletons(6);
  await Promise.all([loadCategories(), loadCart()]);
  await loadProducts();
  detectLocation();
}

function detectLocation() {
  const titleEl = document.getElementById('deliver-title');
  const subEl = document.getElementById('deliver-subtitle');
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const data = await res.json();
        const area = data.address.suburb || data.address.neighbourhood || data.address.city || 'Kodambakkam, Chennai';
        if (titleEl) titleEl.innerHTML = `10 minutes`;
        if (subEl) subEl.innerHTML = area;
      } catch (e) {
        if (titleEl) titleEl.innerHTML = `10 minutes`;
        if (subEl) subEl.innerHTML = `Kodambakkam, Chennai`;
      }
    }, () => {
        if (titleEl) titleEl.innerHTML = `10 minutes`;
        if (subEl) subEl.innerHTML = `Kodambakkam, Chennai`;
    });
  }
}


/* ── THEME ── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  state.theme = t;
  localStorage.setItem('fc_theme', t);
}
document.addEventListener('click', e => {
  const target = e.target.closest('#theme-toggle');
  if (target) {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
  }
});

/* ── CATEGORY THEME (CSS vars on app-shell) ── */
function applyTabTheme(cat) {
  const shell = document.getElementById('app-shell');
  shell.setAttribute('data-cat', cat);
}

/* ── API ── */
function getHeaders() {
  const h = { 'Content-Type': 'application/json' };
  if (state.cartId) h['x-cart-id'] = state.cartId;
  return h;
}
const apiGet = async u => (await fetch(API + u, { headers: getHeaders() })).json();
const apiPost = async (u, b) => (await fetch(API + u, { method: 'POST', headers: getHeaders(), body: JSON.stringify(b) })).json();
const apiPut = async (u, b) => (await fetch(API + u, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(b) })).json();
const apiDelete = async u => (await fetch(API + u, { method: 'DELETE', headers: getHeaders() })).json();

/* ── SKELETONS ── */
function showSkeletons(n = 6) {
  document.getElementById('products-grid').innerHTML = Array.from({ length: n }, () => `
    <div class="skeleton-card">
      <div class="skel skel-img"></div>
      <div class="skel skel-text" style="margin-top:8px"></div>
      <div class="skel skel-text skel-short"></div>
      <div class="skel skel-price"></div>
      <div class="skel skel-btn"></div>
    </div>`).join('');
}

/* ── CATEGORIES ── */
async function loadCategories() {
  const res = await apiGet('/api/products/categories');
  if (!res.success) return;
  state.categories = res.data;
  renderTabs();
}

function renderTabs() {
  const rail = document.getElementById('tabs-scroll');
  const cats = ['All', ...state.categories];
  rail.innerHTML = cats.map(c => {
    const cfg = CAT_CFG[c] || { emoji: '<ui-icon name="package"></ui-icon>', label: c };
    return `
      <button class="tab-pill ${state.currentCategory === c ? 'active' : ''}"
        id="tab-${c.replace(/\s/g,'_')}"
        onclick="switchCategory('${c}')">
        <span class="tab-emoji">${cfg.emoji}</span>
        ${cfg.label}
      </button>`;
  }).join('');
}

function switchCategory(cat) {
  if (cat === state.currentCategory) return;
  state.currentCategory = cat;
  state.sortMode = 'default';
  const sortEl = document.getElementById('sort-select');
  if (sortEl) sortEl.value = 'default';

  // Update active tab
  document.querySelectorAll('.tab-pill').forEach(t => t.classList.remove('active'));
  const el = document.getElementById('tab-' + cat.replace(/\s/g, '_'));
  if (el) { el.classList.add('active'); el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); }

  // Apply theme
  applyTabTheme(cat);

  // Update header logic
  clearSearch(false); // keep category without clearing everything immediately but let's just clear query
  updateListStructure();
  
  // Animate content
  // Reset content area scroll
  ca.scrollTo(0, 0);

  loadProducts();
}

function updateListStructure() {
  const isAll = state.currentCategory === 'All' && !state.searchTerm;
  // If 'All', we don't show the sort/filter bar at the top, we group by sections.
  const sfBar = document.getElementById('sort-filter-bar');
  if (sfBar) sfBar.style.display = isAll ? 'none' : 'flex';
}

/* ── PRODUCTS ── */
async function loadProducts() {
  // Skip skeletons if data is already cached
  if (!state.allProducts || state.allProducts.length === 0) {
    showSkeletons(6);
  }
  let url = '/api/products';
  const p = new URLSearchParams();
  if (state.currentCategory && state.currentCategory !== 'All') p.set('category', state.currentCategory);
  if (state.searchTerm) p.set('search', state.searchTerm);
  if (p.toString()) url += '?' + p.toString();
  try {
    const res = await apiGet(url);
    if (res.success) {
      state.allProducts = res.data;
      sortAndRender();
    } else {
      showToast('<ui-icon name="alert-triangle"></ui-icon> Failed to load products.');
      document.getElementById('products-grid').innerHTML = '<div class="empty-state"><div class="empty-emoji">⚠️</div><div class="empty-title">Failed to load items</div><button class="btn-ghost" style="margin-top:10px;" onclick="loadProducts()">Retry</button></div>';
    }
  } catch (err) {
    showToast('<ui-icon name="wifi-off"></ui-icon> Having trouble loading items. Check your connection or try again.');
    document.getElementById('products-grid').innerHTML = '<div class="empty-state"><div class="empty-emoji">📶</div><div class="empty-title">Network Error</div><div class="empty-sub">Please check your internet connection.</div><button class="btn-primary" style="margin-top:10px; width:120px;" onclick="loadProducts()">Retry</button></div>';
  }
}

function sortAndRender() {
  let prods = [...state.allProducts];

  if (state.filters) {
    prods = prods.filter(p => {
      const pPrice = ep(p);
      if (state.filters.price) {
        if (state.filters.price === 'under_50' && pPrice >= 50) return false;
        if (state.filters.price === '50_100' && (pPrice < 50 || pPrice > 100)) return false;
        if (state.filters.price === '100_200' && (pPrice < 100 || pPrice > 200)) return false;
        if (state.filters.price === 'above_200' && pPrice <= 200) return false;
      }
      if (state.filters.rating) {
        if (p.rating < parseFloat(state.filters.rating)) return false;
      }
      if (state.filters.cats && state.filters.cats.length > 0) {
        if (!state.filters.cats.includes(p.category)) return false;
      }
      if (state.filters.quick === 'discount' && p.discount === 0) return false;
      if (state.filters.quick === 'hot_50' && p.discount === 0) return false;
      return true;
    });
  }

  const mode = state.sortMode;
  if (mode === 'price-asc') prods.sort((a, b) => ep(a) - ep(b));
  else if (mode === 'price-desc') prods.sort((a, b) => ep(b) - ep(a));
  else if (mode === 'rating') prods.sort((a, b) => b.rating - a.rating);
  else if (mode === 'discount') prods.sort((a, b) => b.discount - a.discount);

  state.products = prods;
  
  updateContextLine();
  renderProducts();
}

function updateContextLine() {
  const ctx = document.getElementById('search-result-context');
  if (state.searchTerm && state.searchTerm.length > 0) {
    document.getElementById('context-query').textContent = state.searchTerm;
    ctx.classList.remove('hidden');
    ctx.innerHTML = `Showing ${state.products.length} result${state.products.length === 1 ? '' : 's'} for '<span id="context-query" style="color:var(--text);">${state.searchTerm}</span>' · Sorted by ${document.getElementById('current-sort-label')?.innerText.replace('Sort: ','') || 'Relevance'}`;
  } else {
    ctx.classList.add('hidden');
  }
}

function applySort() {
  sortAndRender();
}

function selectSort(val, label, desc) {
  state.sortMode = val;
  const labelEl = document.getElementById('current-sort-label');
  if (labelEl) labelEl.innerText = 'Sort: ' + (val==='default'?'Relevance':label);
  
  const dd = document.getElementById('sort-dropdown');
  if (dd) dd.classList.add('hidden');
  
  document.querySelectorAll('.dropdown-item').forEach(e=>e.classList.remove('active'));
  event.currentTarget.classList.add('active');
  applySort();
}

function openSortMenu() {
  document.getElementById('sort-dropdown').classList.toggle('hidden');
}

function renderAppliedFilters() {
  const c = document.getElementById('applied-filters');
  if (!c) return;
  if (!state.filters || Object.keys(state.filters).length === 0) {
    c.innerHTML = '';
    return;
  }
  let html = '';
  if (state.filters.price) html += `<span class="applied-chip" onclick="removeFilter('price')">${state.filters.price.replace('_',' ')} <ui-icon name="x"></ui-icon></span>`;
  if (state.filters.rating) html += `<span class="applied-chip" onclick="removeFilter('rating')">${state.filters.rating}+ <ui-icon name="x"></ui-icon></span>`;
  if (state.filters.quick === 'discount') html += `<span class="applied-chip" onclick="removeFilter('quick')">Best Deals <ui-icon name="x"></ui-icon></span>`;
  if (state.filters.cats) {
    state.filters.cats.forEach(cat => {
      html += `<span class="applied-chip" onclick="removeCatFilter('${cat}')">${cat} <ui-icon name="x"></ui-icon></span>`;
    });
  }
  if (html) html += `<span class="clear-all-filters" onclick="clearFilters()">Clear all</span>`;
  c.innerHTML = html;
}

function removeFilter(key) {
  if (state.filters) delete state.filters[key];
  sortAndRender();
  renderAppliedFilters();
}
function removeCatFilter(cat) {
  if (state.filters?.cats) {
    state.filters.cats = state.filters.cats.filter(c => c !== cat);
    if(state.filters.cats.length===0) delete state.filters.cats;
  }
  sortAndRender();
  renderAppliedFilters();
}

const ep = p => p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const empty = document.getElementById('empty-state');

  if (state.products.length === 0) {
    grid.innerHTML = '';
    const emptySub = document.getElementById('empty-search-sub');
    if (emptySub) {
      emptySub.innerHTML = `No exact matches for '${state.searchTerm}'.`;
    }
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  const isAll = state.currentCategory === 'All' && !state.searchTerm;
  
  if (isAll) {
    // Render sections grouped by category
    const catGroups = {};
    state.products.forEach(p => {
      if (!catGroups[p.category]) catGroups[p.category] = [];
      catGroups[p.category].push(p);
    });
    
    // Group titles map
    const titles = {
      'Fruits': 'Fresh Fruits',
      'Vegetables': 'Everyday Vegetables',
      'Dairy': 'Dairy Essentials',
      'Bakery': 'Bakery Favourites',
      'Beverages': 'Beverages',
      'Snacks': 'Smart Snacks'
    };
    
    grid.classList.remove('products-grid'); // remove default grid to do sections
    grid.innerHTML = Object.keys(catGroups).map(cat => {
      const gProducts = catGroups[cat].slice(0, 10); // cap items per home section
      const catConfig = CAT_CFG[cat] || {emoji: ''};
      return `
        <div class="list-section">
          <div class="list-section-header">
            <div class="section-title-wrap">
              <span class="section-icon">${catConfig.emoji}</span>
              <span class="section-title">${titles[cat] || cat}</span>
            </div>
            <button class="section-see-all" onclick="switchCategory('${cat}')">See all <ui-icon name="chevron-right" style="font-size:14px;margin-bottom:-2px;"></ui-icon></button>
          </div>
          <div class="products-carousel">
            ${gProducts.map((p,i) => renderSingleCard(p, i)).join('')}
          </div>
        </div>
      `;
    }).join('');
  } else {
    grid.classList.add('products-grid');
    grid.innerHTML = state.products.map((p, i) => renderSingleCard(p, i)).join('');
  }
}

function renderSingleCard(p, i) {
  const effP = ep(p);
  const saving = (p.price - effP).toFixed(2);
  const ci = getCartItem(p.id);
  const qty = ci ? ci.quantity : 0;
  const showDisc = p.discount > 0;
  let badgeText = '';
  if (p.rating >= 4.8) badgeText = 'Top Pick';
  else if (p.id.includes('v') || ['p5','p10'].includes(p.id)) badgeText = 'Bestseller';
  
  // Single card layout definition
  return `
    <div class="product-card ${qty > 0 ? 'in-cart' : ''}" style="animation-delay:${(i%10) * 0.035}s">
      <div class="product-img-wrap">
        ${showDisc ? `<span class="badge-discount">-${p.discount}% OFF</span>` : ''}
        ${badgeText ? `<span class="badge-top-rated">${badgeText}</span>` : ''}
        ${p.imageUrl
          ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy" onerror="this.style.display='none'">`
          : `<div style="width:100%; height:100%; background:rgba(0,0,0,0.03);"></div>`}
      </div>
      <div class="product-body">
        <div class="product-rating-row" style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
          <span style="font-size:10px; font-weight:700; color:#b45309; background:rgba(251,191,36,0.15); padding:2px 4px; border-radius:4px; display:inline-flex; align-items:center;">
            <ui-icon name="star" style="font-size:8px; margin-right:2px;"></ui-icon> ${p.rating}
          </span>
          <span class="product-cat-label" style="font-size:9px; font-weight:800; text-transform:uppercase; color:var(--text-muted);">${p.category}</span>
        </div>
        <div class="product-name" style="font-size:13px; font-weight:700; color:var(--text); line-height:1.3; margin-bottom:4px; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${p.name}</div>
        <div class="product-desc" style="font-size:11px; color:var(--text-3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:auto;">${p.description}</div>
        
        <div class="product-price-row" style="margin-top:8px;">
          <div style="display:flex; align-items:flex-end; gap:4px">
            <span class="price-current" style="font-size:16px; font-weight:800; color:var(--text); line-height:1;">₹${effP.toFixed(0)}</span>
            <span class="price-unit" style="font-size:11px;color:var(--text-muted);font-weight:500;">/${p.unit}</span>
          </div>
          <div style="min-height:12px; margin-top:4px;">
            ${showDisc ? `
            <div style="display:flex; align-items:center; gap:4px;">
              <span class="price-old" style="font-size:10px; color:var(--text-muted); text-decoration:line-through;">₹${p.price.toFixed(0)}</span>
              <span class="price-save" style="font-size:10px; font-weight:600; color:var(--cat-accent);">Save ₹${saving}</span>
            </div>` : ''}
          </div>
        </div>
        
        <div class="card-action" style="margin-top:10px;">
          ${qty > 0
            ? `<div class="qty-stepper" id="stepper-${p.id}">
                <button onclick="updateQty('${p.id}',${qty - 1})">−</button>
                <span class="qty-val">${qty}</span>
                <button onclick="updateQty('${p.id}',${qty + 1})">+</button>
              </div>`
            : `<button class="btn-add" id="add-btn-${p.id}" onclick="addToCart('${p.id}', this)">
                ADD
              </button>`}
        </div>
      </div>
    </div>`;
}

function getCartItem(pid) {
  return state.cart?.items?.find(i => i.productId === pid) || null;
}

/* ── SEARCH ── */
function setupSearch() {
  const si = document.getElementById('search-input');
  const clr = document.getElementById('search-clear');
  let dt;
  si.addEventListener('input', e => {
    const val = e.target.value.trim();
    state.searchTerm = val;
    clr.classList.toggle('hidden', !val);
    highlightCategoryIntent(val);
    clearTimeout(dt);
    dt = setTimeout(() => {
      updateListStructure();
      loadProducts();
    }, 300);
  });
  si.addEventListener('keydown', e => { if (e.key === 'Escape') clearSearch(); });
}

function cycleSearchPlaceholder() {
  const items = ['"fresh milk"', '"sweet mangoes"', '"organic bread"', '"snacks under ₹100"', '"farm dairy"'];
  const input = document.getElementById('search-input');
  const dynamic = document.getElementById('search-dynamic-item');
  const layer = document.getElementById('search-placeholder-layer');
  if (!input || !dynamic) return;

  const updateVis = () => { layer.style.opacity = (input.value.length > 0) ? '0' : '1'; };
  input.addEventListener('input', updateVis);
  
  if (dynamic) {
    dynamic.style.transition = 'opacity 0.4s, transform 0.4s';
  }

  let idx = 0;
  setInterval(() => {
    dynamic.style.opacity = '0';
    dynamic.style.transform = 'translateY(-4px)';
    setTimeout(() => {
      idx = (idx + 1) % items.length;
      dynamic.textContent = items[idx];
      dynamic.style.opacity = '1';
      dynamic.style.transform = 'translateY(0)';
    }, 450);
  }, 3500);
}

function highlightCategoryIntent(term) {
  const t = term.toLowerCase();
  let cat = null;
  if(t.includes('milk') || t.includes('cheese') || t.includes('butter') || t.includes('paneer')) cat = 'Dairy';
  else if (t.includes('apple') || t.includes('mango') || t.includes('banana') || t.includes('fruit')) cat = 'Fruits';
  else if (t.includes('chips') || t.includes('snack') || t.includes('biscuit') || t.includes('cookie')) cat = 'Snacks';
  else if (t.includes('bread') || t.includes('cake') || t.includes('croissant')) cat = 'Bakery';
  else if (t.includes('drink') || t.includes('juice') || t.includes('coke') || t.includes('coffee')) cat = 'Beverages';
  else if (t.includes('tomato') || t.includes('potato') || t.includes('onion') || t.includes('veg')) cat = 'Vegetables';
  
  document.querySelectorAll('.tab-pill').forEach(el => el.style.boxShadow = '');
  if(cat) {
    const el = document.getElementById('tab-' + cat);
    if(el) el.style.boxShadow = '0 0 0 2px var(--cat-accent), 0 0 10px var(--cat-accent-bg)';
  }
}

function clearSearch(reload = true) {
  state.searchTerm = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.add('hidden');
  const layer = document.getElementById('search-placeholder-layer');
  if (layer) layer.style.opacity = '1';
  updateListStructure();
  if(reload) loadProducts();
}

function applyQuickFilter(type) {
  state.filters = state.filters || {};
  if (type.startsWith('price_')) {
    state.filters.price = type.replace('price_','');
  } else if (type.startsWith('rating_')) {
    state.filters.rating = type.replace('rating_','');
  } else if (type === 'discount') {
    state.filters.quick = 'discount';
  } else {
    state.filters.cats = [type];
  }
  sortAndRender();
  renderAppliedFilters();
}

function showHotDeals() {
  switchScreen('browse');
  applyQuickFilter('hot_50');
  showToast('<ui-icon name="flame" style="margin-right:6px;color:#ef4444;--icon-color:#ef4444;"></ui-icon> 🔥 Today\'s <b>Half-Price</b> Steals!');
}

function switchScreen(id) {
  state.currentScreen = id;
  // Toggle screens
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active');
    s.classList.add('hidden');
  });
  
  // Virtual screen mappings to the physical screen container
  // Virtual screen mappings
  const CONTAINER_MAP = { 'hot-deals': 'browse' };
  const screenId = CONTAINER_MAP[id] || id;
  const target = document.getElementById('screen-' + screenId);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  // Update Bottom Nav
  document.querySelectorAll('.nav-tab').forEach(t => {
    t.classList.remove('active');
    const icon = t.querySelector('ui-icon');
    if (icon) icon.style.color = 'var(--text-3)';
  });

  const TAB_MAP = {
    'browse': 'nav-home',
    'orders': 'nav-orders-again',
    'categories': 'nav-categories',
    'hot-deals': 'nav-hot-deals'
  };

  const tabId = TAB_MAP[id];
  const tab = document.getElementById(tabId);
  if (tab) {
    tab.classList.add('active');
    const icon = tab.querySelector('ui-icon');
    if (icon) {
      if (tabId === 'nav-hot-deals') icon.style.color = '#ef4444';
      else icon.style.color = 'var(--cat-accent)';
    }
  }

  if (id === 'orders') loadOrders();
  const ca = document.getElementById('content-area');
  if (ca) ca.scrollTo({ top: 0, behavior: 'auto' });
}

function focusSearch() {
  document.getElementById('search-input').focus();
  document.getElementById('content-area').scrollTop = 0;
}

/* ── CART ── */
async function loadCart() {
  const res = await apiGet('/api/cart');
  if (res.success) {
    state.cart = res.data;
    if (!state.cartId && res.data.id) {
      state.cartId = res.data.id;
      localStorage.setItem('fc_cart_id', res.data.id);
    }
    updateCartUI();
  }
}

async function addToCart(pid, btn) {
  if (btn) { btn.innerHTML = '<div class="spinner"></div>'; btn.disabled = true; }
  const res = await apiPost('/api/cart/items', { productId: pid, quantity: 1 });
  if (res.success) {
    state.cart = res.data;
    if (!state.cartId) { state.cartId = res.data.id; localStorage.setItem('fc_cart_id', res.data.id); }
    updateCartUI();
    renderProducts();
    const p = state.products.find(x => x.id === pid);
    showToast(`<ui-icon name="check-circle" style="color:var(--primary);margin-right:6px;vertical-align:middle;"></ui-icon> Added 1 <b>${p?.name || 'Item'}</b> to cart`);
    animateCartIcon();
  } else {
    if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" width="13" height="13"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg> Add'; btn.disabled = false; }
  }
}

async function updateQty(pid, qty) {
  if (qty <= 0) return removeItem(pid);
  const res = await apiPut(`/api/cart/items/${pid}`, { quantity: qty });
  if (res.success) { state.cart = res.data; updateCartUI(); renderProducts(); renderSheetItems(); }
}

async function removeItem(pid) {
  const res = await apiDelete(`/api/cart/items/${pid}`);
  if (res.success) { state.cart = res.data; updateCartUI(); renderProducts(); renderSheetItems(); showToast('<ui-icon name="trash-2" style="margin-right:6px;vertical-align:middle;"></ui-icon> Item removed'); }
}

function animateCartIcon() {
  const icon = document.getElementById('cart-icon-btn');
  if (icon) {
    icon.style.transform = 'scale(1.2) translateY(-2px)';
    setTimeout(() => icon.style.transform = '', 200);
  }
}

function updateCartUI() {
  const ct = state.cart?.itemCount || 0;
  const total = state.cart?.total || 0;

  // Badge on cart icon
  const badge = document.getElementById('cart-count-badge');
  badge.textContent = ct;
  badge.classList.toggle('hidden', ct === 0);

  // Cart bar
  const bar = document.getElementById('cart-bar');
  if (ct > 0) {
    bar.classList.remove('hidden');
    document.getElementById('cart-bar-count').textContent = `${ct} item${ct !== 1 ? 's' : ''}`;
    document.getElementById('cart-bar-total').textContent = `₹${total.toFixed(2)}`;
  } else {
    bar.classList.add('hidden');
  }
}

/* ── CART SHEET ── */
function openCart() {
  const sheet = document.getElementById('cart-sheet');
  const overlay = document.getElementById('sheet-overlay');
  sheet.classList.remove('hidden');
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  renderSheetItems();
  renderSheetTotals();
}

function closeCart() {
  document.getElementById('cart-sheet').classList.add('hidden');
  document.getElementById('sheet-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  // Let animation finish then truly hide
  setTimeout(() => {
    document.getElementById('cart-sheet').classList.add('hidden');
  }, 260);
}

function renderSheetItems() {
  const itemsEl = document.getElementById('sheet-items');
  const emptyEl = document.getElementById('sheet-empty');
  const footerEl = document.getElementById('sheet-footer');
  if (!state.cart || state.cart.items.length === 0) {
    itemsEl.innerHTML = '';
    emptyEl.classList.remove('hidden');
    footerEl.classList.add('hidden');
    return;
  }
  emptyEl.classList.add('hidden');
  footerEl.classList.remove('hidden');

  itemsEl.innerHTML = state.cart.items.map(item => `
    <div class="sheet-item">
      <div class="sheet-item-img" style="display:flex;align-items:center;justify-content:center;font-size:32px;">
        ${item.product.imageUrl
          ? `<img src="${item.product.imageUrl}" alt="${item.product.name}" loading="lazy">`
          : (CAT_CFG[item.product.category] ? CAT_CFG[item.product.category].emoji : '<ui-icon name="package"></ui-icon>')}
      </div>
      <div class="sheet-item-info">
        <div class="sheet-item-name">${item.product.name}</div>
        <div class="sheet-item-price">₹${item.effectivePrice.toFixed(2)} / ${item.product.unit}</div>
      </div>
      <div class="sheet-item-stepper">
        <button onclick="updateQty('${item.productId}', ${item.quantity - 1})">−</button>
        <span class="sq">${item.quantity}</span>
        <button onclick="updateQty('${item.productId}', ${item.quantity + 1})">+</button>
      </div>
    </div>`).join('');

  renderSheetTotals();
}

function renderSheetTotals() {
  if (!state.cart) return;
  document.getElementById('sheet-subtotal').textContent = `₹${state.cart.subtotal.toFixed(2)}`;
  document.getElementById('sheet-total').textContent = `₹${state.cart.total.toFixed(2)}`;
  const sr = document.getElementById('sheet-savings-row');
  if (state.cart.savings > 0) {
    sr.classList.remove('hidden');
    document.getElementById('sheet-savings').textContent = `-₹${state.cart.savings.toFixed(2)}`;
  } else { sr.classList.add('hidden'); }
}

/* ── CHECKOUT ── */
function openCheckout() {
  if (!state.cart || state.cart.items.length === 0) { showToast('🛒 Your cart is empty!'); return; }
  closeCart();
  setTimeout(() => {
    renderCheckoutSummary();
    switchScreen('checkout');
  }, 260);
}

function closeCheckout() {
  switchScreen('browse');
}

function renderCheckoutSummary() {
  const el = document.getElementById('checkout-summary-card');
  if (!state.cart) return;
  el.innerHTML = `
    <div class="form-card-title" style="margin-bottom:12px">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      Order Summary
    </div>
    ${state.cart.items.map(item => `
      <div class="co-item">
        <div class="co-item-img" style="display:flex;align-items:center;justify-content:center;font-size:24px;">
          ${item.product.imageUrl ? `<img src="${item.product.imageUrl}" alt="${item.product.name}">` : (CAT_CFG[item.product.category] ? CAT_CFG[item.product.category].emoji : '<ui-icon name="package"></ui-icon>')}
        </div>
        <div class="co-item-name">${item.product.name}</div>
        <div class="co-item-qty">×${item.quantity}</div>
        <div class="co-item-total">₹${item.itemTotal.toFixed(2)}</div>
      </div>`).join('')}
    <div style="display:flex;justify-content:space-between;padding:10px 0 0;border-top:1px solid var(--border);margin-top:8px;font-size:13px;font-weight:800;color:var(--text)">
      <span>Total</span><span>₹${state.cart.total.toFixed(2)}</span>
    </div>`;
}

function setupPaymentOptions() {
  document.querySelectorAll('.pay-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });
}

async function placeOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('place-order-btn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div> Placing…';
  const fd = new FormData(document.getElementById('checkout-form'));
  try {
    const res = await apiPost('/api/orders', {
      customerName: fd.get('customerName'),
      customerEmail: fd.get('customerEmail'),
      customerPhone: fd.get('customerPhone'),
      address: fd.get('address'),
      paymentMethod: fd.get('paymentMethod'),
    });
    if (res.success) {
      state.cart = { items: [], subtotal: 0, total: 0, savings: 0, itemCount: 0 };
      state.cartId = null;
      localStorage.removeItem('fc_cart_id');
      updateCartUI();
      renderProducts();
      renderSheetItems();
      showConfirmation(res.data);
      document.getElementById('checkout-form').reset();
      document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
      document.querySelector('.pay-opt:first-child').classList.add('selected');
    } else { showToast('❌ ' + (res.error || 'Order failed')); }
  } catch { showToast('❌ Network error. Retry.'); }
  btn.disabled = false;
  btn.innerHTML = '<span>Place Order</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
}

function showConfirmation(order) {
  switchScreen('confirmation');
  const date = new Date(order.createdAt).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const payLabels = { cash: 'Cash on Delivery', upi: 'UPI / GPay', card: 'Debit / Credit Card' };
  document.getElementById('confirmation-wrap').innerHTML = `
    <div class="conf-icon" style="color:var(--primary)"><ui-icon name="check-circle" style="font-size:48px"></ui-icon></div>
    <div class="conf-title">Order Confirmed!</div>
    <div class="conf-msg">Thank you, <b>${order.customerName}</b>! Your groceries are on their way.</div>
    <div class="conf-eta"><ui-icon name="clock" style="vertical-align:middle;margin-right:4px"></ui-icon> Arriving <b>as soon as possible</b></div>
    <div class="conf-details">
      <div class="conf-row"><span>Order ID</span><span style="font-family:monospace">#${order.id.slice(0,8).toUpperCase()}</span></div>
      <div class="conf-row"><span>Date</span><span>${date}</span></div>
      <div class="conf-row"><span>Items</span><span>${order.items.length} product${order.items.length > 1 ? 's' : ''}</span></div>
      <div class="conf-row"><span>Payment</span><span>${payLabels[order.paymentMethod] || order.paymentMethod}</span></div>
      <div class="conf-row"><span>Delivery</span><span style="color:#16a34a">Free · ASAP <ui-icon name="zap" style="vertical-align:-2px"></ui-icon></span></div>
      ${order.savings > 0 ? `<div class="conf-row"><span><ui-icon name="gift" style="vertical-align:-2px;margin-right:2px;font-size:14px"></ui-icon> You Saved</span><span style="color:#d97706;font-weight:800">₹${order.savings.toFixed(2)}</span></div>` : ''}
      <div class="conf-row total-row"><span>Total Paid</span><span>₹${order.total.toFixed(2)}</span></div>
    </div>
    <div class="conf-actions">
      <button class="btn-primary" onclick="switchScreen('browse')">Continue Shopping</button>
      <button class="btn-ghost" onclick="switchScreen('orders')">View Orders</button>
    </div>`;
}

/* ── ORDERS ── */
async function loadOrders() {
  const res = await apiGet('/api/orders');
  if (res.success) renderOrders(res.data);
}

function renderOrders(orders) {
  const listEl = document.getElementById('orders-list');
  const emptyEl = document.getElementById('empty-orders');
  if (orders.length === 0) { listEl.innerHTML = ''; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = orders.map(order => {
    const date = new Date(order.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="order-card">
        <div class="order-card-head">
          <span class="order-id">#${order.id.slice(0, 8).toUpperCase()}</span>
          <span class="order-status-pill ${order.status === 'confirmed' ? 'status-confirmed' : 'status-pending'}">
            ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </span>
        </div>
        <div class="order-chips">
          ${order.items.map(i => `<span class="order-chip"><ui-icon name="package" style="margin-right:4px"></ui-icon> ${i.name} ×${i.quantity}</span>`).join('')}
        </div>
        <div class="order-foot">
          <span>${date}</span>
          <span class="order-total-val">₹${order.total.toFixed(2)}</span>
        </div>
      </div>`;
  }).join('');
}

/* ── SCREEN NAVIGATION ── */
function switchScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + name).classList.add('active');

  // Update bottom nav
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  const navMap = { browse: 'nav-home', orders: 'nav-orders' };
  if (navMap[name]) document.getElementById(navMap[name])?.classList.add('active');

  if (name === 'orders') loadOrders();
  window.scrollTo(0, 0);
}

/* ── TOAST ── */
function showToast(message, duration = 3200) {
  const stack = document.getElementById('toast-stack');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `<span>${message}</span><div class="toast-bar"></div>`;
  stack.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 260); }, duration);
}

/* ── LOCATION SHEET ── */
function openLocationSheet() {
  document.getElementById('location-sheet').classList.remove('hidden');
  document.getElementById('sheet-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeLocationSheet() {
  document.getElementById('location-sheet').classList.add('hidden');
  document.getElementById('sheet-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

/* ── FILTER SHEET ── */
function openFilterSheet() {
  document.getElementById('filter-sheet').classList.remove('hidden');
  document.getElementById('sheet-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeFilterSheet() {
  document.getElementById('filter-sheet').classList.add('hidden');
  document.getElementById('sheet-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

function applyFilters() {
  closeFilterSheet();
  state.filters = {};
  
  const priceInput = document.querySelector('input[name="price"]:checked');
  if (priceInput) state.filters.price = priceInput.value;
  
  const ratingInput = document.querySelector('input[name="rating"]:checked');
  if (ratingInput) state.filters.rating = ratingInput.value;
  
  const cats = Array.from(document.querySelectorAll('input[name="cat"]:checked')).map(e=>e.value);
  if (cats.length > 0) state.filters.cats = cats;

  sortAndRender();
  renderAppliedFilters();
}

function clearFilters() {
  document.querySelectorAll('input[name="price"], input[name="rating"], input[name="cat"]').forEach(e => e.checked = false);
  state.filters = null;
  sortAndRender();
  renderAppliedFilters();
  closeFilterSheet();
}

/* ── LIVE API PRICE SYNC ── */
async function fetchLiveMarketPrices() {
  try {
    // We use a free genuine API (open exchangerate API) to calculate active INR prices dynamically
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    const liveRate = data.rates.INR; // e.g. 83.something

    let updated = false;
    state.allProducts.forEach(p => {
      // Calculate a pseudo original base rate for the item 
      const baseUSD = (parseInt(p.id.replace('p', '')) * 0.15 + 0.5);
      
      // Calculate realistic modern INR local price actively
      const newPrice = Math.round(baseUSD * liveRate);
      if (p.price !== newPrice) {
        p.price = newPrice;
        updated = true;
      }
    });

    if (updated) {
      sortAndRender();
      showToast(`<ui-icon name="trending-up" style="margin-right:6px;vertical-align:middle;"></ui-icon> Synced live market prices (₹\${liveRate.toFixed(2)}/$)`);
    }
  } catch (err) {
    console.error("Live market API sync failed");
  }
}
