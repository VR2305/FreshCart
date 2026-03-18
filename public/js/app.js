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
  theme: localStorage.getItem('fc_theme') || 'light',
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
  updateClock();
  setInterval(updateClock, 30000);
  setupSearch();
  setupPaymentOptions();
  loadApp();
  startSearchAnimation();
});

function startSearchAnimation() {
  const keywords = ['fruits', 'milk', 'snacks under ₹100', 'bread', 'vegetables', 'beverages', 'top-rated items', 'fresh dairy'];
  let kIdx = 0;
  setInterval(() => {
    const el = document.getElementById('search-input');
    if (el && document.activeElement !== el && !state.searchTerm) {
      el.setAttribute('placeholder', 'Search for ' + keywords[kIdx] + '…');
      kIdx = (kIdx + 1) % keywords.length;
    }
  }, 1500);
}

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
        if (titleEl) titleEl.innerHTML = `DELIVER TO ${area}`;
        if (subEl) subEl.innerHTML = `Delivering to ${area} - As soon as possible`;
      } catch (e) {
        if (subEl) subEl.innerHTML = `Delivering to Kodambakkam, Chennai - As soon as possible`;
      }
    }, () => {
        if (subEl) subEl.innerHTML = `Delivering to Kodambakkam, Chennai - As soon as possible`;
    });
  }
}

