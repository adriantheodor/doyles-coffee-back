const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const inventoryItemSchema = new mongoose.Schema(
  {
    // Reference to the product this inventory item is for
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    
    // Unique identifier for the physical item (SKU-based)
    itemCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    
    // QR code data (typically a URL or unique identifier)
    qrCode: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    
    // Status tracking
    status: {
      type: String,
      enum: ['available', 'sold', 'damaged', 'returned', 'in-transit'],
      default: 'available',
    },
    
    // Location/assignment information
    location: {
      type: String,
      default: 'warehouse',
    },
    
    // Assignment to customer order if applicable
    assignedToOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    
    // Batch/lot number for tracking purposes
    batchNumber: {
      type: String,
      default: null,
    },
    
    // Manufacturing/expiry dates if applicable
    manufacturingDate: {
      type: Date,
      default: null,
    },
    
    expiryDate: {
      type: Date,
      default: null,
    },
    
    // Notes about this specific item
    notes: {
      type: String,
      default: '',
    },
    
    // Scan history
    scanHistory: [
      {
        scannedAt: {
          type: Date,
          default: Date.now,
        },
        scannedBy: {
          type: String,
          default: 'system',
        },
        action: {
          type: String,
          enum: ['created', 'scanned', 'sold', 'returned', 'damaged', 'moved'],
          default: 'scanned',
        },
        notes: String,
      },
    ],
  },
  { timestamps: true }
);

// Index for faster lookups
inventoryItemSchema.index({ productId: 1, status: 1 });
inventoryItemSchema.index({ qrCode: 1 });
inventoryItemSchema.index({ itemCode: 1 });
inventoryItemSchema.index({ batchNumber: 1 });

module.exports = mongoose.model('InventoryItem', inventoryItemSchema);
