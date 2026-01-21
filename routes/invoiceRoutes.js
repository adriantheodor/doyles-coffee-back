// routes/invoiceRoutes.js
const express = require("express");
const router = express.Router();
const Invoice = require("../models/Invoice");
const Order = require("../models/Order");
const invoiceController = require("../controllers/invoiceController");
const upload = require("../config/multer");
const PDFDocument = require("pdfkit");
const { authenticateToken, requireRole } = require("../middleware/auth");

// ================================
// FILE UPLOAD & SENDING ENDPOINTS
// ================================

// Upload invoice file - Admin only
router.post(
  "/upload",
  authenticateToken,
  requireRole("admin"),
  upload.single("invoice"),
  invoiceController.uploadInvoice
);

// Send already uploaded invoice to customer - Admin only
router.post(
  "/:id/send",
  authenticateToken,
  requireRole("admin"),
  invoiceController.sendInvoiceToCustomer
);

// Upload and send invoice in one request - Admin only
router.post(
  "/upload-and-send",
  authenticateToken,
  requireRole("admin"),
  upload.single("invoice"),
  invoiceController.uploadAndSendInvoice
);

// ================================
// EXISTING ENDPOINTS
// ================================

// GET all invoices (admin)
router.get("/", authenticateToken, requireRole("admin"), invoiceController.getAllInvoices);

// GET my invoices (customer)
router.get("/my-invoices/list", authenticateToken, invoiceController.getMyInvoices);

// GET invoices for specific customer (admin only)
router.get(
  "/customer/:customerId",
  authenticateToken,
  requireRole("admin"),
  invoiceController.getCustomerInvoices
);

// GET specific invoice
router.get(
  "/details/:id",
  authenticateToken,
  invoiceController.getInvoice
);

// DELETE invoice (admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  invoiceController.deleteInvoice
);

// CREATE invoice manually (admin only) - Legacy endpoint
router.post("/", authenticateToken, requireRole("admin"), async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) return res.status(404).json({ message: "Order not found" });

    const invoice = new Invoice({
      order: order._id,
      customer: order.customer,
      items: order.items,
      totalAmount: order.totalPrice,
      notes: order.notes,
    });

    await invoice.save();
    res.status(201).json(invoice);
  } catch (err) {
    console.error("Invoice create error:", err);
    res.status(500).json({ message: "Failed to create invoice" });
  }
});

// Generate PDF for invoice
router.get("/:id/pdf", authenticateToken, async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate({
        path: "order",
        populate: { path: "items.product" },
      })
      .populate("customer", "name email");

    if (!invoice) return res.status(404).json({ message: "Invoice not found" });

    // USER CAN DOWNLOAD ONLY THEIR OWN INVOICE
    // ADMINS CAN DOWNLOAD ALL
    if (
      req.user.role !== "admin" &&
      invoice.customer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const doc = new PDFDocument();
    
    // Handle errors on the document stream
    doc.on("error", (err) => {
      console.error("PDF generation error:", err);
      if (!res.headersSent) {
        res.status(500).json({ message: "Failed to generate PDF" });
      }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoice._id}.pdf"`);
    doc.pipe(res);

    // HEADER
    doc
      .fontSize(24)
      .text("Doyle's Coffee & Break Room Services", { align: "center" });
    doc.moveDown();
    doc.fontSize(16).text("INVOICE", { align: "center" });
    doc.moveDown(2);

    // CUSTOMER INFO
    doc.fontSize(12);
    doc.text(`Invoice ID: ${invoice._id}`);
    if (invoice.order) {
      doc.text(`Order ID: ${invoice.order._id}`);
    }
    const customerName = invoice.customer?.name || "Unknown Customer";
    const customerEmail = invoice.customer?.email || "N/A";
    doc.text(`Customer: ${customerName}`);
    doc.text(`Email: ${customerEmail}`);
    doc.text(`Date: ${new Date(invoice.createdAt).toLocaleDateString()}`);
    doc.moveDown();

    // ITEMS (if order exists)
    if (invoice.order && invoice.order.items) {
      doc.fontSize(14).text("Order Items:");
      doc.moveDown();

      invoice.order.items.forEach((item) => {
        // Safely handle null product references
        const productName = item.product?.name || "Unknown Product";
        const productPrice = item.product?.price || 0;
        doc
          .fontSize(12)
          .text(
            `${productName} — Qty: ${item.quantity} — $${productPrice.toFixed(2)}`
          );
      });

      doc.moveDown();
    }

    // NOTES
    if (invoice.notes) {
      doc.fontSize(14).text("Notes:");
      doc.fontSize(12).text(invoice.notes);
      doc.moveDown();
    }

    doc
      .fontSize(14)
      .text(`Total Amount: $${invoice.totalAmount?.toFixed(2) || "0.00"}`);

    doc.end();
  } catch (err) {
    console.error("PDF ERROR:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  }
});

module.exports = router;
