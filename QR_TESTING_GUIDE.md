#!/bin/bash

# QR Code System - Complete End-to-End Testing Guide
# This document explains how to test the entire QR code system

cat << 'EOF'

╔═══════════════════════════════════════════════════════════════╗
║                 QR CODE SYSTEM - TEST GUIDE                   ║
║                                                               ║
║        Complete End-to-End Testing Instructions              ║
╚═══════════════════════════════════════════════════════════════╝

## PREREQUISITES

1. Server running:
   npm start

2. MongoDB connected and accessible

3. Admin JWT token ready (for authenticated requests)

4. API_URL environment variable set (optional, defaults to localhost:4000)

## SETUP: Get Your JWT Token

Before testing, you need an admin token. Sign in as admin:

curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin_password"
  }'

Save the token from the response:
export JWT_TOKEN="your_token_here"

## TEST WORKFLOW

### Step 1: Create a Test Product
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

curl -X POST http://localhost:4000/api/products \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Premium Ethiopian Coffee",
    "price": 19.99,
    "stock": 100,
    "description": "Single origin, high altitude beans"
  }'

Expected Response:
{
  "_id": "PRODUCT_ID_HERE",
  "name": "Premium Ethiopian Coffee",
  "price": 19.99,
  "stock": 100
}

Save PRODUCT_ID: export PRODUCT_ID="..."


### Step 2: Create a Single Inventory Item
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

curl -X POST http://localhost:4000/api/inventory/item \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"itemCode\": \"ETH-001-$(date +%s)\",
    \"batchNumber\": \"BATCH-JAN-2024\",
    \"manufacturingDate\": \"2024-01-15\",
    \"expiryDate\": \"2025-01-15\",
    \"notes\": \"Premium quality batch\"
  }"

Expected Response:
{
  "_id": "ITEM_ID_HERE",
  "itemCode": "ETH-001-1234567890",
  "qrCode": "http://localhost:4000/api/inventory/scan/ETH-001-1234567890",
  "qrCodeDataURL": "data:image/png;base64,...",
  "status": "available",
  "location": "warehouse"
}

Save ITEM_CODE: export ITEM_CODE="ETH-001-1234567890"


### Step 3: Verify Item Creation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

curl -X GET http://localhost:4000/api/inventory/item/$ITEM_CODE \
  -H "Authorization: Bearer $JWT_TOKEN"

Verify:
- Item code matches
- Status is "available"
- Location is "warehouse"
- Has QR code URL


### Step 4: Scan the QR Code
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

curl -X GET http://localhost:4000/api/inventory/scan/$ITEM_CODE \
  -H "Authorization: Bearer $JWT_TOKEN"

Verify:
- Scan succeeded
- Product information included
- Scan added to scanHistory
- Item details returned


### Step 5: Get QR Code Image
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Get as base64 PNG image (for printing/web display)
curl -X GET "http://localhost:4000/api/inventory/qr/$ITEM_CODE?format=image" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.qrCode'

# Get as scannable URL
curl -X GET "http://localhost:4000/api/inventory/qr/$ITEM_CODE?format=url" \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.qrCode'

Verify:
- Image format returns base64 PNG
- URL format returns scannable endpoint


### Step 6: Update Item Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Mark as sold
curl -X PUT http://localhost:4000/api/inventory/item/$ITEM_CODE/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "sold",
    "location": "customer-delivery",
    "notes": "Delivered to Order #ORD-001"
  }'

Expected Response:
- Status changed to "sold"
- Location updated to "customer-delivery"
- Scan history updated

Verify by scanning again:
curl -X GET http://localhost:4000/api/inventory/scan/$ITEM_CODE \
  -H "Authorization: Bearer $JWT_TOKEN"

Confirm:
- Status shows "sold"
- Scan history shows status update


### Step 7: Create Batch Items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

curl -X POST http://localhost:4000/api/inventory/batch \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"itemCodes\": [
      \"BATCH-001-$(date +%s)\",
      \"BATCH-002-$(date +%s)\",
      \"BATCH-003-$(date +%s)\",
      \"BATCH-004-$(date +%s)\",
      \"BATCH-005-$(date +%s)\"
    ],
    \"batchNumber\": \"SHIPMENT-JAN-2024\",
    \"manufacturingDate\": \"2024-01-20\",
    \"expiryDate\": \"2025-01-20\"
  }"

Expected Response:
{
  "created": 5,
  "items": [
    { item objects },
    ...
  ],
  "errors": []
}

Verify:
- All 5 items created
- No errors
- Each has unique QR code


### Step 8: Get Product Inventory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Get all items for product
curl -X GET http://localhost:4000/api/inventory/product/$PRODUCT_ID \
  -H "Authorization: Bearer $JWT_TOKEN"

Expected Response:
Array of inventory items with:
- Product references
- Item codes
- Status values
- Scan histories

# Filter by status
curl -X GET "http://localhost:4000/api/inventory/product/$PRODUCT_ID?status=available" \
  -H "Authorization: Bearer $JWT_TOKEN"

Verify:
- Returns only available items
- Shows all batch items


### Step 9: Get Inventory Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

curl -X GET http://localhost:4000/api/inventory/stats/$PRODUCT_ID \
  -H "Authorization: Bearer $JWT_TOKEN"

Expected Response:
{
  "available": 5,
  "sold": 1,
  "damaged": 0,
  "returned": 0,
  "in-transit": 0,
  "total": 6
}

Verify:
- Counts match created items
- Available shows batch items (5)
- Sold shows first item (1)
- Total is correct (6)


