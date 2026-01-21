const mongoose = require("mongoose");
const Invoice = require("./models/Invoice");
const Order = require("./models/Order");
const User = require("./models/User");
require("dotenv").config();

async function migrateInvoices() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected!");

    console.log("\nFetching all invoices...");
    const invoices = await Invoice.find();
    console.log(`Found ${invoices.length} invoices`);

    let updated = 0;
    let errors = 0;

    for (const invoice of invoices) {
      try {
        // Get the order
        const order = await Order.findById(invoice.order);
        
        if (!order) {
          console.warn(`⚠️  Order ${invoice.order} not found for invoice ${invoice._id}`);
          errors++;
          continue;
        }

        // Verify customer exists
        const customer = await User.findById(order.customer);
        if (!customer) {
          console.warn(`⚠️  Customer ${order.customer} not found for invoice ${invoice._id}`);
          errors++;
          continue;
        }

        // Update invoice customer if different
        if (invoice.customer.toString() !== order.customer.toString()) {
          invoice.customer = order.customer;
          await invoice.save();
          console.log(`✓ Updated invoice ${invoice._id}: customer set to ${order.customer}`);
          updated++;
        } else {
          console.log(`✓ Invoice ${invoice._id} already has correct customer`);
        }
      } catch (err) {
        console.error(`✗ Error processing invoice ${invoice._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n====== MIGRATION COMPLETE ======`);
    console.log(`Total invoices: ${invoices.length}`);
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
    console.log(`Verified: ${invoices.length - updated - errors}`);

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrateInvoices();
