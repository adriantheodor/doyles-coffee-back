const mongoose = require("mongoose");

const IssueReportSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, default: "open" }, // open | resolved
  },
  { timestamps: true }
);

module.exports = mongoose.model("IssueReport", IssueReportSchema);
