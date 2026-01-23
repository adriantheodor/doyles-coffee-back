// models/AuditLog.js
const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  // WHO - User performing the action
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null, // null for unauthenticated actions
  },
  userEmail: {
    type: String,
    default: null, // Stored as string for historical reference
  },
  userRole: {
    type: String,
    enum: ["admin", "customer"],
    default: null,
  },

  // WHAT - Action performed
  action: {
    type: String,
    enum: [
      "LOGIN",
      "LOGOUT",
      "REGISTER",
      "PASSWORD_CHANGE",
      "VERIFY_EMAIL",
      "RESEND_EMAIL",
      "PRODUCT_CREATE",
      "PRODUCT_UPDATE",
      "PRODUCT_DELETE",
      "ORDER_CREATE",
      "ORDER_UPDATE",
      "ORDER_DELETE",
      "INVOICE_UPLOAD",
      "INVOICE_SEND",
      "INVOICE_DELETE",
      "ISSUE_CREATE",
      "ISSUE_UPDATE",
      "ISSUE_DELETE",
      "QUOTE_CREATE",
      "QUOTE_UPDATE",
      "QUOTE_DELETE",
      "FAILED_LOGIN",
      "UNAUTHORIZED_ACCESS",
      "RATE_LIMIT_HIT",
    ],
    required: true,
  },

  // WHAT - Resource affected
  resourceType: {
    type: String,
    enum: ["User", "Product", "Order", "Invoice", "IssueReport", "QuoteRequest", "Auth"],
    default: null,
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  resourceName: {
    type: String,
    default: null, // e.g., "Product: Coffee Beans" for reference
  },

  // HOW - Details of the action
  method: {
    type: String,
    enum: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    default: null,
  },
  endpoint: {
    type: String,
    default: null, // e.g., "/api/products/123"
  },
  ipAddress: {
    type: String,
    default: null,
  },
  userAgent: {
    type: String,
    default: null,
  },

  // OUTCOME
  status: {
    type: String,
    enum: ["SUCCESS", "FAILURE", "PARTIAL"],
    default: "SUCCESS",
  },
  statusCode: {
    type: Number,
    default: null,
  },

  // DETAILS
  changes: {
    before: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    after: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  errorMessage: {
    type: String,
    default: null,
  },
  description: {
    type: String,
    default: null,
  },

  // WHEN
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// Indexes for common queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, createdAt: -1 });
auditLogSchema.index({ ipAddress: 1, createdAt: -1 });
auditLogSchema.index({ createdAt: -1 });

// Prevent modification of audit logs (immutable)
auditLogSchema.pre("updateOne", function (next) {
  const err = new Error("Audit logs cannot be modified");
  next(err);
});

auditLogSchema.pre("updateMany", function (next) {
  const err = new Error("Audit logs cannot be modified");
  next(err);
});

auditLogSchema.pre("findByIdAndUpdate", function (next) {
  const err = new Error("Audit logs cannot be modified");
  next(err);
});

module.exports = mongoose.model("AuditLog", auditLogSchema);
