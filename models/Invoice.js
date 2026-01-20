// models/Invoice.js
const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Order",
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  fileUrl: {
    type: String,  // PDF/IMG upload from admin
    default: "",
  },
  fileName: {
    type: String,
    default: "",
  },
  notes: {
    type: String,
    default: "",
  },
  totalAmount: {
    type: Number,
  },
  isSent: {
    type: Boolean,
    default: false,
  },
  sentAt: {
    type: Date,
    default: null,
  },
  sentBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model("Invoice", invoiceSchema);
