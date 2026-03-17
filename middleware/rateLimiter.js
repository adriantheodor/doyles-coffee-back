const rateLimit = require("express-rate-limit");

// =====================================================
// GLOBAL RATE LIMITERS
// =====================================================

// General API rate limiter - applies to all endpoints
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === "/";
  },
});

// =====================================================
// AUTH ROUTE LIMITERS
// =====================================================

// Strict limiter for login attempts
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per 15 minutes
  message: "Too many login attempts, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Limiter for signup
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 signup attempts per hour
  message: "Too many accounts created from this IP, please try again after an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for password reset requests
const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 password reset requests per 15 minutes
  message: "Too many password reset attempts, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for verification email resends
const verificationEmailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 3, // Limit each IP to 3 resend attempts per 15 minutes
  message: "Too many verification email requests, please try again after 15 minutes.",
  standardHeaders: true,
  legacyHeaders: false,
});

// =====================================================
// CREATE/UPDATE OPERATION LIMITERS
// =====================================================

// Limiter for creating/updating resources (invoices, products, orders, etc.)
const createUpdateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit to 30 requests per minute
  message: "Too many create/update requests, please try again after a minute.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for file uploads
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 uploads per hour
  message: "Too many file uploads, please try again after an hour.",
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  loginLimiter,
  signupLimiter,
  passwordResetLimiter,
  verificationEmailLimiter,
  createUpdateLimiter,
  uploadLimiter,
};
