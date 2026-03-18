const fs = require('fs');
const path = require('path');

class Product {
  constructor() {
    this.products = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'data', 'products.json'), 'utf-8')
    );
  }

  getAll(category = null, search = null) {
    let results = [...this.products];
    if (category && category !== 'All') {
      results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const term = search.toLowerCase();
      results = results.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }
    return results;
  }

  getById(id) {
    return this.products.find(p => p.id === id) || null;
  }

  getCategories() {
    const categories = [...new Set(this.products.map(p => p.category))];
    return categories.sort();
  }

  getFeatured() {
    return this.products.filter(p => p.rating >= 4.7).slice(0, 6);
  }

  getDiscounted() {
    return this.products.filter(p => p.discount > 0);
  }
}

module.exports = new Product();
