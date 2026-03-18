const { v4: uuidv4 } = require('uuid');

class Cart {
  constructor() {
    this.carts = new Map();
  }

  getOrCreate(cartId) {
    if (!cartId || !this.carts.has(cartId)) {
      const id = cartId || uuidv4();
      this.carts.set(id, {
        id,
        items: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return this.carts.get(id);
    }
    return this.carts.get(cartId);
  }

  get(cartId) {
    return this.carts.get(cartId) || null;
  }

  addItem(cartId, productId, quantity = 1) {
    const cart = this.getOrCreate(cartId);
    const existing = cart.items.find(item => item.productId === productId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ productId, quantity });
    }
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  updateItem(cartId, productId, quantity) {
    const cart = this.get(cartId);
    if (!cart) return null;
    const item = cart.items.find(i => i.productId === productId);
    if (!item) return null;
    if (quantity <= 0) {
      cart.items = cart.items.filter(i => i.productId !== productId);
    } else {
      item.quantity = quantity;
    }
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  removeItem(cartId, productId) {
    const cart = this.get(cartId);
    if (!cart) return null;
    cart.items = cart.items.filter(i => i.productId !== productId);
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  clear(cartId) {
    const cart = this.get(cartId);
    if (!cart) return null;
    cart.items = [];
    cart.updatedAt = new Date().toISOString();
    return cart;
  }

  getItemCount(cartId) {
    const cart = this.get(cartId);
    if (!cart) return 0;
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

module.exports = new Cart();
