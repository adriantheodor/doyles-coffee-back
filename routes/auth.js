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

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    const newUser = new User({
      name,
      email,
      password: hash,
      role: "customer",
      isVerified: false,
      verificationToken,
    });

    await newUser.save();

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
  const { token } = req.body; // Frontend sends this from the URL query param

  if (!token) return res.status(400).json({ message: "No token provided" });

  try {
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Verify the user
    user.isVerified = true;
    user.verificationToken = undefined; // Clear the token so it can't be reused
    await user.save();

    res.json({ message: "Email verified successfully! You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// 🔐 LOGIN
// =========================
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches)
      return res.status(401).json({ message: "Invalid credentials" });

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

    // ✅ FIXED: Used 'refreshString' instead of 'refreshToken'
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
    res.status(500).json({ message: "Server error" });
  }
});

// =========================
// 🚪 LOGOUT
// =========================
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    const refreshString = req.cookies?.refreshToken;

    if (refreshString) {
      await RefreshToken.deleteOne({ token: refreshString });
    }

    await RefreshToken.deleteMany({ user: req.user.id });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      domain: ".doylesbreakroomservices.com", // Added domain to ensure clear works
    });

    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("LOGOUT ERROR:", err);
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

module.exports = router;
