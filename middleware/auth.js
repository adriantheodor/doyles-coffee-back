// middleware/auth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT VERIFY ERROR:", err);
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Ensure correct decoding
    req.user = {
      id: decoded.userId ?? decoded.id, // support both formats
      role: decoded.role,
      email: decoded.email ?? null,
    };

    // Safety check: missing role
    if (!req.user.role) {
      console.warn("JWT decoded but missing role:", decoded);
    }

    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }

    next();
  };
}

module.exports = { authenticateToken, requireRole };
