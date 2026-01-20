# Authentication Error Handling Improvements

This document outlines the enhanced authentication features added to the Doyle's Coffee Backend.

## ✅ Features Implemented

### 1. **Invalid Credentials Handling**
- **Status**: Already existed, now enhanced
- **Location**: `routes/auth.js` - `/login` endpoint
- **Improvement**: Now returns structured error response with error code
- **Response Format**:
  ```json
  {
    "message": "Invalid credentials",
    "code": "INVALID_CREDENTIALS",
    "field": null
  }
  ```
- **Security Note**: Deliberately doesn't reveal whether email or password is wrong

### 2. **Unverified Account Messaging**
- **Status**: Already existed, now enhanced
- **Location**: `routes/auth.js` - `/login` endpoint
- **Details**: Checks `user.isVerified` status before allowing login
- **Response Format**:
  ```json
  {
    "message": "Please verify your email before logging in",
    "code": "UNVERIFIED_ACCOUNT",
    "unverified": true,
    "email": "user@example.com"
  }
  ```
- **HTTP Status**: 403 Forbidden

### 3. **Graceful Session-Expired Redirect** ⭐ NEW
- **Location**: `middleware/auth.js` - `authenticateToken()` function
- **Feature**: Distinguishes between expired tokens and invalid tokens
- **How it works**:
  - Catches `TokenExpiredError` specifically
  - Returns `sessionExpired: true` flag for frontend to handle gracefully
  - Provides `code: "SESSION_EXPIRED"` for programmatic handling
- **Response Format**:
  ```json
  {
    "message": "Session expired. Please log in again.",
    "code": "SESSION_EXPIRED",
    "sessionExpired": true
  }
  ```
- **HTTP Status**: 401 Unauthorized
- **Usage**: Frontend can watch for `sessionExpired: true` and redirect to login automatically

### 4. **Global Auth Loading State** ⭐ NEW
- **Location**: `routes/auth.js` - GET `/api/auth/check-auth` endpoint
- **Purpose**: Allows frontend to check authentication status and handle loading states
- **Features**:
  - Returns current user info if authenticated
  - Detects session expiration automatically
  - Provides loading state flag for UI synchronization
  - No authentication required (public endpoint)

#### Endpoint Details

**GET `/api/auth/check-auth`**

Optional Bearer token in Authorization header.

**Response when authenticated**:
```json
{
  "isAuthenticated": true,
  "isLoading": false,
  "user": {
    "id": "user_id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "customer",
    "isVerified": true
  }
}
```

**Response when not authenticated**:
```json
{
  "isAuthenticated": false,
  "isLoading": false
}
```

**Response when session expired**:
```json
{
  "isAuthenticated": false,
  "isLoading": false,
  "sessionExpired": true,
  "message": "Session expired. Please log in again.",
  "code": "SESSION_EXPIRED"
}
```

## 🎯 Frontend Integration Guide

### 1. Auth Context Setup
```javascript
// Use check-auth endpoint on app mount to initialize auth state
useEffect(() => {
  const checkAuth = async () => {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/auth/check-auth', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    const data = await response.json();
    setAuthState(data);
  };
  
  checkAuth();
}, []);
```

### 2. Handling Login Errors
```javascript
const handleLogin = async (email, password) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    
    const data = await response.json();
    
    // Handle specific error cases
    if (data.code === 'INVALID_CREDENTIALS') {
      showError('Invalid email or password');
    } else if (data.code === 'UNVERIFIED_ACCOUNT') {
      showError('Please verify your email first', {
        action: 'Resend Verification Email',
        onClick: () => resendVerification(data.email)
      });
    }
  } catch (error) {
    showError('Login failed');
  }
};
```

### 3. Graceful Session Expiration Handling
```javascript
// In API interceptor/middleware
if (error.response?.status === 401 && error.response?.data?.sessionExpired) {
  // Clear auth state
  localStorage.removeItem('token');
  
  // Show user-friendly message
  showNotification('Your session has expired. Please log in again.');
  
  // Redirect to login
  navigate('/login');
}
```

## 📊 Error Codes Reference

| Code | Status | Meaning |
|------|--------|---------|
| `INVALID_CREDENTIALS` | 401 | Email/password mismatch |
| `UNVERIFIED_ACCOUNT` | 403 | User email not verified |
| `SESSION_EXPIRED` | 401 | Access token expired |
| `INVALID_TOKEN` | 403 | Malformed/invalid token |
| `NO_TOKEN` | 401 | No token provided |

## 🔒 Security Considerations

1. **Credential Privacy**: Login errors don't reveal whether email or password is wrong
2. **Generic Messages**: Used for public-facing error messages
3. **Error Codes**: Provided for programmatic handling without exposing sensitive details
4. **Token Rotation**: Refresh tokens are still being rotated on use
5. **Session Tracking**: `check-auth` doesn't create new tokens, just validates existing ones

## 🧪 Testing Checklist

- [ ] Invalid email on login returns `INVALID_CREDENTIALS`
- [ ] Invalid password on login returns `INVALID_CREDENTIALS`
- [ ] Unverified user gets `UNVERIFIED_ACCOUNT` on login
- [ ] Verified user can login successfully
- [ ] Expired token returns `SESSION_EXPIRED` with `sessionExpired: true`
- [ ] `check-auth` with valid token returns user info
- [ ] `check-auth` with expired token returns `sessionExpired: true`
- [ ] `check-auth` without token returns `isAuthenticated: false`

## 📝 Files Modified

1. **middleware/auth.js**
   - Enhanced `authenticateToken()` to differentiate token expiration
   - Added error codes and detailed error messages

2. **routes/auth.js**
   - Enhanced `/login` with structured error responses
   - Added new GET `/check-auth` endpoint for auth state checking
