const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const QuoteRequest = require("../models/QuoteRequest");
const User = require("../models/User");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { sendEmail, generateICS, sendVerificationEmail } = require("../utils/sendEmail");

// Create a new quote request
router.post("/", async (req, res) => {
  try {
    const qr = await QuoteRequest.create(req.body);

    // Send admin notification email
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL || "admin@doyles.com",
        subject: "New Quote Request",
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>New Quote Request</h2>
            <p><strong>Contact Name:</strong> ${qr.contactName}</p>
            <p><strong>Company Name:</strong> ${qr.companyName}</p>
            <p><strong>Email:</strong> ${qr.email}</p>
          </div>
        `,
      });
    } catch (emailError) {
      console.error("Failed to send admin notification:", emailError);
      // Don't fail the request if email fails
    }

    res.status(201).json({ id: qr._id });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Invalid quote payload" });
  }
});

// DELETE /api/quotes/:id  (admin only)
router.delete(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const deleted = await QuoteRequest.findByIdAndDelete(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Quote not found" });

      res.json({ message: "Quote deleted successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  }
);

router.put(
  "/:id",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { status, scheduledDate, adminNotes } = req.body;
      const update = { status };

      if (scheduledDate) update.scheduledDate = scheduledDate;
      if (adminNotes) update.adminNotes = adminNotes;

      const qr = await QuoteRequest.findByIdAndUpdate(req.params.id, update, {
        new: true,
      });

      // Send scheduling email (no meeting link)
      if (status === "scheduled" && scheduledDate) {
        try {
          const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
              <h2 style="color: #7a4b25;">Your Quote Consultation Has Been Scheduled</h2>
              <p>Hi ${qr.contactName},</p>
              <p>Your quote consultation with Doyle's Coffee has been scheduled for:</p>
              <p style="font-size: 16px; font-weight: bold;">${new Date(scheduledDate).toLocaleString()}</p>
              ${adminNotes ? `<p><strong>Notes:</strong> ${adminNotes}</p>` : ""}
              <p>Thank you,<br>Doyle's Coffee Team</p>
            </div>
          `;

          await sendEmail({
            to: qr.email,
            subject: "Your Quote Consultation Has Been Scheduled",
            html,
          });
        } catch (emailError) {
          console.error("Failed to send scheduling email:", emailError);
          // Don't fail the request if email fails
        }
      }

      res.json(qr);
    } catch (e) {
      console.error(e);
      res.status(400).json({ error: "Could not update quote request" });
    }
  }
);

// Admin-only: list/manage leads
router.get("/", authenticateToken, requireRole("admin"), async (_req, res) => {
  try {
    const items = await QuoteRequest.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to retrieve quote requests" });
  }
});

router.put(
  "/:id/schedule",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    const { dateTime, adminNotes } = req.body;

    try {
      const quote = await QuoteRequest.findById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      // Update DB
      quote.status = "scheduled";
      quote.meetingDate = dateTime;
      quote.adminNotes = adminNotes || "";
      await quote.save();

      const formattedDate = new Date(dateTime).toLocaleString();

      // Generate ICS event — phone number included!
      const ics = generateICS({
        title: "Quote Consultation – Doyle’s Coffee",
        description:
          `Consultation with ${quote.contactName} from ${quote.companyName}.` +
          `\\nPhone: ${quote.phone}` +
          (adminNotes ? `\\nNotes: ${adminNotes}` : ""),
        start: dateTime,
        durationMinutes: 30,
        clientName: quote.contactName,
        clientEmail: quote.email,
      });

      // Customer email HTML
      const customerHtml = `
<div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
  <h2 style="color:#7a4b25;">Your Consultation Is Scheduled</h2>

  <p>Hello <strong>${quote.contactName}</strong>,</p>

  <p>Your quote consultation with <strong>Doyle’s Coffee Services</strong> is scheduled for:</p>
  <p style="font-size:18px;font-weight:bold;">${formattedDate}</p>

  <p><strong>We will call you at:</strong> ${quote.phone}</p>

  ${adminNotes ? `<p><strong>Notes:</strong> ${adminNotes}</p>` : ""}

  <p>A calendar invite (.ics) is attached to this email.</p>

  <hr>
  <p style="font-size:12px;color:#999;">Doyle’s Coffee Services</p>
</div>
`;

      // Send to customer
      await sendEmail({
        to: quote.email,
        subject: "Your Quote Consultation Is Scheduled",
        html: customerHtml,
        ics,
      });

      // Admin confirmation
      const adminHtml = `
<div style="font-family:Arial,sans-serif;padding:20px;color:#333;">
  <h2>Consultation Scheduled</h2>
  <p>You scheduled a meeting with:</p>
  <p><strong>${quote.contactName}</strong> (${quote.companyName})</p>
  <p><strong>Time:</strong> ${formattedDate}</p>
  <p><strong>Client Phone:</strong> ${quote.phone}</p>
</div>
`;

      await sendEmail({
        to: process.env.ADMIN_EMAIL || process.env.SMTP_USER,
        subject: `Consultation Scheduled with ${quote.companyName}`,
        html: adminHtml,
        ics,
      });

      res.json({ message: "Consultation scheduled and emails sent." });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to schedule quote." });
    }
  }
);

