const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  stock: {
    type: Number,
    required: true,
    default: 0
  },
  // QR code tracking enabled for this product
  qrTrackingEnabled: {
    type: Boolean,
    default: false,
  },
  // SKU for QR code generation
  sku: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
