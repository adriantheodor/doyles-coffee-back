# QR Code Inventory Tracking System

## Overview
This system allows the owner to assign unique QR codes to physical inventory items in the warehouse. Employees can scan these QR codes to retrieve product information, track item status, and manage inventory movements in real-time.

## Features

### 1. **QR Code Generation**
- Automatically generates unique QR codes for each inventory item
- QR codes contain a URL pointing to the scan endpoint: `{API_URL}/api/inventory/scan/{itemCode}`
- Supports both data URL format (for web) and PNG file format (for printing)
- High error correction level for durability

### 2. **Inventory Item Tracking**
Each physical item is tracked with:
- **Unique Item Code**: SKU or barcode identifier
- **QR Code URL**: Scannable code linking to the item
- **Product Reference**: Links to the Product model
- **Status**: available, sold, damaged, returned, or in-transit
- **Location**: Current warehouse location
- **Batch Number**: For grouping related items
- **Manufacturing/Expiry Dates**: For perishable items
- **Scan History**: Complete audit trail of all scans and status changes

### 3. **Batch Operations**
- Create multiple inventory items at once
- Assign same batch number for bulk tracking
- Perfect for receiving shipments

## API Endpoints

### Creating Inventory Items

#### Create Single Item
```
POST /api/inventory/item
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "itemCode": "SKU-001-2024",
  "batchNumber": "BATCH-001",
  "manufacturingDate": "2024-01-15",
  "expiryDate": "2026-01-15",
  "notes": "Premium arabica beans"
}

Response: 201 Created
{
  "_id": "507f1f77bcf86cd799439012",
  "productId": "507f1f77bcf86cd799439011",
  "itemCode": "SKU-001-2024",
  "qrCode": "http://localhost:4000/api/inventory/scan/SKU-001-2024",
  "qrCodeDataURL": "data:image/png;base64,...",
  "status": "available",
  "location": "warehouse",
  "batchNumber": "BATCH-001",
  "manufacturingDate": "2024-01-15T00:00:00.000Z",
  "expiryDate": "2026-01-15T00:00:00.000Z",
  "notes": "Premium arabica beans",
  "scanHistory": [],
  "createdAt": "2024-01-23T10:00:00.000Z",
  "updatedAt": "2024-01-23T10:00:00.000Z"
}
```

#### Create Batch Items
```
POST /api/inventory/batch
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "productId": "507f1f77bcf86cd799439011",
  "itemCodes": ["SKU-001-2024", "SKU-002-2024", "SKU-003-2024"],
  "batchNumber": "BATCH-001",
  "manufacturingDate": "2024-01-15",
  "expiryDate": "2026-01-15"
}

Response: 201 Created
{
  "created": 3,
  "items": [
    { /* inventory item objects */ },
    { /* inventory item objects */ },
    { /* inventory item objects */ }
  ],
  "errors": [] // Only included if there were any errors
}
```

### Scanning & Retrieving Items

#### Scan QR Code
```
GET /api/inventory/scan/{itemCode}
Authorization: Bearer {JWT_TOKEN}

Response: 200 OK
{
  "_id": "507f1f77bcf86cd799439012",
  "productId": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Premium Coffee Beans",
    "price": 25.99,
    "description": "Single origin arabica",
    "stock": 150
  },
  "itemCode": "SKU-001-2024",
  "qrCode": "http://localhost:4000/api/inventory/scan/SKU-001-2024",
  "status": "available",
  "location": "warehouse",
  "batchNumber": "BATCH-001",
  "manufacturingDate": "2024-01-15T00:00:00.000Z",
  "expiryDate": "2026-01-15T00:00:00.000Z",
  "notes": "Premium arabica beans",
  "assignedToOrder": null,
  "scanHistory": [
    {
      "_id": "507f1f77bcf86cd799439013",
      "scannedAt": "2024-01-23T10:05:30.000Z",
      "scannedBy": "user123",
      "action": "scanned",
      "notes": null
    }
  ],
  "createdAt": "2024-01-23T10:00:00.000Z",
  "updatedAt": "2024-01-23T10:05:30.000Z"
}
```

#### Get Item by Code
```
GET /api/inventory/item/{itemCode}
Authorization: Bearer {JWT_TOKEN}

Response: 200 OK
{ /* same as scan response */ }
```

#### Get QR Code
```
GET /api/inventory/qr/{itemCode}?format=image
Authorization: Bearer {JWT_TOKEN}

Query Parameters:
- format: "url" (returns JSON with QR code URL) or "image" (returns JSON with data URL)
- Default: "image"

Response (format=image): 200 OK
{
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAAyCAYAAAAeP4ixAA..."
}

Response (format=url): 200 OK
{
  "qrCode": "http://localhost:4000/api/inventory/scan/SKU-001-2024"
}
```

### Inventory Management

#### Update Item Status
```
PUT /api/inventory/item/{itemCode}/status
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "status": "sold",
  "location": "customer-delivery",
  "notes": "Delivered to Order #ORD-12345"
}

Valid Status Values:
- "available" - In stock at warehouse
- "sold" - Sold and assigned to order
- "damaged" - Item is damaged
- "returned" - Returned by customer
- "in-transit" - On the way to customer

Response: 200 OK
{ /* updated inventory item */ }
```

