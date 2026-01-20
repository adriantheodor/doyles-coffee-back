// middleware/auth.js
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ 
    message: "No token provided",
    code: "NO_TOKEN"
  });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      // Differentiate between token expiration and other errors
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ 
          message: "Session expired. Please log in again.",
          code: "SESSION_EXPIRED",
          sessionExpired: true
        });
      }
      return res.status(403).json({ 
        message: "Invalid token",
        code: "INVALID_TOKEN"
      });
    }

    req.user = {
      id: decoded.id,
      role: decoded.role,
    };

    next();
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== role) {
      return res.status(403).json({ message: "Forbidden: Insufficient role" });
    }
    next();
  };
}

module.exports = {
  authenticateToken,
  requireRole,
};