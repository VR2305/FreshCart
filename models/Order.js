const { v4: uuidv4 } = require('uuid');

class Order {
  constructor() {
    this.orders = [];
  }

  create(orderData) {
    const order = {
      id: uuidv4(),
      items: orderData.items,
      total: orderData.total,
      subtotal: orderData.subtotal,
      savings: orderData.savings,
      status: 'confirmed',
      customerName: orderData.customerName,
      customerEmail: orderData.customerEmail,
      customerPhone: orderData.customerPhone || '',
      address: orderData.address,
      paymentMethod: orderData.paymentMethod || 'cash',
      createdAt: new Date().toISOString()
    };
    this.orders.push(order);
    return order;
  }

  getAll() {
    return [...this.orders].reverse();
  }

  getById(id) {
    return this.orders.find(o => o.id === id) || null;
  }

  updateStatus(id, status) {
    const order = this.getById(id);
    if (!order) return null;
    order.status = status;
    return order;
  }
}

module.exports = new Order();
