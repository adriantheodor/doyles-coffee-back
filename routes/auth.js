// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const router = express.Router();
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { sendVerificationEmail } = require("../utils/sendEmail");
const { loginLimiter, signupLimiter, passwordResetLimiter, verificationEmailLimiter } = require("../middleware/rateLimiter");
const { logAudit, getClientIp } = require("../utils/auditLogger");

// =========================
// 🔐 ENV + SECURITY SECTION
// =========================
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET not set in .env");
  process.exit(1);
}

const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "20m";
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || "14", 10);

// =========================
// 🔐 TOKEN HELPERS
// =========================
function createAccessToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

function createRefreshTokenString() {
  return crypto.randomBytes(64).toString("hex");
}

// =========================
// 🔐 CHANGE PASSWORD
// =========================
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// =========================
// 👤 REGISTER (Public)
// =========================

router.post("/register", signupLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  const ipAddress = getClientIp(req);

  if (!name || !email || !password)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      // Log failed registration attempt (user already exists)
      await logAudit({
        userEmail: email,
        action: "REGISTER",
        resourceType: "User",
        method: "POST",
        endpoint: "/api/auth/register",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "FAILURE",
        statusCode: 400,
        description: "Registration attempt with existing email",
      });
      return res.status(400).json({ message: "User already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationTokenExpiresAt = new Date();
    verificationTokenExpiresAt.setHours(verificationTokenExpiresAt.getHours() + TOKEN_EXPIRES_HOURS);

    const newUser = new User({
      name,
      email,
      password: hash,
      role: "customer",
      isVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
    });

    await newUser.save();

    // Log successful registration
    await logAudit({
      userId: newUser._id,
      userEmail: newUser.email,
      userRole: "customer",
      action: "REGISTER",
      resourceType: "User",
      resourceId: newUser._id,
      resourceName: `User: ${newUser.name}`,
      method: "POST",
      endpoint: "/api/auth/register",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      statusCode: 201,
      description: "New user registration",
    });

    // Send verification email
    try {
      await sendVerificationEmail(newUser, verificationToken);
      res.status(201).json({
        message: "Registration successful. Please check your email to verify your account.",
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // User is created but email failed to send
      res.status(201).json({
        message: "Registration successful, but verification email could not be sent. Please contact support.",
      });
    }
  } catch (err) {
    console.error("REGISTRATION ERROR:", err);

    // Log registration error
    await logAudit({
      userEmail: email,
      action: "REGISTER",
      resourceType: "User",
      method: "POST",
      endpoint: "/api/auth/register",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "FAILURE",
      statusCode: 500,
      errorMessage: err.message,
      description: "Registration error",
    });

    res.status(500).json({ message: "Server error during registration" });
  }
});

// =========================
// 🔄 REFRESH ACCESS TOKEN
// =========================
router.post("/refresh", async (req, res) => {
  try {
    const refreshString = req.cookies?.refreshToken;
    if (!refreshString)
      return res.status(401).json({ message: "No refresh token" });

    const doc = await RefreshToken.findOne({ token: refreshString }).populate(
      "user"
    );

    if (!doc) return res.status(403).json({ message: "Invalid refresh token" });

    if (new Date() > doc.expiresAt) {
      await doc.deleteOne();
      return res.status(403).json({ message: "Refresh token expired" });
    }

    const user = doc.user;
    if (!user) {
      await doc.deleteOne();
      return res.status(403).json({ message: "Invalid token" });
    }

    // ♻️ Rotate refresh token
    const newRefreshString = createRefreshTokenString();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_DAYS);

    doc.token = newRefreshString;
    doc.expiresAt = newExpiresAt;
    await doc.save();

    // ✅ FIXED: Used 'newRefreshString' and 'newExpiresAt'
    res.cookie("refreshToken", newRefreshString, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".doylesbreakroomservices.com",
      expires: newExpiresAt,
    });

    // Issue NEW access token
    const accessToken = createAccessToken(user);

    res.json({ token: accessToken });
  } catch (err) {
    console.error("REFRESH ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// 📬 VERIFY EMAIL (New Route)
// =========================
router.post("/verify-email", async (req, res) => {
  const { token } = req.body;
  const ipAddress = getClientIp(req);

  if (!token) {
    // Log failed verification attempt
    await logAudit({
      action: "VERIFY_EMAIL",
      resourceType: "Auth",
      method: "POST",
      endpoint: "/api/auth/verify-email",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "FAILURE",
      statusCode: 400,
      description: "Email verification attempt with no token",
    });

    return res.status(400).json({ message: "No token provided" });
  }

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      // Log failed verification attempt (invalid token)
      await logAudit({
        action: "VERIFY_EMAIL",
        resourceType: "Auth",
        method: "POST",
        endpoint: "/api/auth/verify-email",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "FAILURE",
        statusCode: 400,
        description: "Email verification attempt with invalid token",
      });

      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Check token expiration
    if (user.verificationTokenExpiresAt && new Date() > user.verificationTokenExpiresAt) {
      // Log failed verification attempt (expired token)
      await logAudit({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: "VERIFY_EMAIL",
        resourceType: "Auth",
        resourceId: user._id,
        method: "POST",
        endpoint: "/api/auth/verify-email",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "FAILURE",
        statusCode: 400,
        description: "Email verification attempt with expired token",
      });

      return res.status(400).json({ message: "Verification token has expired" });
    }

    // Verify the user
    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpiresAt = undefined;
    user.verificationEmailResendCount = 0;
    await user.save();

    // Log successful email verification
    await logAudit({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: "VERIFY_EMAIL",
      resourceType: "Auth",
      resourceId: user._id,
      method: "POST",
      endpoint: "/api/auth/verify-email",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      statusCode: 200,
      description: "Email verification successful",
    });

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error(err);

    // Log verification error
    await logAudit({
      action: "VERIFY_EMAIL",
      resourceType: "Auth",
      method: "POST",
      endpoint: "/api/auth/verify-email",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "FAILURE",
      statusCode: 500,
      errorMessage: err.message,
      description: "Email verification server error",
    });

    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// 📧 RESEND VERIFICATION EMAIL
// =========================
// Rate-limit: Max 3 resends per 15 minutes
const RESEND_MAX_ATTEMPTS = 3;
const RESEND_WINDOW_MINUTES = 15;
const TOKEN_EXPIRES_HOURS = 24;

router.post("/resend-verification-email", verificationEmailLimiter, async (req, res) => {
  const { email } = req.body;
  const ipAddress = getClientIp(req);

  if (!email) {
    // Log missing email error
    await logAudit({
      action: "RESEND_EMAIL",
      resourceType: "Auth",
      method: "POST",
      endpoint: "/api/auth/resend-verification-email",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "FAILURE",
      statusCode: 400,
      description: "Resend email attempt with no email provided",
    });

    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });

    // Always return a generic success message for security (don't reveal if email exists)
    const successMessage = "If an unverified account exists with this email, a verification email has been sent.";

    if (!user) {
      // Log resend attempt for non-existent user (don't log actual failure for security)
      await logAudit({
        userEmail: email,
        action: "RESEND_EMAIL",
        resourceType: "Auth",
        method: "POST",
        endpoint: "/api/auth/resend-verification-email",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "SUCCESS",
        statusCode: 200,
        description: "Resend email request (user not found - generic response)",
      });

      return res.status(200).json({ message: successMessage });
    }

    // If already verified, return success (don't reveal status)
    if (user.isVerified) {
      // Log resend attempt for already verified user
      await logAudit({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: "RESEND_EMAIL",
        resourceType: "Auth",
        resourceId: user._id,
        method: "POST",
        endpoint: "/api/auth/resend-verification-email",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "SUCCESS",
        statusCode: 200,
        description: "Resend email request for already verified user",
      });

      return res.status(200).json({ message: successMessage });
    }

    // =========================
    // 🔒 RATE-LIMITING CHECK
    // =========================
    if (user.lastVerificationEmailSentAt) {
      const timeSinceLastResend = new Date() - new Date(user.lastVerificationEmailSentAt);
      const minutesSinceLastResend = timeSinceLastResend / (1000 * 60);

      // Check if within the resend window and exceeded max attempts
      if (minutesSinceLastResend < RESEND_WINDOW_MINUTES && user.verificationEmailResendCount >= RESEND_MAX_ATTEMPTS) {
        console.warn(`⚠️ Rate limit exceeded for user: ${email}`);

        // Log rate limit hit (but return generic success for security)
        await logAudit({
          userId: user._id,
          userEmail: user.email,
          userRole: user.role,
          action: "RESEND_EMAIL",
          resourceType: "Auth",
          resourceId: user._id,
          method: "POST",
          endpoint: "/api/auth/resend-verification-email",
          ipAddress,
          userAgent: req.get("user-agent"),
          status: "FAILURE",
          statusCode: 200,
          description: "Rate limit exceeded for resend email",
        });

        return res.status(200).json({ message: successMessage }); // Return success anyway for security
      }

      // Reset counter if outside the window
      if (minutesSinceLastResend >= RESEND_WINDOW_MINUTES) {
        user.verificationEmailResendCount = 0;
      }
    }

    // =========================
    // 🔑 GENERATE NEW TOKEN
    // =========================
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRES_HOURS);

    // Update user with new token and tracking info
    user.verificationToken = verificationToken;
    user.verificationTokenExpiresAt = expiresAt;
    user.lastVerificationEmailSentAt = new Date();
    user.verificationEmailResendCount = (user.verificationEmailResendCount || 0) + 1;

    await user.save();

    // =========================
    // 📧 SEND EMAIL (Fire and forget)
    // =========================
    // Send email but don't let failures affect the response
    sendVerificationEmail(user, verificationToken)
      .then(() => {
        console.log(`✅ Verification email resent to: ${user.email}`);
      })
      .catch((error) => {
        console.error(`❌ Failed to send verification email to ${user.email}:`, error.message);
        // Don't throw - email service failures shouldn't fail the request
      });

    // Log successful resend email
    await logAudit({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: "RESEND_EMAIL",
      resourceType: "Auth",
      resourceId: user._id,
      method: "POST",
      endpoint: "/api/auth/resend-verification-email",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      statusCode: 200,
      description: "Verification email resent successfully",
    });

    // Return success message regardless of email status
    res.status(200).json({ message: successMessage });

  } catch (err) {
    console.error("RESEND VERIFICATION EMAIL ERROR:", err);

    // Log resend email error
    await logAudit({
      userEmail: email,
      action: "RESEND_EMAIL",
      resourceType: "Auth",
      method: "POST",
      endpoint: "/api/auth/resend-verification-email",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "FAILURE",
      statusCode: 500,
      errorMessage: err.message,
      description: "Resend email server error",
    });

    // Return generic success for security
    res.status(200).json({ message: "If an unverified account exists with this email, a verification email has been sent." });
  }
});

// =========================
// 🔐 LOGIN
// =========================
router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body;
  const ipAddress = getClientIp(req);
  
  try {
    const user = await User.findOne({ email });
    if (!user) {
      // Log failed login attempt
      await logAudit({
        userEmail: email,
        action: "FAILED_LOGIN",
        resourceType: "Auth",
        method: "POST",
        endpoint: "/api/auth/login",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "FAILURE",
        statusCode: 401,
        description: "Login attempt with non-existent email",
      });

      return res.status(401).json({ 
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        field: null
      });
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      // Log failed login attempt (wrong password)
      await logAudit({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: "FAILED_LOGIN",
        resourceType: "Auth",
        resourceId: user._id,
        method: "POST",
        endpoint: "/api/auth/login",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "FAILURE",
        statusCode: 401,
        description: "Login attempt with incorrect password",
      });

      return res.status(401).json({ 
        message: "Invalid credentials",
        code: "INVALID_CREDENTIALS",
        field: null
      });
    }

    // Check if email is verified
    if (!user.isVerified) {
      // Log unverified account login attempt
      await logAudit({
        userId: user._id,
        userEmail: user.email,
        userRole: user.role,
        action: "FAILED_LOGIN",
        resourceType: "Auth",
        resourceId: user._id,
        method: "POST",
        endpoint: "/api/auth/login",
        ipAddress,
        userAgent: req.get("user-agent"),
        status: "FAILURE",
        statusCode: 403,
        description: "Login attempt with unverified email",
      });

      return res.status(403).json({ 
        message: "Please verify your email before logging in",
        code: "UNVERIFIED_ACCOUNT",
        unverified: true,
        email: user.email
      });
    }

    // Access token
    const accessToken = createAccessToken(user);

    // Refresh token
    const refreshString = createRefreshTokenString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    await new RefreshToken({
      token: refreshString,
      user: user._id,
      expiresAt,
    }).save();

    // Log successful login
    await logAudit({
      userId: user._id,
      userEmail: user.email,
      userRole: user.role,
      action: "LOGIN",
      resourceType: "Auth",
      resourceId: user._id,
      method: "POST",
      endpoint: "/api/auth/login",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      statusCode: 200,
      description: "Successful login",
    });

    res.cookie("refreshToken", refreshString, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".doylesbreakroomservices.com",
      expires: expiresAt,
    });

    res.json({
      token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);

    // Log login error
    await logAudit({
      userEmail: email,
      action: "FAILED_LOGIN",
      resourceType: "Auth",
      method: "POST",
      endpoint: "/api/auth/login",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "FAILURE",
      statusCode: 500,
      errorMessage: err.message,
      description: "Login server error",
    });

    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// � CHECK AUTH STATUS & LOADING STATE
// =========================
router.get("/check-auth", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      return res.json({ 
        isAuthenticated: false,
        isLoading: false
      });
    }

    jwt.verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.json({ 
            isAuthenticated: false,
            isLoading: false,
            sessionExpired: true,
            message: "Session expired. Please log in again.",
            code: "SESSION_EXPIRED"
          });
        }
        return res.json({ 
          isAuthenticated: false,
          isLoading: false
        });
      }

      // Token is valid, fetch current user
      try {
        const user = await User.findById(decoded.id).select("-password");
        if (!user) {
          return res.json({ 
            isAuthenticated: false,
            isLoading: false
          });
        }

        res.json({
          isAuthenticated: true,
          isLoading: false,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isVerified: user.isVerified
          }
        });
      } catch (dbErr) {
        console.error("Error fetching user:", dbErr);
        res.json({ 
          isAuthenticated: false,
          isLoading: false
        });
      }
    });
  } catch (err) {
    console.error("CHECK AUTH ERROR:", err);
    res.status(500).json({ 
      isAuthenticated: false,
      isLoading: false,
      message: "Server error"
    });
  }
});

