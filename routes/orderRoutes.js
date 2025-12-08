// routes/orderRoutes.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const { authenticateToken, requireRole } = require("../middleware/auth");

// CREATE new order (customer)
router.post("/", authenticateToken, async (req, res) => {
  try {
    const { items, notes } = req.body;

    if (!items || !items.length)
      return res.status(400).json({ message: "Order must include items." });

    // Fetch product prices
    const productIds = items.map((i) => i.product);
    const products = await Product.find({ _id: { $in: productIds } });

    // Calculate total price
    let totalPrice = 0;
    items.forEach((item) => {
      const product = products.find((p) => p._id.toString() === item.product);
      if (product) {
        totalPrice += product.price * item.quantity;
      }
    });

    const order = new Order({
      customer: req.user.id,
      items,
      notes: notes || "",
      totalPrice,
    });

    await order.save();

    res.status(201).json(order);
  } catch (err) {
    console.error("ORDER CREATE ERROR:", err);
    res.status(500).json({ message: "Error creating order" });
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
    const orders = await Order.find({ customer: req.user.id }).populate(
      "items.product"
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

// COMPLETE ORDER (admin)
router.put(
  "/:id/complete",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const order = await Order.findById(req.params.id).populate(
        "items.product"
      );

      if (!order) return res.status(404).json({ message: "Order not found" });

      if (order.status === "Fulfilled") {
        return res.status(400).json({ message: "Order already completed" });
      }

      // Deduct stock
      for (const item of order.items) {
        const product = item.product;

        // SAFETY CHECK: Handle deleted products
        if (!product) {
          return res.status(400).json({
            message: `Cannot fulfill order. Product with ID ${item.product} no longer exists in the database.`,
          });
        }

        if (product.stock < item.quantity) {
          return res.status(400).json({
            message: `Insufficient stock for ${product.name}`,
          });
        }

        product.stock -= item.quantity;
        await product.save();
      }

      // Update order
      order.status = "Fulfilled";
      order.fulfilledAt = new Date();
      await order.save();

      // Create invoice
      const invoice = new Invoice({
        order: order._id,
        customer: order.customer,
        amount: order.totalPrice,
        items: order.items.map((i) => ({
          product: i.product._id,
          quantity: i.quantity,
          price: i.product.price,
        })),
      });

      await invoice.save();

      return res.json({
        message: "Order completed and invoice generated.",
        order,
        invoice,
      });
    } catch (err) {
      console.error("Complete Order Error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
