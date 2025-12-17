const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  logger: true, // <— prints detailed SMTP info
  debug: true, // <— prints message envelope + body
});

/**
 * Format a JS Date into ICS-compatible timestamp (UTC)
 */
const formatICSDate = (date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

/**
 * Fully RFC 5545–compliant ICS generator
 */
function generateICS({
  title,
  description,
  start,
  durationMinutes = 30,
  organizerEmail = process.env.SMTP_USER,
  clientName,
  clientEmail,
}) {
  const dtStart = new Date(start);
  const dtEnd = new Date(dtStart.getTime() + durationMinutes * 60000);

  const uid = `${Date.now()}-${Math.random()}@doyles.com`;
  const dtStamp = formatICSDate(new Date());

  // ICS **must** use CRLF (\r\n)
  const icsLines = [
    "BEGIN:VCALENDAR",
    "PRODID:-//Doyle's Coffee//EN",
    "VERSION:2.0",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",

    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${formatICSDate(dtStart)}`,
    `DTEND:${formatICSDate(dtEnd)}`,

    `SUMMARY:${title}`,
    `DESCRIPTION:${description.replace(/\n/g, "\\n")}`,

    `ORGANIZER;CN=Doyle's Coffee:mailto:${organizerEmail}`,
    `ATTENDEE;CN=${clientName}:mailto:${clientEmail}`,

    "SEQUENCE:0",
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",

    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return icsLines.join("\r\n");
}

async function sendEmail({ to, subject, html, ics }) {
  if (!ics) {
    // simple non-calendar email
    return transporter.sendMail({
      from: `"Doyle’s Coffee" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    });
  }

  // Build the full MIME message manually so Apple doesn't break it
  const boundaryMixed = "mixed-" + Date.now();
  const boundaryAlt = "alt-" + Date.now();

  const mime = [
    `MIME-Version: 1.0`,
    `From: "Doyle’s Coffee" <${process.env.SMTP_USER}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: multipart/mixed; boundary="${boundaryMixed}"`,
    ``,
    `--${boundaryMixed}`,
    `Content-Type: multipart/alternative; boundary="${boundaryAlt}"`,
    ``,

    // ICS MUST BE FIRST FOR APPLE
    `--${boundaryAlt}`,
    `Content-Type: text/calendar; method=REQUEST; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    ics,
    ``,

    // HTML SECOND
    `--${boundaryAlt}`,
    `Content-Type: text/html; charset="UTF-8"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    html,
    ``,

    `--${boundaryAlt}--`,
    ``,

    // Attachment version of ICS
    `--${boundaryMixed}`,
    `Content-Type: application/ics; name="booking.ics"`,
    `Content-Disposition: attachment; filename="booking.ics"`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    ics,
    ``,

    `--${boundaryMixed}--`,
  ].join("\r\n");



  return transporter.sendMail({
    envelope: {
      from: process.env.SMTP_USER,
      to,
    },
    raw: mime,
  });
}

const sendVerificationEmail = async (user, token) => {
  // Make sure to add CLIENT_URL to your .env (e.g., http://localhost:5173)
  const clientUrl = process.env.CLIENT_URL || "http://localhost:3000";
  
  // This points to the Frontend route
  const verifyUrl = `${clientUrl}/verify-email?token=${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
      <h2 style="color: #7a4b25; text-align: center;">Welcome to Doyle’s Portal!</h2>
      <p>Hi ${user.name},</p>
      <p>Thank you for creating an account with Doyle’s Coffee Services. To secure your account, please verify your email address by clicking the button below.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${verifyUrl}" style="background-color: #7a4b25; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
          Verify My Account
        </a>
      </div>

      <p style="margin-bottom: 5px;">Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #555; font-size: 13px; background: #f9f9f9; padding: 10px; border-radius: 4px;">${verifyUrl}</p>
      
      <hr style="border:0; border-top:1px solid #eee; margin: 30px 0;">
      <p style="font-size: 12px; color: #999; text-align: center;">
        If you did not sign up for this account, you can safely ignore this email.
      </p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: "Verify your email - Doyle’s Portal",
    html,
  });
};

module.exports = { sendEmail, generateICS, sendVerificationEmail};
