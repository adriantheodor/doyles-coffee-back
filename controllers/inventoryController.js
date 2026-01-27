const InventoryItem = require('../models/InventoryItem');
const Product = require('../models/Product');
const { v4: uuidv4 } = require('uuid');
const { generateQRCodeDataURL, generateQRCodeURL, generateBatchQRCodes } = require('../utils/qrCodeGenerator');
const { logAudit } = require('../utils/auditLogger');

/**
 * Create a new inventory item with QR code
 */
exports.createInventoryItem = async (req, res) => {
  try {
    const { productId, itemCode, batchNumber, manufacturingDate, expiryDate, notes } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    if (!itemCode || typeof itemCode !== 'string' || itemCode.trim().length === 0) {
      return res.status(400).json({ message: 'Item code is required and must be a non-empty string' });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if item code already exists
    const existingItem = await InventoryItem.findOne({ itemCode: itemCode.trim() });
    if (existingItem) {
      return res.status(400).json({ message: 'Item code already exists' });
    }

    // Generate QR code URL
    const baseUrl = process.env.API_URL || req.protocol + '://' + req.get('host');
    const qrCodeURL = generateQRCodeURL(itemCode.trim(), baseUrl);

    // Create inventory item
    const inventoryItem = new InventoryItem({
      productId,
      itemCode: itemCode.trim(),
      qrCode: qrCodeURL,
      batchNumber: batchNumber || null,
      manufacturingDate: manufacturingDate || null,
      expiryDate: expiryDate || null,
      notes: notes || '',
    });

    await inventoryItem.save();

    // Log audit
    await logAudit({
      action: 'CREATE_INVENTORY_ITEM',
      userId: req.user?.id || 'system',
      resourceType: 'InventoryItem',
      resourceId: inventoryItem._id,
      changes: { itemCode: inventoryItem.itemCode, productId: inventoryItem.productId },
      ipAddress: req.ip,
    });

    // Generate QR code image
    const qrCodeDataURL = await generateQRCodeDataURL(qrCodeURL);

    res.status(201).json({
      ...inventoryItem.toObject(),
      qrCodeDataURL,
    });
  } catch (err) {
    res.status(400).json({ message: 'Error creating inventory item', error: err.message });
  }
};

/**
 * Create multiple inventory items with QR codes
 */
exports.createBatchInventoryItems = async (req, res) => {
  try {
    const { productId, itemCodes, batchNumber, manufacturingDate, expiryDate } = req.body;

    // Validation
    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    if (!Array.isArray(itemCodes) || itemCodes.length === 0) {
      return res.status(400).json({ message: 'Item codes array is required and must not be empty' });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check for duplicates
    const baseUrl = process.env.API_URL || req.protocol + '://' + req.get('host');
    const createdItems = [];
    const errors = [];

    for (const itemCode of itemCodes) {
      try {
        // Check if item code already exists
        const existingItem = await InventoryItem.findOne({ itemCode: itemCode.trim() });
        if (existingItem) {
          errors.push({ itemCode, error: 'Item code already exists' });
          continue;
        }

        const qrCodeURL = generateQRCodeURL(itemCode.trim(), baseUrl);

        const inventoryItem = new InventoryItem({
          productId,
          itemCode: itemCode.trim(),
          qrCode: qrCodeURL,
          batchNumber: batchNumber || null,
          manufacturingDate: manufacturingDate || null,
          expiryDate: expiryDate || null,
        });

        await inventoryItem.save();
        createdItems.push(inventoryItem);

        // Log audit
        await logAudit({
          action: 'CREATE_INVENTORY_ITEM',
          userId: req.user?.id || 'system',
          resourceType: 'InventoryItem',
          resourceId: inventoryItem._id,
          changes: { itemCode: inventoryItem.itemCode },
          ipAddress: req.ip,
        });
      } catch (err) {
        errors.push({ itemCode, error: err.message });
      }
    }

    res.status(201).json({
      created: createdItems.length,
      items: createdItems,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    res.status(400).json({ message: 'Error creating batch inventory items', error: err.message });
  }
};

/**
 * Scan QR code and retrieve item information
 */
exports.scanInventoryItem = async (req, res) => {
  try {
    const { itemCode } = req.params;

    if (!itemCode || typeof itemCode !== 'string' || itemCode.trim().length === 0) {
      return res.status(400).json({ message: 'Item code is required' });
    }

    const inventoryItem = await InventoryItem.findOne({ itemCode: itemCode.trim() })
      .populate('productId', 'name price description stock')
      .populate('assignedToOrder', 'orderNumber status');

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Add to scan history
    inventoryItem.scanHistory.push({
      scannedAt: new Date(),
      scannedBy: req.user?.id || 'anonymous',
      action: 'scanned',
      notes: req.body?.notes || null,
    });

    await inventoryItem.save();

    // Log audit
    await logAudit({
      action: 'SCAN_INVENTORY_ITEM',
      userId: req.user?.id || 'anonymous',
      resourceType: 'InventoryItem',
      resourceId: inventoryItem._id,
      details: { itemCode: itemCode },
      ipAddress: req.ip,
    });

    res.json(inventoryItem);
  } catch (err) {
    res.status(500).json({ message: 'Error scanning item', error: err.message });
  }
};

/**
 * Get inventory item by item code
 */
exports.getInventoryItemByCode = async (req, res) => {
  try {
    const { itemCode } = req.params;

    const inventoryItem = await InventoryItem.findOne({ itemCode: itemCode.trim() })
      .populate('productId')
      .populate('assignedToOrder');

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    res.json(inventoryItem);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving item', error: err.message });
  }
};

/**
 * Get QR code for an inventory item
 */
exports.getQRCode = async (req, res) => {
  try {
    const { itemCode } = req.params;
    const { format } = req.query; // 'url' or 'image' (default)

    const inventoryItem = await InventoryItem.findOne({ itemCode: itemCode.trim() });

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    if (format === 'url') {
      return res.json({ qrCode: inventoryItem.qrCode });
    }

    // Generate image format
    const qrCodeDataURL = await generateQRCodeDataURL(inventoryItem.qrCode);
    res.json({ qrCode: qrCodeDataURL });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving QR code', error: err.message });
  }
};

/**
 * Update inventory item status
 */
exports.updateInventoryItemStatus = async (req, res) => {
  try {
    const { itemCode } = req.params;
    const { status, location, notes } = req.body;

    if (!itemCode || typeof itemCode !== 'string' || itemCode.trim().length === 0) {
      return res.status(400).json({ message: 'Item code is required' });
    }

    if (!status || !['available', 'sold', 'damaged', 'returned', 'in-transit'].includes(status)) {
      return res.status(400).json({ message: 'Valid status is required' });
    }

    const inventoryItem = await InventoryItem.findOne({ itemCode: itemCode.trim() });

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const oldStatus = inventoryItem.status;
    inventoryItem.status = status;

    if (location) {
      inventoryItem.location = location;
    }

    // Add to scan history
    inventoryItem.scanHistory.push({
      scannedAt: new Date(),
      scannedBy: req.user?.id || 'system',
      action: status,
      notes: notes || `Status changed from ${oldStatus} to ${status}`,
    });

    await inventoryItem.save();

    // Log audit
    await logAudit({
      action: 'UPDATE_INVENTORY_ITEM_STATUS',
      userId: req.user?.id || 'system',
      resourceType: 'InventoryItem',
      resourceId: inventoryItem._id,
      changes: { status: { from: oldStatus, to: status } },
      ipAddress: req.ip,
    });

    res.json(inventoryItem);
  } catch (err) {
    res.status(400).json({ message: 'Error updating inventory item', error: err.message });
  }
};

/**
 * Get all inventory items for a product
 */
exports.getProductInventory = async (req, res) => {
  try {
    const { productId } = req.params;
    const { status } = req.query;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    let query = { productId };

    if (status) {
      query.status = status;
    }

    const items = await InventoryItem.find(query)
      .populate('productId', 'name price')
      .sort({ createdAt: -1 });

    res.json(items);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving inventory', error: err.message });
  }
};

/**
 * Get inventory statistics for a product
 */
exports.getInventoryStats = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: 'Product ID is required' });
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const stats = await InventoryItem.aggregate([
      { $match: { productId: product._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    const statsByStatus = {
      available: 0,
      sold: 0,
      damaged: 0,
      returned: 0,
      'in-transit': 0,
      total: 0,
    };

    stats.forEach((stat) => {
      statsByStatus[stat._id] = stat.count;
      statsByStatus.total += stat.count;
    });

    res.json(statsByStatus);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving inventory stats', error: err.message });
  }
};

/**
 * Delete inventory item
 */
exports.deleteInventoryItem = async (req, res) => {
  try {
    const { itemCode } = req.params;

    if (!itemCode || typeof itemCode !== 'string' || itemCode.trim().length === 0) {
      return res.status(400).json({ message: 'Item code is required' });
    }

    const inventoryItem = await InventoryItem.findOneAndDelete({ itemCode: itemCode.trim() });

    if (!inventoryItem) {
      return res.status(404).json({ message: 'Item not found' });
    }

    // Log audit
    await logAudit({
      action: 'DELETE_INVENTORY_ITEM',
      userId: req.user?.id || 'system',
      resourceType: 'InventoryItem',
      resourceId: inventoryItem._id,
      details: { itemCode: inventoryItem.itemCode },
      ipAddress: req.ip,
    });

    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting item', error: err.message });
  }
};
