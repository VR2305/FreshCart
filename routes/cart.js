const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Helper: enrich cart items with product details
function enrichCart(cart) {
  if (!cart) return null;
  const enrichedItems = cart.items.map(item => {
    const product = Product.getById(item.productId);
    if (!product) return null;
    const effectivePrice = product.discount > 0 
      ? product.price * (1 - product.discount / 100) 
      : product.price;
    return {
      ...item,
      product,
      effectivePrice: Math.round(effectivePrice * 100) / 100,
      itemTotal: Math.round(effectivePrice * item.quantity * 100) / 100
    };
  }).filter(Boolean);

  const subtotal = enrichedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const total = enrichedItems.reduce((sum, item) => sum + item.itemTotal, 0);

  return {
    ...cart,
    items: enrichedItems,
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(total * 100) / 100,
    savings: Math.round((subtotal - total) * 100) / 100,
    itemCount: enrichedItems.reduce((sum, item) => sum + item.quantity, 0)
  };
}

// GET /api/cart
router.get('/', (req, res) => {
  const cartId = req.headers['x-cart-id'];
  const cart = Cart.getOrCreate(cartId);
  res.json({ success: true, data: enrichCart(cart) });
});

// POST /api/cart/items
router.post('/items', (req, res) => {
  const cartId = req.headers['x-cart-id'];
  const { productId, quantity = 1 } = req.body;
  if (!productId) {
    return res.status(400).json({ success: false, error: 'productId is required' });
  }
  const product = Product.getById(productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  const cart = Cart.addItem(cartId, productId, quantity);
  res.json({ success: true, data: enrichCart(cart) });
});

// PUT /api/cart/items/:productId
router.put('/items/:productId', (req, res) => {
  const cartId = req.headers['x-cart-id'];
  const { quantity } = req.body;
  if (quantity === undefined) {
    return res.status(400).json({ success: false, error: 'quantity is required' });
  }
  const cart = Cart.updateItem(cartId, req.params.productId, quantity);
  if (!cart) {
    return res.status(404).json({ success: false, error: 'Cart or item not found' });
  }
  res.json({ success: true, data: enrichCart(cart) });
});

// DELETE /api/cart/items/:productId
router.delete('/items/:productId', (req, res) => {
  const cartId = req.headers['x-cart-id'];
  const cart = Cart.removeItem(cartId, req.params.productId);
  if (!cart) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }
  res.json({ success: true, data: enrichCart(cart) });
});

// DELETE /api/cart
router.delete('/', (req, res) => {
  const cartId = req.headers['x-cart-id'];
  const cart = Cart.clear(cartId);
  if (!cart) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }
  res.json({ success: true, data: enrichCart(cart) });
});

module.exports = router;
