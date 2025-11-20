const express = require("express");
const router = express.Router();
const QuoteRequest = require("../models/QuoteRequest");
const nodemailer = require("nodemailer");
const { authenticateToken, requireRole } = require("../middleware/auth");
const { sendEmail, generateICS } = require("../utils/sendEmail");

const MAIL_HOST = process.env.SMTP_HOST;
const MAIL_PORT = process.env.SMTP_PORT;
const MAIL_USER = process.env.SMTP_USER;
const MAIL_PASS = process.env.SMTP_PASS;

let transporter = null;
if (MAIL_HOST && MAIL_PORT && MAIL_USER && MAIL_PASS) {
  transporter = nodemailer.createTransport({
    host: MAIL_HOST,
    port: Number(MAIL_PORT),
    secure: Number(MAIL_PORT) === 465,
    auth: {
      user: MAIL_USER,
      pass: MAIL_PASS,
    },
  });
} else {
  console.warn(
    "⚠️ SMTP not configured. Emails will not be sent. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS in .env"
  );
}

// Create a new quote request
router.post("/", async (req, res) => {
  try {
    const qr = await QuoteRequest.create(req.body);

    if (transporter) {
      await transporter.sendMail({
        from: '"Doyle’s Portal" <no-reply@doyles.com>',
        to: process.env.ADMIN_EMAIL || "admin@doyles.com",
        subject: "New Quote Request",
        text: `New lead from ${qr.contactName} at ${qr.companyName} (${qr.email})`,
      });
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
      if (status === "scheduled" && transporter) {
        await transporter.sendMail({
          from: '"Doyle’s Portal" <no-reply@doyles.com>',
          to: qr.email,
          subject: "Your Quote Consultation Has Been Scheduled",
          text: `Hi ${qr.contactName},

Your quote consultation with Doyle's Coffee has been scheduled for ${new Date(
            scheduledDate
          ).toLocaleString()}.

Notes: ${adminNotes || "—"}

Thank you,
Doyle’s Coffee Team`,
        });
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
  try {
    if (!transporter) {
      return res.status(500).json({ message: "No transporter configured." });
    }

    await transporter.sendMail({
      from: '"Doyle’s Portal" <no-reply@doyles.com>',
      to: process.env.ADMIN_EMAIL,
      subject: "Test Email from Doyle’s Portal",
      text: "If you received this, your SMTP setup is working!",
    });

    res.json({ message: "Test email sent successfully!" });
  } catch (err) {
    console.error("Email test failed:", err);
    res.status(500).json({ message: "Email test failed", error: err.message });
  }
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

module.exports = router;
