// routes/auth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const router = express.Router();
const User = require("../models/User");
const RefreshToken = require("../models/RefreshToken");
const { authenticateToken } = require("../middleware/auth");

// Configurable lifetimes
const ACCESS_TOKEN_EXPIRES = process.env.ACCESS_TOKEN_EXPIRES || "20m"; // 10-30m recommended
const REFRESH_TOKEN_DAYS = parseInt(process.env.REFRESH_TOKEN_DAYS || "14", 10); // 7-30 days

function createAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), role: user.role },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRES }
  );
}

function createRefreshTokenString() {
  // random string (not JWT) to store server-side (you can also use JWT)
  return crypto.randomBytes(64).toString("hex");
}


// Define the changePassword handler here
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Get user from token
    const user = await User.findById(req.user.userId); 
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Current password is incorrect" });

    // Hash and update new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};


const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error("JWT_SECRET not set. Please set it in .env");
  process.exit(1);
}

// Register
router.post('/register', async (req, res) => {
  const { name, email, password, role = 'customer' } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'User already exists' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const newUser = new User({ name, email, password: hash, role });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });
    res.status(201).json({ token, user: { id: newUser._id, name: newUser.name, role: newUser.role } });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Refresh endpoint: exchanges a valid refresh cookie for a new access token (optionally rotate refresh)
router.post("/refresh", async (req, res) => {
  try {
    const refreshString = req.cookies?.refreshToken;
    if (!refreshString) return res.status(401).json({ message: "No refresh token" });

    const doc = await RefreshToken.findOne({ token: refreshString }).populate("user");
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

    // optionally rotate refresh token: generate new token and replace DB & cookie
    const newRefreshString = createRefreshTokenString();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + REFRESH_TOKEN_DAYS);

    doc.token = newRefreshString;
    doc.expiresAt = newExpiresAt;
    await doc.save();

    // set new cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      expires: newExpiresAt
    };
    res.cookie("refreshToken", newRefreshString, cookieOptions);

    // issue new access token
    const accessToken = createAccessToken(user);

    res.json({ token: accessToken });
  } catch (err) {
    console.error("REFRESH ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login: returns access token, sets refresh cookie
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // TODO: replace with your password check (bcrypt)
    const passwordMatches = await user.comparePassword
      ? await user.comparePassword(password)
      : user.password === password;

    if (!passwordMatches) return res.status(401).json({ message: "Invalid credentials" });

    const accessToken = createAccessToken(user);
    const refreshString = createRefreshTokenString();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

    const refreshDoc = new RefreshToken({
      token: refreshString,
      user: user._id,
      expiresAt
    });
    await refreshDoc.save();

    // Set HttpOnly cookie for refresh token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none", // if your frontend is on different domain (Vercel) — set to 'none' and use secure
      expires: expiresAt
    };

    res.cookie("refreshToken", refreshString, cookieOptions);

    // Return access token and user profile
    res.json({ token: accessToken, user: { name: user.name, email: user.email, role: user.role, id: user._id } });
  } catch (err) {
    console.error("LOGIN ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});


// Logout: remove refresh token cookie & DB entry (optional)
router.post("/logout", async (req, res) => {
  try {
    const refreshString = req.cookies?.refreshToken;
    if (refreshString) {
      await RefreshToken.deleteOne({ token: refreshString });
    }
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none"
    });
    res.json({ message: "Logged out" });
  } catch (err) {
    console.error("LOGOUT ERR:", err);
    res.status(500).json({ message: "Server error" });
  }
});

console.log("authenticateToken:", authenticateToken);
console.log("changePassword:", changePassword);
// Register the route
router.post("/change-password", authenticateToken, changePassword);

module.exports = router;
