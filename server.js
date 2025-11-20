const path = require("path");
const dotenv = require("dotenv");
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");

// ✅ Force dotenv to load from the same folder as this file
dotenv.config({ path: path.resolve(__dirname, '.env') });

console.log('🔍 .env path:', path.resolve(__dirname, '.env'));
console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET ? 'Loaded ✅' : 'Not found ❌');

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

app.use(helmet());


app.use(
  cors({
    origin: [
      "http://doyles-coffee-front.vercel.app/",
      "http://www.doylesbreakroomservices.com/",
      "http://doylesbreakroomservices.com/",
    ],
    credentials: true,
  })
);



app.use(express.json());

// Routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/userRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const productRoutes = require("./routes/productRoutes");
const orderRoutes = require("./routes/orderRoutes");
const issueReportRoutes = require("./routes/issueReportRoutes");
const quoteRoutes = require("./routes/quoteRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/issues", issueReportRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/quotes", quoteRoutes);

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