### Step 10: Test Various Status Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Pick an available batch item and mark as in-transit
BATCH_ITEM="BATCH-002-..."  # Use one from batch creation

curl -X PUT http://localhost:4000/api/inventory/item/$BATCH_ITEM/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in-transit",
    "location": "shipping-dock",
    "notes": "Packed and ready to ship"
  }'

# Mark another as damaged
curl -X PUT http://localhost:4000/api/inventory/item/$BATCH_ITEM/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "damaged",
    "location": "damaged-goods",
    "notes": "Broken during packaging"
  }'

# Check updated statistics
curl -X GET http://localhost:4000/api/inventory/stats/$PRODUCT_ID \
  -H "Authorization: Bearer $JWT_TOKEN"

Expected Response should show:
- available: 3 (one less)
- sold: 1
- in-transit: 1 (new)
- damaged: 1 (new)
- total: 6 (same)


### Step 11: Verify Audit Logging
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Check MongoDB directly:

use your_database_name
db.auditlogs.find({resourceType: "InventoryItem"}).pretty()

Verify:
- All operations are logged
- Includes timestamps
- Shows user IDs
- Shows action types
- Shows changes made


### Step 12: Test Error Cases
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Test: Invalid item code
curl -X GET http://localhost:4000/api/inventory/scan/INVALID-CODE \
  -H "Authorization: Bearer $JWT_TOKEN"
Expected: 404 "Item not found"

# Test: Duplicate item code
curl -X POST http://localhost:4000/api/inventory/item \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"itemCode\": \"$ITEM_CODE\"
  }"
Expected: 400 "Item code already exists"

# Test: Missing product ID
curl -X POST http://localhost:4000/api/inventory/item \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"itemCode": "TEST-001"}'
Expected: 400 "Product ID is required"

# Test: Invalid status
curl -X PUT http://localhost:4000/api/inventory/item/$ITEM_CODE/status \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "invalid-status"}'
Expected: 400 "Valid status is required"

# Test: Unauthorized (non-admin)
curl -X POST http://localhost:4000/api/inventory/item \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\", \"itemCode\": \"TEST\"}"
Expected: 403 "Only admins can create items"


## PERFORMANCE TESTING

### Create 100 Items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# Generate 100 item codes
ITEM_CODES=$(for i in {1..100}; do echo "\"PERF-TEST-$i\""; done | paste -sd ',' -)

curl -X POST http://localhost:4000/api/inventory/batch \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"itemCodes\": [$ITEM_CODES]
  }"

Verify: All 100 items created successfully


### Query Performance
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# These should be fast (< 100ms) due to database indexes
time curl -s -X GET http://localhost:4000/api/inventory/product/$PRODUCT_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.[0]'

time curl -s -X GET http://localhost:4000/api/inventory/stats/$PRODUCT_ID \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.'


## BROWSER TESTING

### View QR Code in Browser
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Get the QR code as base64:
   curl -s -X GET "http://localhost:4000/api/inventory/qr/$ITEM_CODE?format=image" \
     -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.qrCode'

2. Create an HTML file:
   <img src="[PASTE_BASE64_HERE]" alt="QR Code" />

3. Open in browser and verify QR code displays

4. Test with QR code scanner app (smartphone)


## INTEGRATION TESTING

### With Order System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Create an order for the product
2. Scan item QR code when fulfilling order
3. Update item status to "sold" with order number
4. Verify order shows item in fulfillment

Note: This requires integration with your order system


## CLEANUP (Optional)

Delete test items:

curl -X DELETE http://localhost:4000/api/inventory/item/$ITEM_CODE \
  -H "Authorization: Bearer $JWT_TOKEN"

Expected: 200 "Inventory item deleted successfully"


## SUCCESS CRITERIA

You have successfully tested the QR Code System when:

✅ Created inventory items with unique QR codes
✅ Scanned QR codes and retrieved item information
✅ Updated item status through its lifecycle
✅ Created batch items efficiently
✅ Viewed inventory statistics
✅ Tested all 9 API endpoints
✅ Verified error handling
✅ Checked audit logging
✅ Confirmed scan history tracking
✅ Tested with 100+ items without performance issues
✅ Verified database indexes are working
✅ All operations secure and authenticated
✅ Role-based access control working


## TROUBLESHOOTING

Issue: "Item not found" on scan
→ Verify item code spelling exactly matches
→ Check in MongoDB that item exists

Issue: QR code won't scan
→ Ensure good contrast on label
→ Check adequate white space around code
→ Test with multiple scanner apps

Issue: 401 Unauthorized
→ Verify JWT token hasn't expired
→ Re-login to get fresh token
→ Include "Bearer" prefix correctly

Issue: 403 Forbidden on create
→ Verify using admin token
→ Check admin role is set on user account

Issue: Database connection fails
→ Verify MongoDB is running
→ Check MONGO_URI in .env file
→ Verify network access to database

Issue: Performance degradation with many items
→ Check database indexes exist
→ Consider pagination in queries
→ Check server resources


## NEXT STEPS

After successful testing:

1. Integrate with frontend React components
2. Deploy to staging environment
3. Test with actual products and labels
4. Train warehouse staff
5. Monitor audit logs in production
6. Set up backup strategy
7. Plan scaling if needed


═══════════════════════════════════════════════════════════════

Questions? Refer to:
- QR_CODE_SYSTEM.md for full API documentation
- QR_CODE_QUICKSTART.md for quick reference
- Controllers for implementation details

═══════════════════════════════════════════════════════════════

EOF
