/* ═══════════════════════════════════════════
   FreshCart v3 — Quick Commerce JS Flow
   Instant logic, real-time UI, 1-page checkout
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
  auth: JSON.parse(localStorage.getItem('freshcart_auth') || '{"isLoggedIn":false,"phone":"","address":"","pincode":"","landmark":""}')
};

const API = '';

document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  updateAuthUI();
  updateLocationUI();
  setupEventListeners();
  showProductSkeletons();
  loadApp();
});

async function loadApp() {
  await Promise.all([loadCategories(), loadProducts(), loadCart()]);
}

// ── Theme ──
function applyTheme(t) { document.documentElement.setAttribute('data-theme', t); state.theme = t; localStorage.setItem('freshcart_theme', t); }
function toggleTheme() { applyTheme(state.theme === 'dark' ? 'light' : 'dark'); }

// ── API Helpers ──
function getHeaders() { const h = { 'Content-Type': 'application/json' }; if (state.cartId) h['x-cart-id'] = state.cartId; return h; }
async function apiGet(u) { return (await fetch(API + u, { headers: getHeaders() })).json(); }
async function apiPost(u, b) { return (await fetch(API + u, { method: 'POST', headers: getHeaders(), body: JSON.stringify(b) })).json(); }
async function apiPut(u, b) { return (await fetch(API + u, { method: 'PUT', headers: getHeaders(), body: JSON.stringify(b) })).json(); }
async function apiDelete(u) { return (await fetch(API + u, { method: 'DELETE', headers: getHeaders() })).json(); }

// ── Event Listeners ──
function setupEventListeners() {
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Search with suggestions
  const si = document.getElementById('search-input');
  const sugg = document.getElementById('search-suggestions');
  let dt;
  si.addEventListener('input', e => { 
    clearTimeout(dt); 
    const val = e.target.value.trim();
    if(val.length > 0) {
      dt = setTimeout(() => { showSuggestions(val); }, 300);
    } else {
      sugg.classList.add('hidden');
      state.searchTerm = '';
      loadProducts();
    }
  });

  si.addEventListener('blur', () => { setTimeout(() => sugg.classList.add('hidden'), 200); });
  si.addEventListener('focus', () => { if(si.value.trim().length > 0) showSuggestions(si.value.trim()); });

  // Payment Selection
  document.querySelectorAll('.payment-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      opt.querySelector('input').checked = true;
    });
  });

  // Phone input
  document.getElementById('auth-phone').addEventListener('input', (e) => {
    const btn = document.getElementById('auth-send-otp');
    btn.disabled = e.target.value.length < 10;
  });
}

// ── Search Suggestions ──
function showSuggestions(term) {
  state.searchTerm = term;
  loadProducts(); // load main grid
  
  // Also show simple suggestions dropdown
  const sugg = document.getElementById('search-suggestions');
  const matches = state.products.filter(p => p.name.toLowerCase().includes(term.toLowerCase())).slice(0, 5);
  
  if (matches.length > 0) {
    sugg.innerHTML = matches.map(m => `
      <div class="sugg-item" onclick="addToCart('${m.id}'); document.getElementById('search-suggestions').classList.add('hidden');">
        <span class="sugg-icon">${m.image}</span>
        <span class="sugg-name">${m.name}</span>
        <span style="font-size:12px;font-weight:700;color:var(--accent)">Add +</span>
      </div>
    `).join('');
    sugg.classList.remove('hidden');
  } else {
    sugg.classList.add('hidden');
  }
}

// ── Skeletons ──
function showProductSkeletons() {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = Array.from({ length: 8 }, () => `
    <div class="skeleton-card">
      <div class="skeleton" style="height:140px"></div>
      <div style="padding:14px">
        <div class="skeleton" style="height:14px; width:70%; margin-bottom:8px"></div>
        <div class="skeleton" style="height:12px; width:40%; margin-bottom:16px"></div>
        <div class="skeleton" style="height:36px; width:100%"></div>
      </div>
    </div>
  `).join('');
}

// ── Categories ──
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
function filterByCategory(c) { 
  state.currentCategory = c; 
  renderCategories(); 
  renderFilterTabs(); 
  loadProducts(); 
  document.getElementById('products-section').scrollIntoView({ behavior: 'smooth', block: 'start' }); 
}
function clearFilters() { 
  state.currentCategory = 'All'; 
  state.searchTerm = ''; 
  document.getElementById('search-input').value = ''; 
  renderCategories(); 
  renderFilterTabs(); 
  loadProducts(); 
}

// ── Products & Deals ──
async function loadProducts() {
  let url = '/api/products';
  const p = new URLSearchParams();
  if (state.currentCategory && state.currentCategory !== 'All') p.set('category', state.currentCategory);
  if (state.searchTerm) p.set('search', state.searchTerm);
  if (p.toString()) url += '?' + p.toString();
  
  const res = await apiGet(url);
  if (res.success) {
    state.products = res.data;
    renderProducts();
    if (state.currentCategory === 'All' && !state.searchTerm) renderDeals(res.data);
  }
}

function renderDeals(allProd) {
  const deals = allProd.filter(p => p.discount > 0);
  const grid = document.getElementById('deals-grid');
  document.getElementById('deals-section').classList.toggle('hidden', deals.length === 0);
  
  if (deals.length > 0) grid.innerHTML = deals.map(p => generateProductHTML(p, true)).join('');
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  const empty = document.getElementById('empty-products');
  const title = document.getElementById('products-title');

  title.textContent = state.searchTerm ? `Search: "${state.searchTerm}"` : state.currentCategory !== 'All' ? state.currentCategory : 'Daily Essentials';

  if (state.products.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = state.products.map(p => generateProductHTML(p)).join('');
}

function generateProductHTML(p, isDeal = false) {
  const ep = p.discount > 0 ? (p.price * (1 - p.discount / 100)) : p.price;
  const ci = getCartItem(p.id);
  const qty = ci ? ci.quantity : 0;
  
  return `
    <div class="product-card reveal" style="min-width: ${isDeal ? '220px' : 'auto'}">
      <div class="product-image-area">
        ${p.discount > 0 ? `<span class="product-badge badge-discount">-${p.discount}% OFF</span>` : ''}
        ${p.imageUrl ? `<img src="${p.imageUrl}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">` : ''}
        <span class="product-emoji-fallback" style="${p.imageUrl ? 'display:none' : ''}">${p.image}</span>
      </div>
      <div class="product-info">
        <h3 class="product-name">${p.name}</h3>
        <span class="product-unit">${p.unit}</span>
        <div class="product-meta">
          <div class="product-price-group">
            <span class="product-price">$${ep.toFixed(2)}</span>
            ${p.discount > 0 ? `<span class="product-original-price">$${p.price.toFixed(2)}</span>` : ''}
          </div>
        </div>
        <div class="product-actions" id="action-${p.id}">
          ${qty > 0 ? `
            <div class="quantity-control">
              <button class="qty-btn" onclick="updateCartQty('${p.id}',${qty - 1})">−</button>
              <span class="qty-value">${qty}</span>
              <button class="qty-btn" onclick="updateCartQty('${p.id}',${qty + 1})">+</button>
            </div>
          ` : `
            <button class="add-to-cart-btn" onclick="addToCart('${p.id}')">Add to Cart</button>
          `}
        </div>
      </div>
    </div>`;
}

function getCartItem(pid) { return state.cart?.items?.find(i => i.productId === pid) || null; }

// ── Cart & Floating Bar ──
async function loadCart() {
  const res = await apiGet('/api/cart');
  if (res.success) {
    state.cart = res.data;
    if (!state.cartId && res.data.id) { state.cartId = res.data.id; localStorage.setItem('freshcart_cart_id', res.data.id); }
    updateCartUI();
  }
}

async function addToCart(pid) {
  // Optimistic UI
  navigator.vibrate?.(50); // Feedback
  let itemEl = document.querySelectorAll(`#action-${pid}`);
  itemEl.forEach(el => {
    el.innerHTML = `
      <div class="quantity-control">
        <button class="qty-btn" onclick="updateCartQty('${pid}',0)">−</button>
        <div class="spinner" style="width:16px;height:16px;margin:auto"></div>
        <button class="qty-btn" onclick="updateCartQty('${pid}',2)">+</button>
      </div>`;
  });

  const res = await apiPost('/api/cart/items', { productId: pid, quantity: 1 });
  if (res.success) {
    state.cart = res.data;
    if (!state.cartId) { state.cartId = res.data.id; localStorage.setItem('freshcart_cart_id', res.data.id); }
    updateCartUI();
  }
}

async function updateCartQty(pid, qty) {
  navigator.vibrate?.(10);
  if (qty <= 0) return removeFromCart(pid);
  const res = await apiPut(`/api/cart/items/${pid}`, { quantity: qty });
  if (res.success) { state.cart = res.data; updateCartUI(); }
}

async function removeFromCart(pid) {
  const res = await apiDelete(`/api/cart/items/${pid}`);
  if (res.success) { state.cart = res.data; updateCartUI(); showToast('Item removed', 'info'); }
}

function toggleCart() {
  const s = document.getElementById('cart-sidebar'), o = document.getElementById('cart-overlay');
  const isOpen = s.classList.contains('open');
  s.classList.toggle('open'); 
  o.classList.toggle('open');
  document.body.style.overflow = isOpen ? '' : 'hidden';
}

function updateCartUI() {
  renderCartSidebar();
  renderProducts(); // Re-render to update + - buttons
  renderDeals(state.products);
  
  const ct = state.cart ? state.cart.itemCount : 0;
  
  // Navbar badge
  const badge = document.getElementById('cart-badge');
  badge.textContent = ct; 
  badge.classList.toggle('visible', ct > 0);
  
  // Sidebar count
  document.getElementById('cart-sidebar-count').textContent = `(${ct} items)`;

  // Floating Bar
  const fb = document.getElementById('floating-cart-bar');
  if (ct > 0 && state.currentView !== 'checkout' && state.currentView !== 'confirmation') {
    fb.classList.remove('hidden');
    setTimeout(() => fb.classList.add('visible'), 10);
    document.getElementById('fc-count').textContent = `${ct} item${ct > 1 ? 's' : ''}`;
    document.getElementById('fc-total').textContent = `$${state.cart.total.toFixed(2)}`;
  } else {
    fb.classList.remove('visible');
    setTimeout(() => fb.classList.add('hidden'), 400);
  }
}

function renderCartSidebar() {
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');
  const footerEl = document.getElementById('cart-footer');
  const billEl = document.getElementById('cart-bill-details');

  if (!state.cart || state.cart.items.length === 0) {
    itemsEl.innerHTML = ''; 
    itemsEl.classList.add('hidden'); 
    emptyEl.classList.remove('hidden'); 
    footerEl.classList.add('hidden'); 
    return;
  }
  emptyEl.classList.add('hidden'); 
  itemsEl.classList.remove('hidden'); 
  footerEl.classList.remove('hidden');

  itemsEl.innerHTML = state.cart.items.map(item => `
    <div class="cart-item">
      <div class="cart-item-photo">
        ${item.product.imageUrl ? `<img src="${item.product.imageUrl}" alt="${item.product.name}" loading="lazy">` : item.product.image}
      </div>
      <div class="cart-item-details">
        <div class="cart-item-title">${item.product.name}</div>
        <div class="cart-item-unit">${item.product.unit}</div>
        <div class="cart-item-bottom">
          <div class="cart-item-price">$${item.itemTotal.toFixed(2)}</div>
          <div class="cart-qty-inline">
            <button class="cart-qty-btn" onclick="updateCartQty('${item.productId}',${item.quantity - 1})">−</button>
            <span class="cart-qty-value">${item.quantity}</span>
            <button class="cart-qty-btn" onclick="updateCartQty('${item.productId}',${item.quantity + 1})">+</button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  billEl.innerHTML = `
    <div class="bill-row"><span>Item Total</span><span>$${state.cart.subtotal.toFixed(2)}</span></div>
    ${state.cart.savings > 0 ? `<div class="bill-row" style="color:var(--success)"><span>Discount</span><span>-$${state.cart.savings.toFixed(2)}</span></div>` : ''}
    <div class="bill-row"><span>Delivery Fee</span><span style="color:var(--success)">FREE</span></div>
    <div class="bill-row total"><span>Grand Total</span><span>$${state.cart.total.toFixed(2)}</span></div>
  `;
}

// ── Authentication Flow ──
function handleAuthClick() {
  if(state.auth.isLoggedIn) {
     navigateTo('orders');
  } else {
     openAuthModal();
  }
}
function updateAuthUI() {
  const btn = document.getElementById('auth-btn-text');
  btn.textContent = state.auth.isLoggedIn ? 'Orders' : 'Login';
  localStorage.setItem('freshcart_auth', JSON.stringify(state.auth));
}
function openAuthModal() {
  document.getElementById('auth-modal').classList.add('open');
  document.getElementById('auth-step-1').classList.remove('hidden');
  document.getElementById('auth-step-2').classList.add('hidden');
  document.getElementById('auth-phone').value = '';
  document.getElementById('auth-phone').focus();
}
function closeAuthModal() {
  document.getElementById('auth-modal').classList.remove('open');
}
function sendOTP() {
  const ph = document.getElementById('auth-phone').value;
  if(ph.length < 10) return;
  state.auth.phone = ph;
  document.getElementById('auth-otp-phone').textContent = '+1 ' + ph.slice(0,3) + '-' + ph.slice(3,6) + '-' + ph.slice(6);
  
  const btn = document.getElementById('auth-send-otp');
  btn.innerHTML = '<div class="spinner"></div>';
  
  setTimeout(() => {
    btn.innerHTML = 'Continue';
    document.getElementById('auth-step-1').classList.add('hidden');
    document.getElementById('auth-step-2').classList.remove('hidden');
    document.getElementById('otp-1').focus();
  }, 800);
}
function moveOtpFocus(input, index) {
  if(input.value.length === 1 && index < 4) {
    document.getElementById('otp-' + (index + 1)).focus();
  }
  if(index === 4 && input.value.length === 1) {
    verifyOTP(); // Auto submit
  }
}
function verifyOTP() {
  const btn = document.getElementById('auth-verify-otp');
  btn.innerHTML = '<div class="spinner"></div>';
  
  setTimeout(() => {
    btn.innerHTML = 'Verify & Proceed';
    state.auth.isLoggedIn = true;
    if(!state.auth.address) openLocationModal(); // Prompt location if empty
    updateAuthUI();
    closeAuthModal();
    showToast('Logged in successfully', 'success');
    
    // Auto continue if in checkout
    if(state.currentView === 'checkout') prepareCheckout();
    
  }, 1000);
}

// ── Location Flow ──
function openLocationModal() {
  document.getElementById('location-modal').classList.add('open');
  document.getElementById('loc-address').value = state.auth.address || '';
  document.getElementById('loc-landmark').value = state.auth.landmark || '';
  document.getElementById('loc-pincode').value = state.auth.pincode || '';
}
function closeLocationModal() {
  document.getElementById('location-modal').classList.remove('open');
}
function saveLocation() {
  const addr = document.getElementById('loc-address').value;
  const pin = document.getElementById('loc-pincode').value;
  if(!addr || !pin) { showToast('Address and pincode needed', 'error'); return; }
  
  state.auth.address = addr;
  state.auth.landmark = document.getElementById('loc-landmark').value;
  state.auth.pincode = pin;
  updateAuthUI();
  updateLocationUI();
  closeLocationModal();
  showToast('Location saved!', 'success');
  if(state.currentView === 'checkout') prepareCheckout();
}
function detectLocation() {
  const btn = document.querySelector('.location-detect-btn');
  btn.innerHTML = '<div class="spinner"></div> Detecting...';
  
  // Fake quick API response to simulate geocoding
  setTimeout(() => {
    btn.innerHTML = 'Auto-detect current location';
    document.getElementById('loc-address').value = '123 Fresh Lane, Tech Park';
    document.getElementById('loc-pincode').value = '90210';
  }, 1200);
}
function updateLocationUI() {
  const addrText = document.getElementById('nav-address-text');
  if(state.auth.address) {
    addrText.textContent = state.auth.address;
  } else {
    addrText.textContent = 'Select Location ▾';
  }
}

// ── Checkout Flow (1-Page) ──
function goToCheckout() {
  if (!state.cart || state.cart.items.length === 0) { showToast('Cart is empty', 'error'); return; }
  
  // Require Auth
  if(!state.auth.isLoggedIn) {
     toggleCart();
     showToast('Please login to checkout', 'info');
     openAuthModal();
     return;
  }
  
  // Require Location
  if(!state.auth.address) {
     toggleCart();
     showToast('Please add delivery location', 'info');
     openLocationModal();
     return;
  }

  toggleCart(); 
  setTimeout(() => { prepareCheckout(); navigateTo('checkout'); }, 300);
}

function prepareCheckout() {
  // Fill Address Block
  const ab = document.getElementById('checkout-address-body');
  ab.innerHTML = `
    <div style="font-weight:700; margin-bottom:4px; font-size:15px">${state.auth.phone}</div>
    <div style="color:var(--text-secondary); font-size:13px">${state.auth.address}</div>
    ${state.auth.landmark ? `<div style="color:var(--text-secondary); font-size:13px">Landmark: ${state.auth.landmark}</div>` : ''}
    <div style="color:var(--text-secondary); font-size:13px">Pincode: ${state.auth.pincode}</div>
  `;

  // Fill Summary
  const sum = document.getElementById('checkout-summary');
  sum.innerHTML = `
    <h3 style="font-size:15px;font-weight:800;border-bottom:1px solid var(--border-color);padding-bottom:12px;margin-bottom:16px">Order Summary</h3>
    <div class="summary-items">
      ${state.cart.items.map(item => `
        <div class="sum-item">
          <span>${item.quantity} × ${item.product.name}</span>
          <span style="font-weight:700; color:var(--text-primary)">$${item.itemTotal.toFixed(2)}</span>
        </div>
      `).join('')}
    </div>
    <div class="sum-item"><span>Subtotal</span><span>$${state.cart.subtotal.toFixed(2)}</span></div>
    ${state.cart.savings > 0 ? `<div class="sum-item" style="color:var(--success)"><span>Savings</span><span>-$${state.cart.savings.toFixed(2)}</span></div>` : ''}
    <div class="sum-item"><span>Delivery</span><span style="color:var(--success)">FREE</span></div>
    <div class="sum-item" style="font-size:15px; font-weight:800; color:var(--text-primary); border-top:1px dashed var(--border-color); padding-top:12px; margin-top:12px;">
      <span>To Pay</span><span>$${state.cart.total.toFixed(2)}</span>
    </div>
    <button class="btn btn-primary btn-block place-order-btn-large" id="confirm-order-btn" onclick="placeOrder()">Place Order • $${state.cart.total.toFixed(2)}</button>
  `;
}

async function placeOrder() {
  const btn = document.getElementById('confirm-order-btn');
  btn.disabled = true; 
  btn.innerHTML = '<div class="spinner"></div> Confirming...';

  // Get selected payment
  const payMethod = document.querySelector('input[name="paymentOption"]:checked').value;

  try {
    const res = await apiPost('/api/orders', { 
      customerName: 'Guest User', 
      customerPhone: state.auth.phone, 
      address: `${state.auth.address}, ${state.auth.landmark}, ${state.auth.pincode}`, 
      paymentMethod: payMethod 
    });

    if (res.success) {
      state.cart = { items: [], subtotal: 0, total: 0, savings: 0, itemCount: 0 };
      updateCartUI(); 
      showConfirmation(res.data);
    } else { 
      showToast('❌ Failed', 'error'); 
    }
  } catch (err) { 
    showToast('❌ Network error', 'error'); 
  }
}

// ── Confirmation ──
function showConfirmation(order) {
  navigateTo('confirmation');
  
  // Fast 3D-like generic illustration
  const imgUrl = "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=400&h=300&fit=crop&q=80"; 

  document.getElementById('confirmation-content').innerHTML = `
    <img src="${imgUrl}" alt="Success" class="success-image" style="border-radius:30px; border:2px solid var(--accent); box-shadow:0 10px 40px var(--accent-glow)">
    <h2>Order Placed!</h2>
    <p style="color:var(--text-secondary); margin-bottom:24px">Arriving in approx 10 - 15 minutes.</p>
    
    <div style="background:var(--bg-card); border-radius:var(--radius-lg); padding:20px; text-align:left; width:100%; max-width:400px; margin:0 auto; border:1px solid var(--border-color);">
      <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:4px">ORDER ID</div>
      <div style="font-family:monospace; font-size:14px; margin-bottom:16px">#${order.id.slice(0,8).toUpperCase()}</div>
      
      <div style="font-size:12px; color:var(--text-tertiary); margin-bottom:4px">AMOUNT PAID</div>
      <div style="font-size:18px; font-weight:800; color:var(--accent); margin-bottom:16px">$${order.total.toFixed(2)} via ${order.paymentMethod.toUpperCase()}</div>
      
      <div style="display:flex; gap:12px">
        <button class="btn btn-ghost" style="flex:1; justify-content:center" onclick="navigateTo('home')">Home</button>
        <button class="btn btn-primary" style="flex:1; justify-content:center" onclick="navigateTo('orders')">Track</button>
      </div>
    </div>
  `;
}

// ── Orders ──
async function loadOrders() { const res = await apiGet('/api/orders'); if (res.success) renderOrders(res.data); }

function renderOrders(orders) {
  const listEl = document.getElementById('orders-list'), emptyEl = document.getElementById('empty-orders');
  if (orders.length === 0) { listEl.innerHTML = ''; emptyEl.classList.remove('hidden'); return; }
  emptyEl.classList.add('hidden');
  listEl.innerHTML = orders.map(order => {
    return `
      <div class="order-card">
        <div class="order-header">
          <div class="order-id">#${order.id.slice(0, 8).toUpperCase()}</div>
          <span class="order-status">Confirmed</span>
        </div>
        <div class="order-items-preview">
          ${order.items.map(it => `<span class="order-item-chip">${it.image} ${it.name} ×${it.quantity}</span>`).join('')}
        </div>
        <div style="display:flex; justify-content:space-between; align-items:flex-end; border-top:1px solid var(--border-color); padding-top:16px; margin-top:16px">
          <div>
            <div style="font-size:11px; color:var(--text-tertiary)">Total</div>
            <div style="font-size:16px; font-weight:800">$${order.total.toFixed(2)}</div>
          </div>
          <button class="btn btn-sm btn-ghost">View Details</button>
        </div>
      </div>`;
  }).join('');
}

// ── Navigation ──
function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(`${view}-view`).classList.add('active');
  state.currentView = view;
  window.scrollTo({ top: 0, behavior: 'smooth' });
  
  if (view === 'orders') {
    if(!state.auth.isLoggedIn) {
       showToast('Please login first', 'info');
       openAuthModal();
       navigateTo('home');
       return;
    }
    loadOrders();
  }
  
  updateCartUI(); // Reset Floating Cart Bar visibility based on view
}

// ── Toasts ──
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span style="font-size:16px">${type==='success'?'✅':type==='error'?'❌':'ℹ️'}</span><span style="font-size:13px;font-weight:600">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.classList.add('removing'); setTimeout(() => toast.remove(), 200); }, 2500);
}
