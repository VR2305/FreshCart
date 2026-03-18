/* ═══════════════════════════════════════════
   FreshCart v2 — Enhanced Frontend Logic
   Real images, skeletons, scroll reveals,
   mobile nav, improved toasts
   ═══════════════════════════════════════════ */

const state = {
  products: [],
  categories: [],
  cart: null,
  cartId: localStorage.getItem('freshcart_cart_id') || null,
  currentCategory: 'All',
  searchTerm: '',
  currentView: 'home',
  theme: localStorage.getItem('freshcart_theme') || 'dark',
};
const API = '';

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  setupEventListeners();
  showProductSkeletons();
  loadApp();
  setupScrollReveal();
});

async function loadApp() {
  await Promise.all([loadCategories(), loadProducts(), loadCart()]);
}

// ── Theme ──
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); state.theme = t; localStorage.setItem('freshcart_theme', t); }
function toggleTheme() { applyTheme(state.theme === 'dark' ? 'light' : 'dark'); }

// ── Events ──
function setupEventListeners() {
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  const si = document.getElementById('search-input');
  let dt;
  si.addEventListener('input', e => { clearTimeout(dt); dt = setTimeout(() => { state.searchTerm = e.target.value.trim(); loadProducts(); }, 300); });
  si.addEventListener('keydown', e => { if (e.key === 'Escape') { si.value = ''; state.searchTerm = ''; loadProducts(); si.blur(); } });
  window.addEventListener('scroll', () => { document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20); });
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => { document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected')); opt.classList.add('selected'); opt.querySelector('input').checked = true; });
  });
  document.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) { e.preventDefault(); si.focus(); } });
}

// ── API ──
function getHeaders() { const h = { 'Content-Type': 'application/json' }; if (state.cartId) h['x-cart-id'] = state.cartId; return h; }
async function apiGet(u) { return (await fetch(API + u, { headers: getHeaders() })).json(); }
async function apiPost(u, b) { return (await fetch(API + u, { method: 'POST', headers: getHeaders(), body: JSON.stringify(b) })).json(); }
async function apiPut(u, b) { return (await fetch(API + u, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(b) })).json(); }
async function apiDelete(u) { return (await fetch(API + u, { method: 'DELETE', headers: getHeaders() })).json(); }

