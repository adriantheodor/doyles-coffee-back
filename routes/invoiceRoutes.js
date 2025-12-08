// routes/invoiceRoutes.js
const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Order = require("../models/Order");
const PDFDocument = require("pdfkit");
const { authenticateToken, requireRole } = require("../middleware/auth");

// GET all invoices (admin)
router.get("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("order")
      .populate("customer", "name email");
    res.json(invoices);
  } catch (err) {
    console.error("Invoice Fetch Error:", err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
});

// GET my invoices (customer)
router.get("/my", authenticateToken, async (req, res) => {
  try {
    const invoices = await Invoice.find({ customer: req.user.id }).populate(
      "order"
    );
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch your invoices" });
  }
});

// CREATE invoice manually (admin only)
router.post("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    const invoice = new Invoice({
      order: order._id,
      customer: order.customer,
      items: order.items,
      totalPrice: order.totalPrice,
      notes: order.notes,
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    console.error("Invoice create error:", err);
    res.status(500).json({ message: "Failed to create invoice" });
  }
});

router.get("/:id/pdf", authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({
        path: "order",
        populate: {
          path: "items.product",
          model: "Product",
        },
      })
      .populate("customer", "name email");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // ------------------------------------
    // 🔐 AUTHORIZATION CHECK
    // ------------------------------------
    const isAdmin = req.user.role === "admin";
    const isOwner = invoice.customer?._id.toString() === req.user.id;

    if (!isAdmin && !isOwner) {
      return res
        .status(403)
        .json({ message: "You are not authorized to view this invoice" });
    }

    // ------------------------------------
    // PDF HEADERS
    // ------------------------------------
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${invoice._id}.pdf`
    );

    const doc = new PDFDocument();
    doc.pipe(res);

    // -----------------------------
    // Invoice Header
    // -----------------------------
    doc
      .fontSize(24)
      .text("Doyle's Coffee & Break Room Services", { align: "center" });
    doc.fontSize(16).text("INVOICE", { align: "center" }).moveDown(2);

    // -----------------------------
    // Customer & Invoice Details
    // -----------------------------
    doc.fontSize(12).text(`Invoice ID: ${invoice._id}`);
    doc.text(`Order ID: ${invoice.order._id}`);
    doc.text(`Customer: ${invoice.customer.name}`);
    doc.text(`Email: ${invoice.customer.email}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // -----------------------------
    // Items
    // -----------------------------
    doc.fontSize(14).text("Order Items:");
    doc.moveDown();

    invoice.order.items.forEach((item) => {
      doc
        .fontSize(12)
        .text(
          `${item.product.name} — Qty: ${item.quantity} — $${item.product.price} each`
        );
    });

    doc.moveDown();

    // -----------------------------
    // Total Amount
    // -----------------------------
    doc.fontSize(14).text(`Total Amount: $${invoice.totalAmount}`);

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    res.status(500).json({ message: "Failed to generate PDF" });
  }
});

module.exports = router;
