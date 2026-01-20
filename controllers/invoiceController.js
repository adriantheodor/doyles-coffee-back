// controllers/invoiceController.js
const Invoice = require("../models/Invoice");
const User = require("../models/User");
const { sendInvoiceEmail } = require("../utils/sendEmail");
const fs = require("fs");
const path = require("path");

// Upload invoice - Admin only
exports.uploadInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { customerId, totalAmount, notes, invoiceId } = req.body;

    // Validate customerId
    const customer = await User.findById(customerId);
    if (!customer) {
      // Clean up uploaded file if customer not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Customer not found" });
    }

    // Create invoice record
    const invoice = new Invoice({
      customer: customerId,
      fileUrl: `/uploads/invoices/${req.file.filename}`,
      fileName: req.file.originalname,
      totalAmount: totalAmount || 0,
      notes: notes || "",
      sentBy: req.user.id,
    });

    await invoice.save();

    res.status(201).json({
      message: "Invoice uploaded successfully",
      invoice: {
        _id: invoice._id,
        fileName: invoice.fileName,
        fileUrl: invoice.fileUrl,
        totalAmount: invoice.totalAmount,
        customer: customer.name,
        createdAt: invoice.createdAt,
      },
    });
  } catch (err) {
    // Clean up file if error occurs
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Invoice upload error:", err);
    res.status(500).json({ message: "Failed to upload invoice" });
  }
};

// Send invoice to customer - Admin only
exports.sendInvoiceToCustomer = async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { customerId } = req.body;

    const invoice = await Invoice.findById(invoiceId).populate("customer");
    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Verify the customerId matches if provided
    if (customerId && customerId !== invoice.customer._id.toString()) {
      return res.status(400).json({
        message: "Customer ID does not match invoice",
      });
    }

    const customer = invoice.customer;

    // Send email
    await sendInvoiceEmail({
      to: customer.email,
      customerName: customer.name,
      invoiceId: invoice._id,
      fileName: invoice.fileName,
      notes: invoice.notes,
    });

    // Update invoice status
    invoice.isSent = true;
    invoice.sentAt = new Date();
    invoice.sentBy = req.user.id;
    await invoice.save();

    res.json({
      message: "Invoice sent successfully",
      invoice: {
        _id: invoice._id,
        customer: customer.email,
        isSent: invoice.isSent,
        sentAt: invoice.sentAt,
      },
    });
  } catch (err) {
    console.error("Invoice send error:", err);
    res.status(500).json({ message: "Failed to send invoice" });
  }
};

// Upload and Send in one request - Admin only
exports.uploadAndSendInvoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { customerId, totalAmount, notes } = req.body;

    // Validate customerId
    const customer = await User.findById(customerId);
    if (!customer) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: "Customer not found" });
    }

    // Create invoice record
    const invoice = new Invoice({
      customer: customerId,
      fileUrl: `/uploads/invoices/${req.file.filename}`,
      fileName: req.file.originalname,
      totalAmount: totalAmount || 0,
      notes: notes || "",
      sentBy: req.user.id,
      isSent: true,
      sentAt: new Date(),
    });

    await invoice.save();

    // Send email
    await sendInvoiceEmail({
      to: customer.email,
      customerName: customer.name,
      invoiceId: invoice._id,
      fileName: invoice.fileName,
      notes: invoice.notes,
    });

    res.status(201).json({
      message: "Invoice uploaded and sent successfully",
      invoice: {
        _id: invoice._id,
        fileName: invoice.fileName,
        fileUrl: invoice.fileUrl,
        totalAmount: invoice.totalAmount,
        customer: customer.name,
        customerEmail: customer.email,
        isSent: true,
        sentAt: invoice.sentAt,
        createdAt: invoice.createdAt,
      },
    });
  } catch (err) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error("Invoice upload and send error:", err);
    res.status(500).json({ message: "Failed to upload and send invoice" });
  }
};

// Get all invoices sent by admin - Admin only
exports.getAllInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("customer", "name email")
      .populate("sentBy", "name email")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (err) {
    console.error("Fetch invoices error:", err);
    res.status(500).json({ message: "Failed to fetch invoices" });
  }
};

// Get customer invoices
exports.getMyInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ customer: req.user.id })
      .populate("sentBy", "name email")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (err) {
    console.error("Fetch my invoices error:", err);
    res.status(500).json({ message: "Failed to fetch your invoices" });
  }
};

// Get specific invoice - Customer can only see their own
exports.getInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("customer", "name email")
      .populate("sentBy", "name email");

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Check authorization
    if (
      req.user.role !== "admin" &&
      invoice.customer._id.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(invoice);
  } catch (err) {
    console.error("Fetch invoice error:", err);
    res.status(500).json({ message: "Failed to fetch invoice" });
  }
};

// Delete invoice - Admin only
exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    // Delete file from disk
    if (invoice.fileUrl) {
      const filePath = path.join(__dirname, "..", invoice.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
    console.error("Delete invoice error:", err);
    res.status(500).json({ message: "Failed to delete invoice" });
  }
};

// Get invoice by customer ID - Admin only
exports.getCustomerInvoices = async (req, res) => {
  try {
    const { customerId } = req.params;

    const customer = await User.findById(customerId);
    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const invoices = await Invoice.find({ customer: customerId })
      .populate("sentBy", "name email")
      .sort({ createdAt: -1 });

    res.json({
      customer: {
        _id: customer._id,
        name: customer.name,
        email: customer.email,
      },
      invoices,
    });
  } catch (err) {
    console.error("Fetch customer invoices error:", err);
    res.status(500).json({ message: "Failed to fetch customer invoices" });
  }
};
