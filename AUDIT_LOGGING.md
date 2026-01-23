# Audit Logging System

## Overview

A comprehensive audit logging system has been implemented to track all important actions across your API. This enables security monitoring, compliance auditing, user activity tracking, and debugging.

## What Was Added

### 1. **New Model: `models/AuditLog.js`**
MongoDB schema for storing audit trail entries with the following fields:

**User Information:**
- `userId` - ID of user performing the action (null for unauthenticated)
- `userEmail` - Email of user (stored for historical reference)
- `userRole` - Role of user (admin/customer)

**Action Details:**
- `action` - Type of action (LOGIN, LOGOUT, REGISTER, etc.)
- `resourceType` - Type of resource affected (User, Product, Order, etc.)
- `resourceId` - ID of the resource
- `resourceName` - Descriptive name of resource

**Request Context:**
- `method` - HTTP method (GET, POST, PUT, DELETE, PATCH)
- `endpoint` - API endpoint accessed
- `ipAddress` - Client IP address
- `userAgent` - Browser/client information

**Outcome:**
- `status` - SUCCESS, FAILURE, or PARTIAL
- `statusCode` - HTTP response status code
- `errorMessage` - Error details if failed

**Data Changes:**
- `changes.before` - Original data values
- `changes.after` - Updated data values

**Timestamps:**
- `createdAt` / `timestamp` - When the action occurred

### 2. **New Utility: `utils/auditLogger.js`**
Service module with functions for managing audit logs:

```javascript
// Create audit log entry
logAudit({...})

// Extract changed fields between objects
extractChanges(before, after)

// Get IP from request
getClientIp(req)

// Retrieve audit logs with filtering
getAuditLogs({userId, action, resourceType, ...})

// Get user's activity history
getUserActivity(userId, limit)

// Get all changes to a resource
getResourceHistory(resourceType, resourceId)

// Track failed login attempts
getFailedLoginAttempts(identifier, minutes)

// Clean up old logs (retention)
deleteOldLogs(daysToKeep)
```

## Tracked Actions

### Authentication Events
- ✅ **LOGIN** - Successful user login
- ✅ **FAILED_LOGIN** - Failed login attempts
- ✅ **LOGOUT** - User logout
- ✅ **REGISTER** - New user registration
- ✅ **VERIFY_EMAIL** - Email verification
- ✅ **RESEND_EMAIL** - Resend verification email
- ✅ **PASSWORD_CHANGE** - Password changes

### Resource Operations
- ✅ **PRODUCT_CREATE** - New product created
- ✅ **PRODUCT_UPDATE** - Product modified
- ✅ **PRODUCT_DELETE** - Product deleted

- ✅ **ORDER_CREATE** - New order created
- ✅ **ORDER_UPDATE** - Order modified
- ✅ **ORDER_DELETE** - Order cancelled

- ✅ **INVOICE_UPLOAD** - Invoice file uploaded
- ✅ **INVOICE_SEND** - Invoice sent to customer
- ✅ **INVOICE_DELETE** - Invoice deleted

- ✅ **ISSUE_CREATE** - Issue report created
- ✅ **ISSUE_UPDATE** - Issue modified
- ✅ **ISSUE_DELETE** - Issue deleted

- ✅ **QUOTE_CREATE** - Quote request created
- ✅ **QUOTE_UPDATE** - Quote modified
- ✅ **QUOTE_DELETE** - Quote deleted

### Security Events
- ✅ **UNAUTHORIZED_ACCESS** - Access denied
- ✅ **RATE_LIMIT_HIT** - Rate limit exceeded

## API Endpoints (Admin Only)

All audit endpoints require admin authentication and are under `/api/auth/admin/audit-logs`

### 1. Get All Audit Logs
```
GET /api/auth/admin/audit-logs
```

**Query Parameters:**
- `userId` - Filter by user ID
- `action` - Filter by action type (LOGIN, REGISTER, etc.)
- `resourceType` - Filter by resource type
- `resourceId` - Filter by resource ID
- `startDate` - Start date filter (ISO format)
- `endDate` - End date filter (ISO format)
- `limit` - Results per page (default: 100)
- `skip` - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "userId": "...",
      "userEmail": "user@example.com",
      "userRole": "admin",
      "action": "LOGIN",
      "resourceType": "Auth",
      "method": "POST",
      "endpoint": "/api/auth/login",
      "ipAddress": "192.168.1.1",
      "status": "SUCCESS",
      "statusCode": 200,
      "createdAt": "2026-01-23T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 100,
    "skip": 0,
    "pages": 2
  }
}
```

### 2. Get User Activity History
```
GET /api/auth/admin/audit-logs/user/:userId
```

**Query Parameters:**
- `limit` - Number of records (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "action": "LOGIN",
      "endpoint": "/api/auth/login",
      "ipAddress": "192.168.1.1",
      "status": "SUCCESS",
      "createdAt": "2026-01-23T10:30:00Z"
    }
  ]
}
```

### 3. Get Resource Change History
```
GET /api/auth/admin/audit-logs/resource/:resourceType/:resourceId
```

