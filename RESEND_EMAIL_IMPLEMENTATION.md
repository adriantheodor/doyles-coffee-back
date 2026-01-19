# Resend Verification Email Implementation

## Overview
This implementation adds the ability for users to request a new verification email. It includes rate-limiting, token expiration tracking, and secure messaging practices.

## Changes Made

### 1. **User Model Updates** (`models/User.js`)
Added three new fields to track verification email resends:
```javascript
verificationTokenExpiresAt: { type: Date }              // When current token expires
lastVerificationEmailSentAt: { type: Date }            // Timestamp of last resend
verificationEmailResendCount: { type: Number }         // Resend counter for rate-limiting
```

### 2. **New Endpoint: POST `/api/auth/resend-verification-email`**

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response (always returns 200 for security):**
```json
{
  "message": "If an unverified account exists with this email, a verification email has been sent."
}
```

### 3. **Key Features**

#### ✅ Token Generation & Management
- Generates a new 32-byte (64-character) verification token
- Sets token expiration to **24 hours** from creation
- Old tokens are invalidated when a new one is generated

#### ✅ Rate Limiting (Important!)
- **Max 3 resends per 15 minutes** per email address
- Resend counter resets when outside the time window
- Counter resets to 0 upon successful email verification
- Rate limit violations still return success (doesn't expose user info)

#### ✅ Updated `/verify-email` Endpoint
- Now checks token expiration time
- Prevents use of expired tokens
- Resets resend counter upon successful verification

#### ✅ Updated `/register` Endpoint
- Sets token expiration on initial registration
- Enables same rate-limiting mechanism

#### ✅ Safe Success Messages
- **Always returns HTTP 200** with generic success message
- Prevents email enumeration attacks
- Email sending failures don't affect the response
- Doesn't reveal whether email exists or is already verified

#### ✅ Fire-and-Forget Email Sending
- Email sending is non-blocking (uses `.then().catch()`)
- Email failures are logged but don't cause request to fail
- User always gets positive feedback even if email service is down

## Configuration

Edit these constants in `routes/auth.js` to adjust behavior:

```javascript
const RESEND_MAX_ATTEMPTS = 3;           // Max resend attempts
const RESEND_WINDOW_MINUTES = 15;        // Time window for rate limiting
const TOKEN_EXPIRES_HOURS = 24;          // Token validity duration
```

## Frontend Integration

### Example: Resend Verification Email
```javascript
const handleResendEmail = async (email) => {
  try {
    const response = await fetch('/api/auth/resend-verification-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });

    if (response.ok) {
      // Show success message (same for all outcomes)
      showNotification("Check your email for verification link");
    } else {
      showError("Something went wrong. Please try again.");
    }
  } catch (error) {
    showError("Network error. Please try again.");
  }
};
```

### Example: Display Rate Limit Message
Since the backend always returns success, show user a UI-based rate limit message:
```javascript
// Track last resend time in localStorage
const getLastResendTime = () => JSON.parse(localStorage.getItem('lastResendTime')) || null;
const canResendEmail = () => {
  const lastResendTime = getLastResendTime();
  if (!lastResendTime) return true;
  
  const minutesSinceLastResend = (Date.now() - lastResendTime) / (1000 * 60);
  return minutesSinceLastResend >= 1; // Example: 1 minute between UI prompts
};
```

## Database Migration (if needed)

If you have existing users, run this to update the schema:
```javascript
db.users.updateMany({}, {
  $set: {
    verificationTokenExpiresAt: null,
    lastVerificationEmailSentAt: null,
    verificationEmailResendCount: 0
  }
});
```

## Security Considerations

1. **No Email Enumeration**: Response is identical for non-existent emails and verified users
2. **Rate Limiting**: Prevents brute force attacks and email service abuse
3. **Token Expiration**: 24-hour window prevents old tokens from being valid indefinitely
4. **Non-Blocking Email**: System remains responsive even if email service fails
5. **Generic Error Messages**: No server details leaked in error messages

## Testing

### Test 1: Basic Resend
```bash
curl -X POST http://localhost:4000/api/auth/resend-verification-email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

### Test 2: Rate Limit (make 4 rapid requests)
```bash
for i in {1..4}; do
  curl -X POST http://localhost:4000/api/auth/resend-verification-email \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
done
```
- First 3 should send emails
- 4th should silently fail (user gets same message)

### Test 3: Token Expiration
1. Resend verification email
2. Wait a few seconds and manually edit the token to an old one
3. Try to verify with old token
4. Should get "Invalid or expired token" message

## Monitoring

Check logs for:
- `✅ Verification email resent to: user@example.com` - Success
- `❌ Failed to send verification email to user@example.com` - Email service issue
- `⚠️ Rate limit exceeded for user: user@example.com` - Rate limit hit

## Future Enhancements

- Add email verification status endpoint
- Send notification email if account already verified
- Add SMS verification option
- Implement exponential backoff for rate limiting
- Add analytics for verification funnel