// ═══ SKELETONS ═══
function showProductSkeletons() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-image"></div>
      <div class="skeleton skeleton-text" style="margin-top:16px"></div>
      <div class="skeleton skeleton-text short"></div>
      <div class="skeleton skeleton-text price"></div>
      <div class="skeleton skeleton-btn"></div>
    </div>
  `).join('');
}

// ═══ SCROLL REVEAL ═══
function setupScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); observer.unobserve(entry.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.categories-section, .products-section').forEach(el => { el.classList.add('scroll-reveal'); observer.observe(el); });
}

// ═══ CATEGORIES ═══
const CATEGORY_EMOJIS = { Fruits: '🍎', Vegetables: '🥦', Dairy: '🧀', Bakery: '🍞', Beverages: '☕', Snacks: '🍫', All: '🏪' };

async function loadCategories() {
  const res = await apiGet('/api/products/categories');
  if (res.success) { state.categories = res.data; renderCategories(); renderFilterTabs(); }
}

function renderCategories() {
  const grid = document.getElementById('categories-grid');
  const all = ['All', ...state.categories];
  grid.innerHTML = all.map(c => `
    <div class="category-card ${state.currentCategory === c ? 'active' : ''}" onclick="filterByCategory('${c}')">
      <span class="category-emoji">${CATEGORY_EMOJIS[c] || '📦'}</span>
      <span class="category-name">${c}</span>
    </div>
  `).join('');
}

function renderFilterTabs() {
  const tabs = document.getElementById('filter-tabs');
  const all = ['All', ...state.categories];
  tabs.innerHTML = all.map(c => `<button class="filter-tab ${state.currentCategory === c ? 'active' : ''}" onclick="filterByCategory('${c}')">${c}</button>`).join('');
}

function filterByCategory(c) { state.currentCategory = c; renderCategories(); renderFilterTabs(); loadProducts(); document.getElementById('products-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function clearFilters() { state.currentCategory = 'All'; state.searchTerm = ''; document.getElementById('search-input').value = ''; renderCategories(); renderFilterTabs(); loadProducts(); }
function scrollToDeals() { state.currentCategory = 'All'; state.searchTerm = ''; renderCategories(); renderFilterTabs(); loadProducts('deals'); document.getElementById('products-section').scrollIntoView({ behavior: 'smooth' }); }

// ═══ PRODUCTS ═══
async function loadProducts(mode = 'all') {
  let url = '/api/products';
  const p = new URLSearchParams();
  if (state.currentCategory && state.currentCategory !== 'All') p.set('category', state.currentCategory);
  if (state.searchTerm) p.set('search', state.searchTerm);
  if (p.toString()) url += '?' + p.toString();
  const res = await apiGet(url);
  if (res.success) {
    let products = res.data;
    if (mode === 'deals') products = products.filter(p => p.discount > 0);
    state.products = products;
    renderProducts();
  }
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const empty = document.getElementById('empty-products');
  const title = document.getElementById('products-title');
  const count = document.getElementById('products-count');

  title.textContent = state.searchTerm ? `Search: "${state.searchTerm}"` : state.currentCategory !== 'All' ? state.currentCategory : 'All Products';
  count.textContent = `${state.products.length} item${state.products.length !== 1 ? 's' : ''}`;

  if (state.products.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');

  grid.innerHTML = state.products.map((p, i) => {
    const ep = p.discount > 0 ? (p.price * (1 - p.discount / 100)) : p.price;
    const ci = getCartItem(p.id);
    const qty = ci ? ci.quantity : 0;
    return `
      <div class="product-card reveal" style="animation-delay:${i * 0.04}s">
        <div class="product-image-area">
          ${p.discount > 0 ? `<span class="product-badge badge-discount">-${p.discount}%</span>` : ''}
          ${p.rating >= 4.8 ? `<span class="product-badge badge-top" style="${p.discount > 0 ? 'left:auto;right:12px' : ''}">⭐ Top</span>` : ''}
          ${p.imageUrl
            ? `<img src="${p.imageUrl}" alt="${p.name}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <span class="product-emoji-fallback" style="${p.imageUrl ? 'display:none' : ''}">${p.image}</span>
        </div>
        <div class="product-info">
          <div class="product-category-tag">${p.category}</div>
          <h3 class="product-name">${p.name}</h3>
          <p class="product-description">${p.description}</p>
          <div class="product-meta">
            <div class="product-price-group">
              <span class="product-price">$${ep.toFixed(2)}</span>
              ${p.discount > 0 ? `<span class="product-original-price">$${p.price.toFixed(2)}</span>` : ''}
              <span class="product-unit">/ ${p.unit}</span>
            </div>
            <div class="product-rating">⭐ ${p.rating}</div>
          </div>
          <div class="product-actions">
            ${qty > 0 ? `
              <div class="quantity-control">
                <button class="qty-btn" onclick="updateCartQty('${p.id}',${qty - 1})">−</button>
                <span class="qty-value">${qty}</span>
                <button class="qty-btn" onclick="updateCartQty('${p.id}',${qty + 1})">+</button>
              </div>
            ` : `
              <button class="add-to-cart-btn" onclick="addToCart('${p.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Add to Cart
              </button>
            `}
          </div>
        </div>
      </div>`;
  }).join('');
}

function getCartItem(pid) { return state.cart?.items?.find(i => i.productId === pid) || null; }

// ═══ CART ═══
async function loadCart() {
  const res = await apiGet('/api/cart');
  if (res.success) {
    state.cart = res.data;
    if (!state.cartId && res.data.id) { state.cartId = res.data.id; localStorage.setItem('freshcart_cart_id', res.data.id); }
    renderCartSidebar(); updateCartBadge();
  }
}

async function addToCart(pid) {
  const res = await apiPost('/api/cart/items', { productId: pid, quantity: 1 });
  if (res.success) {
    state.cart = res.data;
    if (!state.cartId) { state.cartId = res.data.id; localStorage.setItem('freshcart_cart_id', res.data.id); }
    renderCartSidebar(); updateCartBadge(); renderProducts();
    const p = state.products.find(x => x.id === pid);
    showToast(`${p?.image || '🛒'} ${p?.name || 'Item'} added to cart`, 'success');
  }
}

async function updateCartQty(pid, qty) {
  if (qty <= 0) return removeFromCart(pid);
  const res = await apiPut(`/api/cart/items/${pid}`, { quantity: qty });
  if (res.success) { state.cart = res.data; renderCartSidebar(); updateCartBadge(); renderProducts(); }
}