#### Get Product Inventory
```
GET /api/inventory/product/{productId}?status=available
Authorization: Bearer {JWT_TOKEN}

Query Parameters:
- status: Optional filter by status (available, sold, damaged, returned, in-transit)

Response: 200 OK
[
  { /* inventory item 1 */ },
  { /* inventory item 2 */ },
  { /* inventory item 3 */ }
]
```

#### Get Inventory Statistics
```
GET /api/inventory/stats/{productId}
Authorization: Bearer {JWT_TOKEN}

Response: 200 OK
{
  "available": 45,
  "sold": 20,
  "damaged": 2,
  "returned": 3,
  "in-transit": 5,
  "total": 75
}
```

### Admin-Only Operations

#### Delete Inventory Item
```
DELETE /api/inventory/item/{itemCode}
Authorization: Bearer {JWT_TOKEN}

Response: 200 OK
{
  "message": "Inventory item deleted successfully"
}
```

## Workflow Examples

### Scenario 1: Receiving New Shipment
1. Admin creates batch of inventory items with SKUs and batch number
2. System automatically generates QR codes for each item
3. Warehouse staff print QR code labels
4. Labels are attached to physical items in warehouse

### Scenario 2: Picking for Order
1. Staff scans QR code of item to pick
2. System retrieves product information and confirms correct item
3. Staff updates item status to "sold" and links to order

### Scenario 3: Processing Return
1. Customer returns item
2. Staff scans QR code to identify item
3. System shows return history and condition
4. Status updated to "returned" with notes

### Scenario 4: Inventory Audit
1. Staff performs physical count and scans all items
2. Each scan is recorded in scan history
3. Can compare scan records with database for discrepancies

## Database Models

### InventoryItem Schema
```javascript
{
  productId: ObjectId,                    // Reference to Product
  itemCode: String (unique),              // SKU or barcode
  qrCode: String (unique),                // Scannable URL
  status: String (enum),                  // Current status
  location: String,                       // Current location
  assignedToOrder: ObjectId,              // Reference to Order
  batchNumber: String,                    // Batch grouping
  manufacturingDate: Date,                // Made date
  expiryDate: Date,                       // Expiry date
  notes: String,                          // Additional info
  scanHistory: [                          // Audit trail
    {
      scannedAt: Date,
      scannedBy: String,
      action: String,
      notes: String
    }
  ],
  timestamps: true                        // createdAt, updatedAt
}
```

### Product Schema (Updated)
```javascript
{
  // Existing fields...
  qrTrackingEnabled: Boolean,             // Feature flag
  sku: String (unique, sparse),           // SKU for this product
}
```

## Security & Permissions

- **Public Routes**: Require authentication (JWT token)
  - Scan items
  - View item details
  - View product inventory
  - View statistics

- **Admin Routes**: Require admin role
  - Create inventory items
  - Create batch items
  - Update item status
  - Delete items

- **Audit Logging**: All operations logged with:
  - User ID
  - Action type
  - Timestamp
  - IP address
  - Changes made

## Printing QR Codes

To print QR codes:

1. **Get all items for a product:**
   ```
   GET /api/inventory/product/{productId}
   ```

2. **Extract QR code images:**
   Loop through items and get QR codes:
   ```
   GET /api/inventory/qr/{itemCode}?format=image
   ```

3. **Generate labels:**
   Display or print the base64 PNG images with item codes

4. **Print tips:**
   - Use high-quality label paper
   - Test scan with smartphone before bulk printing
   - Ensure adequate white space around QR code
   - Consider waterproof labels for warehouse environment

## Configuration

Environment variables:
```
API_URL=https://api.doylesbreakroomservices.com  # For QR code URLs
MONGO_URI=mongodb://...                          # Database
JWT_SECRET=...                                   # Authentication
```

## Frontend Integration

Example React component for scanning:

```javascript
import { useState } from 'react';

export function QRScanner() {
  const [itemCode, setItemCode] = useState('');
  const [itemData, setItemData] = useState(null);
  const [error, setError] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(
        `/api/inventory/scan/${itemCode}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (!response.ok) throw new Error('Item not found');
      
      const data = await response.json();
      setItemData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
      setItemData(null);
    }
  };

  return (
    <div>
      <form onSubmit={handleScan}>
        <input
          type="text"
          value={itemCode}
          onChange={(e) => setItemCode(e.target.value)}
          placeholder="Scan or enter item code..."
          autoFocus
        />
        <button type="submit">Scan</button>
      </form>
      
      {error && <p style={{color: 'red'}}>{error}</p>}
      
      {itemData && (
        <div>
          <h3>{itemData.productId.name}</h3>
          <p>Item Code: {itemData.itemCode}</p>
          <p>Status: {itemData.status}</p>
          <p>Price: ${itemData.productId.price}</p>
          <p>Location: {itemData.location}</p>
        </div>
      )}
    </div>
  );
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| QR code not scanning | Ensure good lighting, proper label placement, adequate white space |
| Duplicate item code error | Use unique SKUs - consider prefixing with product ID or timestamp |
| Scan history not updating | Check user authentication and JWT token validity |
| Performance with large batches | Use batch creation endpoint, ensure indexes are created |

## Future Enhancements

- Mobile app for barcode scanning
- Real-time inventory dashboard
- Automated expiry date alerts
- Integration with order fulfillment system
- Barcode generation instead of just QR codes
- Export inventory reports
- Multi-location warehouse support
