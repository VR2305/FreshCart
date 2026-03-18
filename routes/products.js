const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET /api/products/categories — must be before /:id
router.get('/categories', (req, res) => {
  const categories = Product.getCategories();
  res.json({ success: true, data: categories });
});

// GET /api/products/featured
router.get('/featured', (req, res) => {
  const products = Product.getFeatured();
  res.json({ success: true, data: products });
});

// GET /api/products/deals
router.get('/deals', (req, res) => {
  const products = Product.getDiscounted();
  res.json({ success: true, data: products });
});

// GET /api/products
router.get('/', (req, res) => {
  const { category, search } = req.query;
  const products = Product.getAll(category, search);
  res.json({ success: true, data: products, count: products.length });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const product = Product.getById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

module.exports = router;
