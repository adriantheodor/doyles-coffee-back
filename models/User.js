// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["admin", "customer"],
    default: "customer",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  isVerified: { type: Boolean, default: false },
  verificationToken: { type: String },
});

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
