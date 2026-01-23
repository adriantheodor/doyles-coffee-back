// routes/productRoutes.js
const express = require("express");
const router = express.Router();
const Product = require("../models/Product");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { createUpdateLimiter } = require("../middleware/rateLimiter");

// GET all products (public)
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ stock: { $gt: 0 } });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: "Error retrieving products" });
  }
});

// GET single product by ID (public)
router.get("/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE new product (admin only)
router.post("/", authenticateToken, requireRole("admin"), createUpdateLimiter, async (req, res) => {
  try {
    const { name, price, stock, description } = req.body;

    // Validation
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ message: "Name is required and must be a non-empty string" });
    }

    if (price === undefined || typeof price !== "number" || price < 0) {
      return res.status(400).json({ message: "Price is required and must be a non-negative number" });
    }

    if (stock !== undefined && (typeof stock !== "number" || stock < 0)) {
      return res.status(400).json({ message: "Stock must be a non-negative number" });
    }

    const product = new Product({
      name: name.trim(),
      price,
      stock: stock || 0,
      description: description || "",
    });
    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error creating product", error: err.message });
  }
});

// UPDATE product (admin only)
router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { name, price, stock, description } = req.body;
      const updateData = {};

      // Validate and add to update object only if provided
      if (name !== undefined) {
        if (typeof name !== "string" || name.trim().length === 0) {
          return res.status(400).json({ message: "Name must be a non-empty string" });
        }
        updateData.name = name.trim();
      }

      if (price !== undefined) {
        if (typeof price !== "number" || price < 0) {
          return res.status(400).json({ message: "Price must be a non-negative number" });
        }
        updateData.price = price;
      }

      if (stock !== undefined) {
        if (typeof stock !== "number" || stock < 0) {
          return res.status(400).json({ message: "Stock must be a non-negative number" });
        }
        updateData.stock = stock;
      }

      if (description !== undefined) {
        updateData.description = description || "";
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No valid fields provided for update" });
      }

      const updated = await Product.findByIdAndUpdate(req.params.id, updateData, {
        new: true,
      });
      if (!updated)
        return res.status(404).json({ message: "Product not found" });
      res.json(updated);
    } catch (err) {
      res
        .status(400)
        .json({ message: "Error updating product", error: err.message });
    }
  }
);

// DELETE product (admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const deleted = await Product.findByIdAndDelete(req.params.id);
      if (!deleted)
        return res.status(404).json({ message: "Product not found" });
      res.json({ message: "Product deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting product" });
    }
  }
);

module.exports = router;
