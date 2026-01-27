#!/bin/bash

# QR Code System Testing Script
# This script tests all QR code inventory endpoints

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="${API_URL:-http://localhost:4000}"
TOKEN="${JWT_TOKEN:-}"

# Check if token is provided
if [ -z "$TOKEN" ]; then
    echo -e "${RED}Error: JWT_TOKEN environment variable is not set${NC}"
    echo "Usage: JWT_TOKEN=your_token ./qr-code-test.sh"
    exit 1
fi

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}QR Code Inventory System - Test Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4

    echo -e "${YELLOW}Testing: $description${NC}"
    echo "Method: $method | Endpoint: $endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            "$API_URL$endpoint")
    else
        response=$(curl -s -X $method \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$API_URL$endpoint")
    fi

    echo "Response:"
    echo "$response" | jq '.' 2>/dev/null || echo "$response"
    echo ""
    
    # Extract ID for subsequent calls if it's a creation endpoint
    if [[ $method == "POST" && $endpoint == "/api/inventory/item" ]]; then
        ITEM_ID=$(echo "$response" | jq -r '._id' 2>/dev/null)
        ITEM_CODE=$(echo "$response" | jq -r '.itemCode' 2>/dev/null)
    fi
    
    if [[ $method == "POST" && $endpoint == "/api/products" ]]; then
        PRODUCT_ID=$(echo "$response" | jq -r '._id' 2>/dev/null)
    fi
}

# Test 1: Get all products
echo -e "${GREEN}=== TEST 1: Get All Products ===${NC}"
api_call "GET" "/api/products" "" "Get all products"

# Test 2: Create a test product
echo -e "${GREEN}=== TEST 2: Create Test Product ===${NC}"
PRODUCT_DATA='{
  "name": "QR Test Coffee Beans",
  "price": 15.99,
  "stock": 100,
  "description": "Test product for QR code system"
}'
api_call "POST" "/api/products" "$PRODUCT_DATA" "Create test product"

if [ -z "$PRODUCT_ID" ]; then
    echo -e "${RED}Failed to get product ID. Cannot continue tests.${NC}"
    exit 1
fi

echo -e "${GREEN}Using Product ID: $PRODUCT_ID${NC}"
echo ""

# Test 3: Create single inventory item
echo -e "${GREEN}=== TEST 3: Create Single Inventory Item ===${NC}"
ITEM_DATA="{
  \"productId\": \"$PRODUCT_ID\",
  \"itemCode\": \"QR-TEST-001-$(date +%s)\",
  \"batchNumber\": \"BATCH-QR-TEST\",
  \"manufacturingDate\": \"2024-01-15\",
  \"expiryDate\": \"2026-01-15\",
  \"notes\": \"Test item for QR code scanning\"
}"
api_call "POST" "/api/inventory/item" "$ITEM_DATA" "Create inventory item with QR code"

if [ -z "$ITEM_CODE" ]; then
    echo -e "${RED}Failed to get item code. Cannot continue tests.${NC}"
    exit 1
fi

echo -e "${GREEN}Using Item Code: $ITEM_CODE${NC}"
echo ""

# Test 4: Scan inventory item
echo -e "${GREEN}=== TEST 4: Scan Inventory Item ===${NC}"
api_call "GET" "/api/inventory/scan/$ITEM_CODE" "" "Scan item QR code"

# Test 5: Get item by code
echo -e "${GREEN}=== TEST 5: Get Item by Code ===${NC}"
api_call "GET" "/api/inventory/item/$ITEM_CODE" "" "Get item details"

# Test 6: Get QR code (image format)
echo -e "${GREEN}=== TEST 6: Get QR Code Image ===${NC}"
api_call "GET" "/api/inventory/qr/$ITEM_CODE?format=image" "" "Get QR code as image"

# Test 7: Get QR code (URL format)
echo -e "${GREEN}=== TEST 7: Get QR Code URL ===${NC}"
api_call "GET" "/api/inventory/qr/$ITEM_CODE?format=url" "" "Get QR code as URL"

# Test 8: Update item status
echo -e "${GREEN}=== TEST 8: Update Item Status ===${NC}"
STATUS_DATA='{
  "status": "sold",
  "location": "customer-delivery",
  "notes": "Delivered to customer"
}'
api_call "PUT" "/api/inventory/item/$ITEM_CODE/status" "$STATUS_DATA" "Update item status"

# Test 9: Create batch items
echo -e "${GREEN}=== TEST 9: Create Batch Inventory Items ===${NC}"
BATCH_DATA="{
  \"productId\": \"$PRODUCT_ID\",
  \"itemCodes\": [
    \"BATCH-TEST-001-$(date +%s)\",
    \"BATCH-TEST-002-$(date +%s)\",
    \"BATCH-TEST-003-$(date +%s)\"
  ],
  \"batchNumber\": \"BATCH-MULTIPLE-$(date +%s)\"
}"
api_call "POST" "/api/inventory/batch" "$BATCH_DATA" "Create multiple inventory items"

# Test 10: Get product inventory
echo -e "${GREEN}=== TEST 10: Get Product Inventory ===${NC}"
api_call "GET" "/api/inventory/product/$PRODUCT_ID" "" "Get all items for product"

# Test 11: Get inventory statistics
echo -e "${GREEN}=== TEST 11: Get Inventory Statistics ===${NC}"
api_call "GET" "/api/inventory/stats/$PRODUCT_ID" "" "Get inventory stats for product"

# Test 12: Get inventory with status filter
echo -e "${GREEN}=== TEST 12: Get Inventory Filtered by Status ===${NC}"
api_call "GET" "/api/inventory/product/$PRODUCT_ID?status=available" "" "Get available items only"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Script Completed!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Summary:"
echo "- Product created: $PRODUCT_ID"
echo "- Test item code: $ITEM_CODE"
echo ""
echo "Next steps:"
echo "1. Copy the QR code image and print it"
echo "2. Scan the QR code with a smartphone"
echo "3. See real-time item updates in the scan history"
echo ""
