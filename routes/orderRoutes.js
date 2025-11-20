// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { authenticateToken, requireRole } = require("../middleware/auth");

// CREATE new order (customer)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const newOrder = new Order({
      ...req.body,
      user: req.user.id, // from token
    });
    await newOrder.save();
    res.status(201).json(newOrder);
  } catch (err) {
    res.status(400).json({ message: "Error creating order", error: err.message });
  }
});

// GET all orders (admin)
router.get("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const orders = await Order.find().populate("user").populate("products.product");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching orders" });
  }
});

// GET my orders (customer)
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate("products.product");
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user orders" });
  }
});

// UPDATE order status (admin)
router.put("/:id/status", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: "Error updating order status" });
  }
});

// DELETE order (admin)
router.delete("/:id", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    await Order.findByIdAndDelete(req.params.id);
    res.json({ message: "Order deleted" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting order" });
  }
});

module.exports = router;
