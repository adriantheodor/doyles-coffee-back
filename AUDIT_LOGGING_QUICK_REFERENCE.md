# Audit Logging - Quick Reference

## Files Added
- ✅ `models/AuditLog.js` - MongoDB schema for audit logs
- ✅ `utils/auditLogger.js` - Audit logging utilities
- ✅ `AUDIT_LOGGING.md` - Complete documentation

## Files Modified
- ✅ `routes/auth.js` - Added audit logging to all auth endpoints

## Tracked Auth Events

| Event | Logged | Details |
|-------|--------|---------|
| 🔐 Login Success | ✅ | User ID, Email, IP, Time |
| ❌ Failed Login | ✅ | Email, IP, Reason |
| 📝 Register | ✅ | New user info, IP |
| 🔗 Email Verify | ✅ | User, Email, Token status |
| 📧 Resend Email | ✅ | Email, Attempt count |
| 🚪 Logout | ✅ | User ID, IP, Time |

## Admin Audit Endpoints

All require admin role:

```bash
# Get all audit logs (with filtering)
GET /api/auth/admin/audit-logs?action=LOGIN&limit=50&skip=0

# Get specific user's activity
GET /api/auth/admin/audit-logs/user/:userId

# Get resource change history
GET /api/auth/admin/audit-logs/resource/:resourceType/:resourceId
```

## Key Features

- 🔍 **Full Tracking** - WHO, WHAT, WHEN, WHERE, HOW
- 🔒 **Immutable** - Cannot modify/delete audit logs
- 📊 **Searchable** - Filter by user, action, resource, date
- 🔐 **Secure** - Excludes passwords from logs
- 📈 **Indexed** - Optimized database queries
- ⚡ **Non-blocking** - Logging doesn't affect app performance

## Usage Example

```javascript
const { logAudit, getClientIp } = require("../utils/auditLogger");

// Log a successful action
await logAudit({
  userId: user._id,
  userEmail: user.email,
  userRole: user.role,
  action: "LOGIN",
  resourceType: "Auth",
  method: "POST",
  endpoint: "/api/auth/login",
  ipAddress: getClientIp(req),
  userAgent: req.get("user-agent"),
  status: "SUCCESS",
  statusCode: 200,
  description: "User logged in successfully"
});
```

## Query Examples

```javascript
// Find all failed logins from IP
GET /api/auth/admin/audit-logs?action=FAILED_LOGIN&limit=100

// Get user's complete activity history
GET /api/auth/admin/audit-logs/user/64f1e8b9c4d2a9f1e8b9c4d2

// See who modified a product
GET /api/auth/admin/audit-logs/resource/Product/64f1e8b9c4d2a9f1e8b9c4d2

// Get all registrations from last week
GET /api/auth/admin/audit-logs?action=REGISTER&startDate=2026-01-16&endDate=2026-01-23
```

## Maintenance

```javascript
// Clean up old logs (older than 90 days)
const { deleteOldLogs } = require("../utils/auditLogger");
await deleteOldLogs(90);
```

## Security Benefits

✅ Detect brute force attacks (multiple FAILED_LOGIN)
✅ Track unauthorized access attempts
✅ Monitor admin actions
✅ Debug user issues
✅ Compliance audit trail
✅ Fraud investigation
✅ Account recovery verification

## Next Steps (Optional)

1. Add audit logging to other routes (products, orders, invoices, etc.)
2. Create admin dashboard to visualize audit logs
3. Set up automated alerts for suspicious activity
4. Implement log archival/export for compliance
5. Add real-time webhook notifications for critical actions
