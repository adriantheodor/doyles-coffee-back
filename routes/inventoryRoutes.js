// routes/inventoryRoutes.js
const express = require('express');
const router = express.Router();
const {
  createInventoryItem,
  createBatchInventoryItems,
  scanInventoryItem,
  getInventoryItemByCode,
  getQRCode,
  updateInventoryItemStatus,
  getProductInventory,
  getInventoryStats,
  deleteInventoryItem,
} = require('../controllers/inventoryController');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { createUpdateLimiter } = require('../middleware/rateLimiter');

// Public routes (accessible to all authenticated users)

/**
 * Scan QR code and retrieve item information
 * GET /api/inventory/scan/:itemCode
 */
router.get('/scan/:itemCode', authenticateToken, scanInventoryItem);

/**
 * Get inventory item by item code
 * GET /api/inventory/item/:itemCode
 */
router.get('/item/:itemCode', authenticateToken, getInventoryItemByCode);

/**
 * Get QR code for an item (as URL or image)
 * GET /api/inventory/qr/:itemCode?format=url|image
 */
router.get('/qr/:itemCode', authenticateToken, getQRCode);

/**
 * Get all inventory items for a product
 * GET /api/inventory/product/:productId?status=available|sold|damaged|returned|in-transit
 */
router.get('/product/:productId', authenticateToken, getProductInventory);

/**
 * Get inventory statistics for a product
 * GET /api/inventory/stats/:productId
 */
router.get('/stats/:productId', authenticateToken, getInventoryStats);

// Admin-only routes

/**
 * Create a new inventory item with QR code
 * POST /api/inventory/item
 * Body: { productId, itemCode, batchNumber?, manufacturingDate?, expiryDate?, notes? }
 */
router.post(
  '/item',
  authenticateToken,
  requireRole('admin'),
  createUpdateLimiter,
  createInventoryItem
);

/**
 * Create multiple inventory items with QR codes
 * POST /api/inventory/batch
 * Body: { productId, itemCodes: string[], batchNumber?, manufacturingDate?, expiryDate? }
 */
router.post(
  '/batch',
  authenticateToken,
  requireRole('admin'),
  createUpdateLimiter,
  createBatchInventoryItems
);

/**
 * Update inventory item status
 * PUT /api/inventory/item/:itemCode/status
 * Body: { status: 'available'|'sold'|'damaged'|'returned'|'in-transit', location?, notes? }
 */
router.put(
  '/item/:itemCode/status',
  authenticateToken,
  requireRole('admin'),
  updateInventoryItemStatus
);

/**
 * Delete inventory item
 * DELETE /api/inventory/item/:itemCode
 */
router.delete(
  '/item/:itemCode',
  authenticateToken,
  requireRole('admin'),
  deleteInventoryItem
);

module.exports = router;
