const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const { globalLimiter } = require("./middleware/rateLimiter");

// ✅ Force dotenv to load from the same folder as this file
dotenv.config({ path: path.resolve(__dirname, ".env") });

console.log("🔍 .env path:", path.resolve(__dirname, ".env"));
console.log(
  "🔍 JWT_SECRET:",
  process.env.JWT_SECRET ? "Loaded ✅" : "Not found ❌"
);

// ✅ Sanity checks for critical environment variables
if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET not set. Please set it in .env");
  process.exit(1);
}
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not set. Please set it in .env");
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ Trust proxy for X-Forwarded-For headers (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

app.use(helmet());

const allowedOrigins = [
  "https://www.doylesbreakroomservices.com",
  "https://doylesbreakroomservices.com",
  "https://api.doylesbreakroomservices.com",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        console.log("CORS blocked:", origin);
        cb(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// ✅ Apply global rate limiting to all routes (except health check)
app.use(globalLimiter);

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
const authRoutes = require("./routes/auth");

const invoiceRoutes = require("./routes/invoiceRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const issueReportRoutes = require("./routes/issueReportRoutes");
const quoteRoutes = require("./routes/quoteRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const imageRoutes = require("./routes/imageRoutes");
const onDemandOrderRoutes = require("./routes/onDemandOrderRoutes");

app.use("/api/auth", authRoutes);

app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/issues", issueReportRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/on-demand-orders", onDemandOrderRoutes);

// ✅ Default route for health check
app.get("/", (req, res) => {
  res.json({ message: "☕ Doyle's Coffee & Breakroom API is running!" });
});

// Connect to MongoDB
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is not set. Please set it in .env");
  process.exit(1);
}
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  });
