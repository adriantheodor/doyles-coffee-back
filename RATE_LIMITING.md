# Rate Limiting Implementation

## Overview

A comprehensive rate limiting system has been implemented across your entire API to protect against abuse, brute force attacks, and denial-of-service (DoS) attempts.

## What Was Added

### 1. **Dependencies**
- Installed `express-rate-limit` package - industry standard middleware for Express.js

### 2. **New File: `middleware/rateLimiter.js`**
Central configuration for all rate limiting rules across the application.

#### Global Rate Limiter
- **Limit**: 100 requests per 15 minutes
- **Applied to**: All API endpoints (except health check)
- **Purpose**: Protects against general abuse

#### Auth Route Limiters

| Route | Limit | Window | Purpose |
|-------|-------|--------|---------|
| `/api/auth/login` | 5 attempts | 15 minutes | Prevents brute force password attacks |
| `/api/auth/register` | 3 attempts | 1 hour | Prevents account creation spam |
| `/api/auth/resend-verification-email` | 3 attempts | 15 minutes | Prevents email spam |
| `/api/auth/password-reset` | 3 attempts | 15 minutes | Prevents reset request abuse |

#### Resource Operation Limiters

| Limiter | Limit | Window | Usage |
|---------|-------|--------|-------|
| `createUpdateLimiter` | 30 requests | 1 minute | Creating/updating products, orders, invoices, etc. |
| `uploadLimiter` | 20 requests | 1 hour | File uploads |

## Updated Files

### Server Configuration
- **[server.js](server.js#L8)**: Added global rate limiting middleware

### Route Files with Rate Limiting Applied
1. **[routes/auth.js](routes/auth.js)**
   - Login: `loginLimiter`
   - Register: `signupLimiter`
   - Resend Email: `verificationEmailLimiter`

2. **[routes/invoiceRoutes.js](routes/invoiceRoutes.js)**
   - Upload: `uploadLimiter`
   - Send: `createUpdateLimiter`

3. **[routes/productRoutes.js](routes/productRoutes.js)**
   - Create: `createUpdateLimiter`

4. **[routes/orderRoutes.js](routes/orderRoutes.js)**
   - Create: `createUpdateLimiter`

5. **[routes/issueReportRoutes.js](routes/issueReportRoutes.js)**
   - Create: `createUpdateLimiter`

6. **[routes/quoteRoutes.js](routes/quoteRoutes.js)**
   - Create: `createUpdateLimiter`

## How It Works

### Response Headers
When rate limited, the client receives:
```
HTTP/1.1 429 Too Many Requests
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1234567890
Content-Type: application/json

{
  "message": "Too many login attempts, please try again after 15 minutes."
}
```

### Error Message Examples
- **Login**: "Too many login attempts, please try again after 15 minutes."
- **Signup**: "Too many accounts created from this IP, please try again after an hour."
- **Email Resend**: "Too many verification email requests, please try again after 15 minutes."
- **General**: "Too many requests from this IP, please try again later."

### Configuration Details
- **Standard Headers**: Returns `RateLimit-*` headers (RFC 6585 compliant)
- **IP-Based**: Limits are enforced per IP address
- **Successful Requests**: Login limiter only counts failed attempts (skips successes)

## Features

✅ **Brute Force Protection** - Limits repeated login attempts  
✅ **Spam Prevention** - Restricts account creation and email requests  
✅ **API Abuse Prevention** - Global and per-operation limits  
✅ **User-Friendly Errors** - Clear messages about rate limit status  
✅ **RFC 6585 Compliant** - Uses standard rate limit headers  
✅ **Configurable** - Easy to adjust limits per endpoint  

## Testing

### Using the Test Script
```bash
chmod +x rate-limit-test.sh
./rate-limit-test.sh
```

### Manual Testing with cURL
```bash
# Test login rate limiting
for i in {1..6}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
done

# After 5 attempts, subsequent requests will return 429
```

## Best Practices Applied

1. **Strategic Limiting**: Different limits for different endpoint types
2. **Security**: Protects authenticated and public endpoints
3. **User Experience**: Clear error messages with retry guidance
4. **Performance**: Lightweight middleware with minimal overhead
5. **Flexibility**: Easily customizable limits per route

## Future Enhancements

Consider implementing:
- Distributed rate limiting using Redis for multi-server deployments
- Custom rate limit keys (per user ID instead of just IP)
- Whitelist for trusted partners
- Time-based rate limit adjustments
- Admin endpoints to view rate limit statistics

## Troubleshooting

### If You See 429 Errors
This is expected when testing! It means rate limiting is working.
- Wait for the `RateLimit-Reset` time (shown in response headers)
- Or restart your test with a different IP/client

### Adjusting Limits
Edit [middleware/rateLimiter.js](middleware/rateLimiter.js) to change:
- `windowMs`: Time window (in milliseconds)
- `max`: Maximum requests in that window

Example: Allow 10 login attempts per 20 minutes
```javascript
const loginLimiter = rateLimit({
  windowMs: 20 * 60 * 1000,  // 20 minutes
  max: 10,                     // 10 attempts
  // ... rest of config
});
```