async function removeFromCart(pid) {
  const res = await apiDelete(`/api/cart/items/${pid}`);
  if (res.success) { state.cart = res.data; renderCartSidebar(); updateCartBadge(); renderProducts(); showToast('🗑️ Item removed from cart', 'info'); }
}

function toggleCart() {
  const s = document.getElementById('cart-sidebar'), o = document.getElementById('cart-overlay'), isOpen = s.classList.contains('open');
  s.classList.toggle('open'); o.classList.toggle('open');
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

function updateCartBadge() {
  const ct = state.cart ? state.cart.itemCount : 0;
  const badge = document.getElementById('cart-badge');
  badge.textContent = ct; badge.classList.toggle('visible', ct > 0);
  // Mobile badge
  const mb = document.getElementById('mob-cart-badge');
  if (mb) { mb.textContent = ct; mb.classList.toggle('hidden', ct === 0); }
}

function renderCartSidebar() {
  const itemsEl = document.getElementById('cart-items'), emptyEl = document.getElementById('cart-empty'), footerEl = document.getElementById('cart-footer');
  if (!state.cart || state.cart.items.length === 0) {
    itemsEl.innerHTML = ''; itemsEl.classList.add('hidden'); emptyEl.classList.remove('hidden'); footerEl.classList.add('hidden'); return;
  }
  emptyEl.classList.add('hidden'); itemsEl.classList.remove('hidden'); footerEl.classList.remove('hidden');
  itemsEl.innerHTML = state.cart.items.map(item => `
    <div class="cart-item">
      <div class="cart-item-emoji">
        ${item.product.imageUrl ? `<img src="${item.product.imageUrl}" alt="${item.product.name}" loading="lazy">` : item.product.image}
      </div>
      <div class="cart-item-details">
        <div class="cart-item-name">${item.product.name}</div>
        <div class="cart-item-price">$${item.effectivePrice.toFixed(2)} / ${item.product.unit}</div>
        <div class="cart-item-controls">
          <div class="cart-item-qty">
            <button class="cart-qty-btn" onclick="updateCartQty('${item.productId}',${item.quantity - 1})">−</button>
            <span class="cart-qty-value">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="updateCartQty('${item.productId}',${item.quantity + 1})">+</button>
          </div>
          <span class="cart-item-total">$${item.itemTotal.toFixed(2)}</span>
        </div>
      </div>
      <button class="cart-item-remove" onclick="removeFromCart('${item.productId}')" title="Remove">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  `).join('');
  document.getElementById('cart-subtotal').textContent = `$${state.cart.subtotal.toFixed(2)}`;
  document.getElementById('cart-total').textContent = `$${state.cart.total.toFixed(2)}`;
  const sr = document.getElementById('cart-savings-row');
  if (state.cart.savings > 0) { sr.classList.remove('hidden'); document.getElementById('cart-savings').textContent = `-$${state.cart.savings.toFixed(2)}`; } else { sr.classList.add('hidden'); }
}

// ═══ CHECKOUT ═══
function goToCheckout() {
  if (!state.cart || state.cart.items.length === 0) { showToast('🛒 Your cart is empty!', 'error'); return; }
  toggleCart(); setTimeout(() => { navigateTo('checkout'); renderOrderSummary(); }, 300);
}

function renderOrderSummary() {
  const el = document.getElementById('order-summary');
  if (!state.cart) return;
  el.innerHTML = `
    <h3 class="summary-title">Order Summary</h3>
    ${state.cart.items.map(item => `
      <div class="summary-item">
        <span class="summary-item-emoji">${item.product.imageUrl ? `<img src="${item.product.imageUrl}" alt="${item.product.name}">` : item.product.image}</span>
        <div class="summary-item-info">
          <div class="summary-item-name">${item.product.name}</div>
          <div class="summary-item-qty">x${item.quantity} · $${item.effectivePrice.toFixed(2)}/${item.product.unit}</div>
        </div>
        <span class="summary-item-price">$${item.itemTotal.toFixed(2)}</span>
      </div>
    `).join('')}
    <div class="summary-totals">
      <div class="summary-row"><span>Subtotal</span><span>$${state.cart.subtotal.toFixed(2)}</span></div>
      ${state.cart.savings > 0 ? `<div class="summary-row savings"><span>Savings</span><span>-$${state.cart.savings.toFixed(2)}</span></div>` : ''}
      <div class="summary-row"><span>Delivery</span><span style="color:var(--success);font-weight:600">Free</span></div>
      <div class="summary-row total"><span>Total</span><span>$${state.cart.total.toFixed(2)}</span></div>
    </div>`;
}

async function placeOrder(e) {
  e.preventDefault();
  const btn = document.getElementById('place-order-btn');
  btn.disabled = true; btn.innerHTML = '<div class="spinner"></div> Placing Order...';
  const fd = new FormData(document.getElementById('checkout-form'));
  try {
    const res = await apiPost('/api/orders', { customerName: fd.get('customerName'), customerEmail: fd.get('customerEmail'), customerPhone: fd.get('customerPhone'), address: fd.get('address'), paymentMethod: fd.get('paymentMethod') });
    if (res.success) {
      state.cart = { items: [], subtotal: 0, total: 0, savings: 0, itemCount: 0 };
      updateCartBadge(); renderCartSidebar(); showConfirmation(res.data);
      document.getElementById('checkout-form').reset();
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      document.querySelector('.payment-option:first-child').classList.add('selected');
      showToast('🎉 Order placed successfully!', 'success');
    } else { showToast('❌ ' + (res.error || 'Failed'), 'error'); }
  } catch { showToast('❌ Network error', 'error'); }
  btn.disabled = false;
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg><span>Place Order</span>`;
}

function showConfirmation(order) {
  navigateTo('confirmation');
  const date = new Date(order.createdAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  document.getElementById('confirmation-content').innerHTML = `
    <div class="confirmation-icon">✅</div>
    <h2 class="confirmation-title">Order Confirmed!</h2>
    <p class="confirmation-msg">Thank you, <strong>${order.customerName}</strong>! Your order has been placed and will be delivered to your doorstep soon.</p>
    <div class="confirmation-details">
      <div class="confirmation-row"><span>Order ID</span><span style="font-family:monospace;font-size:.8rem">${order.id.slice(0, 8).toUpperCase()}</span></div>
      <div class="confirmation-row"><span>Date</span><span>${date}</span></div>
      <div class="confirmation-row"><span>Items</span><span>${order.items.length} product${order.items.length > 1 ? 's' : ''}</span></div>
      <div class="confirmation-row"><span>Payment</span><span>${order.paymentMethod === 'cash' ? 'Cash on Delivery' : order.paymentMethod === 'card' ? 'Credit Card' : 'UPI / Digital'}</span></div>
      <div class="confirmation-row"><span>Delivery</span><span style="color:var(--success)">Free</span></div>
      ${order.savings > 0 ? `<div class="confirmation-row"><span>You Saved</span><span style="color:var(--success)">$${order.savings.toFixed(2)}</span></div>` : ''}
      <div class="confirmation-row total"><span>Total Paid</span><span>$${order.total.toFixed(2)}</span></div>
    </div>
    <div class="confirmation-actions">
      <button class="btn btn-primary btn-lg" onclick="navigateTo('home')">Continue Shopping</button>
      <button class="btn btn-ghost btn-lg" onclick="navigateTo('orders')">View Orders</button>
    </div>`;
}

// ═══ ORDERS ═══
async function loadOrders() { const res = await apiGet('/api/orders'); if (res.success) renderOrders(res.data); }

function renderOrders(orders) {
  const listEl = document.getElementById('orders-list'), emptyEl = document.getElementById('empty-orders');
  if (orders.length === 0) { listEl.innerHTML = ''; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = orders.map(order => {
    const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `
      <div class="order-card">
        <div class="order-header">
          <div class="order-id">Order #${order.id.slice(0, 8).toUpperCase()}</div>
          <span class="order-status status-${order.status}">${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
        </div>
        <div class="order-items-preview">
          ${order.items.map(it => `<span class="order-item-chip">${it.image} ${it.name} ×${it.quantity}</span>`).join('')}
        </div>
        <div class="order-footer">
          <span class="order-date">${date}</span>
          <span class="order-total">$${order.total.toFixed(2)}</span>
        </div>
      </div>`;
  }).join('');
}

// ═══ NAVIGATION ═══
function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${view}-view`).classList.add('active');
  state.currentView = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (view === 'orders') loadOrders();
  if (view === 'checkout') renderOrderSummary();
  // Mobile nav active state
  document.querySelectorAll('.mobile-nav-item').forEach(b => b.classList.remove('active'));
  const mobMap = { home: 'mob-home', orders: 'mob-orders' };
  if (mobMap[view]) document.getElementById(mobMap[view])?.classList.add('active');
}

// ═══ TOASTS ═══
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type]}</span><span class="toast-message">${message}</span><div class="toast-progress"></div>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 300); }, 3000);
}