// =========================
// �🚪 LOGOUT
// =========================
router.post("/logout", authenticateToken, async (req, res) => {
  const ipAddress = getClientIp(req);

  try {
    const refreshString = req.cookies?.refreshToken;

    if (refreshString) {
      await RefreshToken.deleteOne({ token: refreshString });
    }

    await RefreshToken.deleteMany({ user: req.user.id });

    // Log successful logout
    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: "LOGOUT",
      resourceType: "Auth",
      resourceId: req.user.id,
      method: "POST",
      endpoint: "/api/auth/logout",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "SUCCESS",
      statusCode: 200,
      description: "User logout",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".doylesbreakroomservices.com", // Added domain to ensure clear works
    });

    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);

    // Log logout error
    await logAudit({
      userId: req.user.id,
      userRole: req.user.role,
      action: "LOGOUT",
      resourceType: "Auth",
      resourceId: req.user.id,
      method: "POST",
      endpoint: "/api/auth/logout",
      ipAddress,
      userAgent: req.get("user-agent"),
      status: "FAILURE",
      statusCode: 500,
      errorMessage: err.message,
      description: "Logout server error",
    });

    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// � GET CURRENT USER
// =========================
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    });
  } catch (err) {
    console.error("GET ME ERROR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// �🔒 CHANGE PASSWORD ROUTE
// =========================
router.post("/change-password", authenticateToken, changePassword);
// =========================
// 📋 AUDIT LOG ENDPOINTS (Admin Only)
// =========================
const { getAuditLogs, getUserActivity, getResourceHistory } = require("../utils/auditLogger");

// Get all audit logs with filtering
router.get("/admin/audit-logs", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { userId, action, resourceType, resourceId, startDate, endDate, limit = 100, skip = 0 } = req.query;

    const filters = {
      limit: parseInt(limit),
      skip: parseInt(skip),
    };

    if (userId) filters.userId = userId;
    if (action) filters.action = action;
    if (resourceType) filters.resourceType = resourceType;
    if (resourceId) filters.resourceId = resourceId;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;

    const { logs, total } = await getAuditLogs(filters);

    res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        limit: filters.limit,
        skip: filters.skip,
        pages: Math.ceil(total / filters.limit),
      },
    });
  } catch (err) {
    console.error("Error fetching audit logs:", err);
    res.status(500).json({ success: false, message: "Error fetching audit logs" });
  }
});

// Get activity history for a specific user
router.get("/admin/audit-logs/user/:userId", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await getUserActivity(userId, parseInt(limit));

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error("Error fetching user activity:", err);
    res.status(500).json({ success: false, message: "Error fetching user activity" });
  }
});

// Get resource history (what changes were made to a resource)
router.get("/admin/audit-logs/resource/:resourceType/:resourceId", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { resourceType, resourceId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await getResourceHistory(resourceType, resourceId, parseInt(limit));

    res.json({
      success: true,
      data: logs,
    });
  } catch (err) {
    console.error("Error fetching resource history:", err);
    res.status(500).json({ success: false, message: "Error fetching resource history" });
  }
});
module.exports = router;
