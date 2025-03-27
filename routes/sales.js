const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// Get all sales
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate({
        path: 'items.product',
        select: 'name price'
      })
      .sort({ createdAt: -1 });
    res.json(sales);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create a new sale
router.post('/', async (req, res) => {
  const session = await Sale.startSession();
  session.startTransaction();

  try {
    // Create the sale
    const sale = new Sale({
      items: req.body.items,
      total: req.body.total,
      paymentMethod: req.body.paymentMethod
    });

    // Update product stock
    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        throw new Error(`Product with ID ${item.product} not found`);
      }
      
      if (product.stock < item.quantity) {
        throw new Error(`Not enough stock for product: ${product.name}`);
      }
      
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    const newSale = await sale.save();
    
    await session.commitTransaction();
    session.endSession();
    
    res.status(201).json(newSale);
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: err.message });
  }
});

// Get a specific sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate({
        path: 'items.product',
        select: 'name price'
      });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;