router.get("/test-email", async (req, res) => {
  // Test endpoint removed - use centralized sendEmail utility
  res.status(200).json({ message: "Sendmail utility is configured and ready to use." });
});

// Mark a quote as completed
router.put(
  "/:id/complete",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const quote = await QuoteRequest.findById(req.params.id);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      quote.status = "completed";
      quote.completedDate = new Date();
      await quote.save();

      res.json({ message: "Quote marked as completed", quote });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to mark quote completed" });
    }
  }
);

// Convert quote to customer account + create user
router.post(
  "/:quoteId/convert-to-customer",
  authenticateToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { quoteId } = req.params;
      const { password } = req.body;

      // Validate password provided
      if (!password) {
        return res.status(400).json({ message: "Password is required" });
      }

      // Fetch the quote
      const quote = await QuoteRequest.findById(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      // Check if user already exists with this email
      const existingUser = await User.findOne({ email: quote.email });
      if (existingUser) {
        return res.status(400).json({ message: "User account already exists for this email" });
      }

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Generate verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      const verificationTokenExpiresAt = new Date();
      verificationTokenExpiresAt.setHours(verificationTokenExpiresAt.getHours() + 24); // 24 hour expiry

      // Create new user account
      const newUser = new User({
        name: quote.contactName,
        email: quote.email,
        password: hashedPassword,
        role: "customer",
        isVerified: false,
        verificationToken,
        verificationTokenExpiresAt,
      });

      await newUser.save();

      // Update quote status to completed
      quote.status = "completed";
      quote.completedDate = new Date();
      await quote.save();

      // Send welcome email with verification link
      try {
        const verificationLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/verify-email?token=${verificationToken}`;
        const welcomeHtml = `
          <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #7a4b25;">Welcome to Doyle's Coffee, ${quote.contactName}!</h2>
            <p>Your customer account has been created. Please verify your email to activate your account.</p>
            <p>
              <a href="${verificationLink}" style="display: inline-block; padding: 10px 20px; background-color: #7a4b25; color: white; text-decoration: none; border-radius: 5px;">
                Verify Email
              </a>
            </p>
            <p style="font-size: 12px; color: #999;">If you did not create this account, please contact support.</p>
          </div>
        `;

        await sendEmail({
          to: quote.email,
          subject: "Welcome to Doyle's Coffee - Verify Your Email",
          html: welcomeHtml,
        });
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
        // Don't fail the request if email fails
      }

      res.status(201).json({
        message: "Customer account created successfully",
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        quote: {
          id: quote._id,
          status: quote.status,
        },
      });
    } catch (err) {
      console.error("CONVERT QUOTE ERROR:", err);
      res.status(500).json({ message: "Failed to convert quote to customer account" });
    }
  }
);

module.exports = router;