**Parameters:**
- `resourceType` - Type of resource (Product, Order, Invoice, etc.)
- `resourceId` - ID of the resource

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "action": "PRODUCT_UPDATE",
      "userEmail": "admin@example.com",
      "changes": {
        "before": { "price": 50.00, "stock": 100 },
        "after": { "price": 55.00, "stock": 95 }
      },
      "status": "SUCCESS",
      "createdAt": "2026-01-23T10:30:00Z"
    }
  ]
}
```

## Implementation Examples

### Login Audit Logging
```javascript
// When login succeeds
await logAudit({
  userId: user._id,
  userEmail: user.email,
  userRole: user.role,
  action: "LOGIN",
  resourceType: "Auth",
  resourceId: user._id,
  method: "POST",
  endpoint: "/api/auth/login",
  ipAddress: getClientIp(req),
  userAgent: req.get("user-agent"),
  status: "SUCCESS",
  statusCode: 200,
  description: "Successful login",
});
```

### Product Update Audit Logging
```javascript
// When updating a product
const oldProduct = await Product.findById(id);

product.price = newPrice;
product.stock = newStock;
await product.save();

await logAudit({
  userId: req.user.id,
  userEmail: req.user.email,
  userRole: req.user.role,
  action: "PRODUCT_UPDATE",
  resourceType: "Product",
  resourceId: product._id,
  resourceName: `Product: ${product.name}`,
  method: "PUT",
  endpoint: `/api/products/${id}`,
  ipAddress: getClientIp(req),
  status: "SUCCESS",
  statusCode: 200,
  changes: extractChanges(
    { price: oldProduct.price, stock: oldProduct.stock },
    { price: product.price, stock: product.stock }
  ),
});
```

## Database Indexes

For optimal query performance, the following indexes are automatically created:

```javascript
- { userId: 1, createdAt: -1 }      // User activity queries
- { action: 1, createdAt: -1 }      // Action type queries
- { resourceType: 1, resourceId: 1, createdAt: -1 }  // Resource history
- { ipAddress: 1, createdAt: -1 }   // IP-based queries
- { createdAt: -1 }                 // Time-based queries
```

## Security Features

✅ **Immutable Logs** - Audit logs cannot be modified or deleted (prevents tampering)
✅ **IP Tracking** - Records client IP for anomaly detection
✅ **User Context** - Stores email/role for historical reference
✅ **Change Tracking** - Records before/after values for updates
✅ **Status Tracking** - Differentiates success/failure events
✅ **Error Details** - Captures error messages for debugging
✅ **User Agent** - Captures browser/client information

## Best Practices

### 1. Always Include Context
```javascript
// ✅ GOOD
await logAudit({
  userId: req.user.id,
  userEmail: req.user.email,
  userRole: req.user.role,
  action: "PRODUCT_CREATE",
  // ... other fields
});

// ❌ BAD - Missing user context
await logAudit({
  action: "PRODUCT_CREATE",
});
```

### 2. Extract Changes for Updates
```javascript
// ✅ GOOD
const before = { name: oldProduct.name, price: oldProduct.price };
const after = { name: product.name, price: product.price };

await logAudit({
  changes: extractChanges(before, after),
  // ... other fields
});
```

### 3. Use Meaningful Descriptions
```javascript
// ✅ GOOD
description: "Admin modified product price from $50 to $55"

// ❌ BAD
description: "update"
```

### 4. Handle Errors Gracefully
```javascript
// Audit logging should never crash the app
try {
  await logAudit({...});
} catch (err) {
  console.error("Audit log failed:", err);
  // Continue execution
}
```

## Maintenance & Retention

### Archive Old Logs
```javascript
// Delete logs older than 90 days
const deleted = await deleteOldLogs(90);
console.log(`Archived ${deleted} old audit logs`);
```

### Recommended Retention Policy
- **Recent (0-30 days)**: Full detail with changes
- **Active (30-90 days)**: Indexed and searchable
- **Archive (90+ days)**: Consider moving to separate storage

## Example Queries

### Get all failed login attempts in last 24 hours
```javascript
const { logs } = await getAuditLogs({
  action: "FAILED_LOGIN",
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
});
```

### Get all admin actions today
```javascript
const { logs } = await getAuditLogs({
  userRole: "admin",
  startDate: new Date().toISOString().split('T')[0],
});
```

### Get complete history of a product
```javascript
const history = await getResourceHistory("Product", productId);
```

### Check user's account activity
```javascript
const activity = await getUserActivity(userId);
```

## Troubleshooting

### Q: Audit logs not appearing?
A: Ensure:
1. AuditLog model is required in auth.js
2. `logAudit()` is called after actions
3. MongoDB is running and connected

### Q: Too many audit logs?
A: Implement retention:
```javascript
// Run weekly cleanup
setInterval(() => deleteOldLogs(90), 7 * 24 * 60 * 60 * 1000);
```

### Q: Need to see who changed a field?
A: Use the resource history endpoint:
```
GET /api/auth/admin/audit-logs/resource/Product/64f1e8b9c4d2a9f1e8b9c4d2
```

## Future Enhancements

- [ ] Real-time audit log webhooks
- [ ] Bulk exports (CSV, JSON)
- [ ] Advanced analytics dashboard
- [ ] Compliance report generation
- [ ] Anomaly detection alerts
- [ ] Automatic PII redaction