/* ── CLOCK ── */
function updateClock() {
  const el = document.getElementById('status-time');
  if (el) el.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/* ── THEME ── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  state.theme = t;
  localStorage.setItem('fc_theme', t);
}
document.getElementById('theme-toggle').addEventListener('click', () => {
  applyTheme(state.theme === 'light' ? 'dark' : 'light');
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

  // Update header chip
  const cfg = CAT_CFG[cat] || { chip: cat };
  document.getElementById('category-header-chip').innerHTML = cfg.chip;

  // Animate content
  const ca = document.getElementById('content-area');
  ca.classList.add('transitioning');
  setTimeout(() => ca.classList.remove('transitioning'), 320);

  // Reset content area scroll
  document.getElementById('content-area').scrollTop = 0;

  loadProducts();
}

function initCategoryHeader() {
  const cfg = CAT_CFG[state.currentCategory] || { chip: state.currentCategory };
  document.getElementById('category-header-chip').innerHTML = cfg.chip;
  applyTabTheme(state.currentCategory);
}

/* ── PRODUCTS ── */
async function loadProducts() {
  showSkeletons(6);
  let url = '/api/products';
  const p = new URLSearchParams();
  if (state.currentCategory && state.currentCategory !== 'All') p.set('category', state.currentCategory);
  if (state.searchTerm) p.set('search', state.searchTerm);
  if (p.toString()) url += '?' + p.toString();
  const res = await apiGet(url);
  if (res.success) {
    state.allProducts = res.data;
    sortAndRender();
    initCategoryHeader();
  }
}

function sortAndRender() {
  let prods = [...state.allProducts];
  const mode = state.sortMode;
  if (mode === 'price-asc') prods.sort((a, b) => ep(a) - ep(b));
  else if (mode === 'price-desc') prods.sort((a, b) => ep(b) - ep(a));
  else if (mode === 'rating') prods.sort((a, b) => b.rating - a.rating);
  else if (mode === 'discount') prods.sort((a, b) => b.discount - a.discount);
  state.products = prods;
  renderProducts();
}

function applySort() {
  state.sortMode = document.getElementById('sort-select').value;
  sortAndRender();
}

const ep = p => p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const empty = document.getElementById('empty-state');

  if (state.products.length === 0) {
    grid.innerHTML = '';
    const emptySub = document.getElementById('empty-search-sub');
    if (emptySub) {
      emptySub.innerHTML = `No items found for '${state.searchTerm}'.<br>Try searching for 'milk', 'bread', or 'snacks under ₹100'.`;
    }
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  grid.innerHTML = state.products.map((p, i) => {
    const effP = ep(p);
    const saving = (p.price - effP).toFixed(2);
    const ci = getCartItem(p.id);
    const qty = ci ? ci.quantity : 0;
    const showDisc = p.discount > 0;
    const showTop = p.rating >= 4.8;
    const catIcon = CAT_CFG[p.category] ? CAT_CFG[p.category].emoji : '<ui-icon name="package"></ui-icon>';

    return `
      <div class="product-card" style="animation-delay:${i * 0.035}s">
        <div class="product-img-wrap">
          ${showDisc ? `<span class="badge-discount">-${p.discount}%</span>` : ''}
          ${showTop ? `<span class="badge-top-rated"><ui-icon name="star" style="vertical-align:-2px;margin-right:2px"></ui-icon> Top Pick</span>` : ''}
          ${p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <span class="product-emoji-fb" style="${p.imageUrl ? 'display:none' : ''}; font-size:40px; color:var(--text-muted); display:flex; align-items:center; justify-content:center;">${catIcon}</span>
        </div>
        <div class="product-body" style="display:flex; flex-direction:column; flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px">
            <div style="display:flex; gap:6px;">
              ${showDisc ? `<span style="background:var(--cat-accent);color:#fff;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;line-height:1">- ${p.discount}%</span>` : ''}
              ${showTop ? `<span style="background:rgba(22,163,74,0.1);color:#16a34a;font-size:10px;font-weight:800;padding:2px 6px;border-radius:6px;line-height:1">Top Pick</span>` : ''}
            </div>
            <div style="font-size:11px; font-weight:700; color:var(--text-3); display:flex; align-items:center;"><ui-icon name="star" style="font-size:10px; margin-right:2px; color:#d97706"></ui-icon> ${p.rating}</div>
          </div>
          <div class="product-cat-label" style="margin-bottom:2px">${p.category}</div>
          <div class="product-name" style="font-size:14px; margin-bottom:4px">${p.name}</div>
          <div class="product-desc" style="flex:1;">${p.description}</div>
          <div class="product-price-row" style="display:flex; justify-content:space-between; align-items:flex-end; margin-top:auto;">
            <div style="display:flex; flex-direction:column;">
              <div style="display:flex; align-items:baseline; gap:4px">
                <span class="price-current">₹${effP.toFixed(2)}</span>
                <span class="price-unit" style="font-size:10px;color:var(--text-muted)">/${p.unit}</span>
              </div>
              ${showDisc ? `<div style="display:flex; align-items:center; gap:4px; margin-top:2px;">
                <span class="price-old" style="font-size:10px; color:var(--text-muted); text-decoration:line-through;">₹${p.price.toFixed(2)}</span>
                <span class="price-save" style="font-size:9px; font-weight:700; color:var(--cat-accent);">Save ₹${saving}</span>
              </div>` : ''}
            </div>
            
            <div class="card-action" style="position:static; margin-bottom:0;">
              ${qty > 0
                ? `<div class="qty-stepper" id="stepper-${p.id}">
                    <button onclick="updateQty('${p.id}',${qty - 1})">−</button>
                    <span class="qty-val">${qty}</span>
                    <button onclick="updateQty('${p.id}',${qty + 1})">+</button>
                  </div>`
                : `<button class="btn-add" id="add-btn-${p.id}" onclick="addToCart('${p.id}', this)" style="padding:6px 14px; border-radius:8px;">
                    Add
                  </button>`}
            </div>
          </div>
        </div>
      </div>`;
  }).join('');
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
    clearTimeout(dt);
    dt = setTimeout(loadProducts, 300);
  });
  si.addEventListener('keydown', e => { if (e.key === 'Escape') clearSearch(); });
}

function clearSearch() {
  state.searchTerm = '';
  document.getElementById('search-input').value = '';
  document.getElementById('search-clear').classList.add('hidden');
  loadProducts();
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
      updateCartUI();
      renderSheetItems();
      renderProducts();
      showConfirmation(res.data);
      document.getElementById('checkout-form').reset();
      document.querySelectorAll('.pay-opt').forEach(o => o.classList.remove('selected'));
      document.querySelector('.pay-opt:first-child').classList.add('selected');
    } else { showToast('❌ ' + (res.error || 'Order failed')); }
  } catch { showToast('❌ Network error. Retry.'); }
  btn.disabled = false;
  btn.innerHTML = '<span>Place Order</span><ui-icon name="chevron-right" style="margin-left:4px;font-size:16px"></ui-icon>';
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
