const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// POST /api/orders
router.post('/', (req, res) => {
  const cartId = req.headers['x-cart-id'];
  const { customerName, customerEmail, customerPhone, address, paymentMethod } = req.body;

  if (!customerName || !customerEmail || !address) {
    return res.status(400).json({ 
      success: false, 
      error: 'customerName, customerEmail, and address are required' 
    });
  }

  const cart = Cart.get(cartId);
  if (!cart || cart.items.length === 0) {
    return res.status(400).json({ success: false, error: 'Cart is empty' });
  }

  // Build order items with current prices
  const orderItems = cart.items.map(item => {
    const product = Product.getById(item.productId);
    if (!product) return null;
    const effectivePrice = product.discount > 0
      ? Math.round(product.price * (1 - product.discount / 100) * 100) / 100
      : product.price;
    return {
      productId: item.productId,
      name: product.name,
      image: product.image,
      quantity: item.quantity,
      originalPrice: product.price,
      price: effectivePrice,
      unit: product.unit,
      itemTotal: Math.round(effectivePrice * item.quantity * 100) / 100
    };
  }).filter(Boolean);

  const subtotal = orderItems.reduce((sum, item) => sum + (item.originalPrice * item.quantity), 0);
  const total = orderItems.reduce((sum, item) => sum + item.itemTotal, 0);
  const savings = Math.round((subtotal - total) * 100) / 100;

  const order = Order.create({
    items: orderItems,
    subtotal: Math.round(subtotal * 100) / 100,
    total: Math.round(total * 100) / 100,
    savings,
    customerName,
    customerEmail,
    customerPhone,
    address,
    paymentMethod
  });

  // Clear the cart after order
  Cart.clear(cartId);

  res.status(201).json({ success: true, data: order });
});

// GET /api/orders
router.get('/', (req, res) => {
  const orders = Order.getAll();
  res.json({ success: true, data: orders });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = Order.getById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

module.exports = router;
