# QR Code System - Quick Start Guide

## Setup

### 1. Install Dependencies
Dependencies already added:
- `qrcode` - For generating QR codes
- `uuid` - For unique identifiers

### 2. Models Created
- **InventoryItem** - Tracks individual physical items with QR codes

### 3. API Endpoints

#### Create an Inventory Item
```bash
curl -X POST http://localhost:4000/api/inventory/item \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "itemCode": "SKU-001-2024",
    "batchNumber": "BATCH-001",
    "manufacturingDate": "2024-01-15",
    "expiryDate": "2026-01-15",
    "notes": "Premium arabica beans"
  }'
```

#### Scan a QR Code
```bash
curl -X GET http://localhost:4000/api/inventory/scan/SKU-001-2024 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Create Multiple Items (Batch)
```bash
curl -X POST http://localhost:4000/api/inventory/batch \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PRODUCT_ID_HERE",
    "itemCodes": ["SKU-001", "SKU-002", "SKU-003"],
    "batchNumber": "BATCH-001"
  }'
```

#### Get QR Code Image
```bash
curl -X GET "http://localhost:4000/api/inventory/qr/SKU-001-2024?format=image" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Update Item Status
```bash
curl -X PUT http://localhost:4000/api/inventory/item/SKU-001-2024/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sold",
    "location": "delivered",
    "notes": "Delivered to Order #123"
  }'
```

#### Get Inventory Stats
```bash
curl -X GET http://localhost:4000/api/inventory/stats/PRODUCT_ID_HERE \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Key Features

✅ **Unique QR Codes** - Each item gets a scannable QR code URL
✅ **Batch Creation** - Create multiple items at once
✅ **Status Tracking** - Track item status (available, sold, damaged, returned, in-transit)
✅ **Scan History** - Complete audit trail of all item movements
✅ **Product Info** - Links items to products for detailed information
✅ **Manufacturing Dates** - Track batch numbers and expiry dates
✅ **Location Tracking** - Know where each item is physically located
✅ **Admin Controls** - Only admins can create/modify inventory

## Status Values

- `available` - In stock at warehouse
- `sold` - Sold and assigned to order
- `damaged` - Item is damaged
- `returned` - Returned by customer
- `in-transit` - On the way to customer

## Next Steps

1. **Test with your products:**
   - Get a product ID from your database
   - Create inventory items for that product
   - Scan the QR codes to retrieve information

2. **Print QR Codes:**
   - Use the QR code image format to print labels
   - Attach to physical items in your warehouse

3. **Warehouse Integration:**
   - Train staff on QR scanning process
   - Use mobile app or web interface to scan
   - Track inventory movements in real-time

4. **Frontend Dashboard:**
   - Create a dashboard to view inventory stats
   - Show real-time inventory status
   - Track items by batch or location

## Workflow

```
Receiving → Create Inventory Items → Print QR Codes → Attach Labels
    ↓
Warehouse → Scan Items → Update Status → Track Location
    ↓
Order Fulfillment → Pick Items → Scan & Link to Order → Ship
    ↓
Customer Returns → Scan Item → Update Status to "returned" → Store
```

## File Structure

```
models/
  └── InventoryItem.js          # New model for inventory tracking

controllers/
  └── inventoryController.js    # New controller with all operations

routes/
  └── inventoryRoutes.js        # Updated with QR code endpoints

utils/
  └── qrCodeGenerator.js        # Utility functions for QR codes

docs/
  └── QR_CODE_SYSTEM.md         # Full documentation
```

## Environment Variables

```env
API_URL=https://api.doylesbreakroomservices.com
# Used in QR code generation to create scannable URLs
```

## Authentication

All endpoints require JWT authentication. Include the token in Authorization header:
```
Authorization: Bearer eyJhbGc...
```

## Response Examples

### Success Response (200 OK)
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "productId": "507f1f77bcf86cd799439011",
  "itemCode": "SKU-001-2024",
  "qrCode": "http://localhost:4000/api/inventory/scan/SKU-001-2024",
  "status": "available",
  "location": "warehouse",
  "scanHistory": []
}
```

### Error Response (400 Bad Request)
```json
{
  "message": "Error message",
  "error": "Detailed error info"
}
```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "Item code already exists" | Duplicate item code | Use unique SKUs for each physical item |
| "Product not found" | Invalid product ID | Verify product ID exists in database |
| "Only admins can create items" | Not authorized | Use admin JWT token |
| "Item not found" | Invalid item code | Check spelling and format of item code |

## Testing the System

### 1. Create a Test Product
First, create a product if you don't have one:
```bash
curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Product",
    "price": 9.99,
    "stock": 100,
    "description": "For testing QR codes"
  }'
```

Note the returned `_id`.

### 2. Create Inventory Item
```bash
curl -X POST http://localhost:4000/api/inventory/item \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "PASTE_PRODUCT_ID_HERE",
    "itemCode": "TEST-SKU-001"
  }'
```

### 3. Scan the Item
```bash
curl -X GET http://localhost:4000/api/inventory/scan/TEST-SKU-001 \
  -H "Authorization: Bearer TOKEN"
```

You should see the item details with product information!

## Audit Logging

All operations are automatically logged:
- Item creation
- QR code scans
- Status updates
- Deletions

Check AuditLog collection for complete history.
