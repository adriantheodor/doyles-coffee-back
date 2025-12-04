// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const { authenticateToken, requireRole } = require("../middleware/auth");

// CREATE new order (customer)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { items, notes } = req.body;

    // Calculate total
    let total = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      total += product.price * item.quantity;
    }

    const order = new Order({
      customer: req.user.id,
      items,
      notes,
      totalPrice: total,
    });

    await order.save();

    res.status(201).json(order);
  } catch (err) {
    res
      .status(400)
      .json({ message: "Error creating order", error: err.message });
  }
});

// GET all orders (admin)
router.get("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate("customer", "name email")
      .populate("items.product", "name price");

    res.json(orders);
  } catch (err) {
    console.error("Order Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

// GET my orders (customer)
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id }).populate(
      "products.product"
    );
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: "Error fetching user orders" });
  }
});

// UPDATE order status (admin)
router.put(
  "/:id/status",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const updated = await Order.findByIdAndUpdate(
        req.params.id,
        { status: req.body.status },
        { new: true }
      );

      res.json(updated);
    } catch (err) {
      console.error("Order Status Error:", err);
      res.status(500).json({ message: "Failed to update status" });
    }
  }
);

// DELETE order (admin)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      await Order.findByIdAndDelete(req.params.id);
      res.json({ message: "Order deleted" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting order" });
    }
  }
);

module.exports = router;
