const { Resend } = require("resend");

// Validate environment variables
const requiredEnvVars = ["RESEND_API_KEY", "FRONTEND_URL"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️ Missing environment variables: ${missingVars.join(", ")}`);
}

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.EMAIL_FROM_NAME || "Doyle's Coffee";

console.log("✅ Resend email service initialized");

// =========================
// 📧 SEND EMAIL (Generic)
// =========================
async function sendEmail({ to, subject, html, ics }) {
  try {
    const options = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    };

    // If ICS attachment is provided, add it
    if (ics) {
      options.attachments = [
        {
          filename: "meeting.ics",
          content: ics,
          contentType: "text/calendar; method=REQUEST",
        },
      ];
    }

    const response = await resend.emails.send(options);

    if (response.error) {
      console.error("❌ Email sending failed:", response.error);
      throw new Error(response.error.message);
    }

    console.log("✅ Email sent successfully:", response.data.id);
    return response.data;
  } catch (error) {
    console.error("❌ Error in sendEmail:", error.message);
    throw error;
  }
}

// =========================
// 📧 SEND VERIFICATION EMAIL
// =========================
async function sendVerificationEmail(user, verificationToken) {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  const resendUrl = `${process.env.FRONTEND_URL}/verify-email?email=${encodeURIComponent(user.email)}&resend=true`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Welcome to Doyle's Coffee, ${user.name}!</h2>
      <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
      <a href="${verificationUrl}" 
         style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
        Verify Email
      </a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
      <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
        Didn't receive this email or it expired? <a href="${resendUrl}" style="color: #4CAF50; text-decoration: none;">Request a new verification email</a>
      </p>
      <p style="color: #999; font-size: 12px; margin-top: 10px;">
        If you didn't create this account, please ignore this email.
      </p>
    </div>
  `;

  return sendEmail({
    to: user.email,
    subject: "Verify Your Email Address",
    html,
  });
}

// =========================
// 📅 GENERATE ICS (Calendar Event)
// =========================
function generateICS({
  title,
  description,
  start,
  durationMinutes = 30,
  clientName,
  clientEmail,
}) {
  const startDate = new Date(start);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);

  // Format dates as YYYYMMDDTHHMMSSZ (UTC)
  const formatDateUTC = (date) => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  };

  const uid = `doyles-coffee-${Date.now()}@doyles.com`;
  const dtstamp = formatDateUTC(new Date());
  const dtstart = formatDateUTC(startDate);
  const dtend = formatDateUTC(endDate);

  // Escape special characters in ICS
  const escapeICS = (text) => {
    if (!text) return "";
    return text
      .replace(/\\/g, "\\\\")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;")
      .replace(/\n/g, "\\n");
  };

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Doyle's Coffee//Event//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART:${dtstart}
DTEND:${dtend}
SUMMARY:${escapeICS(title)}
DESCRIPTION:${escapeICS(description)}
ORGANIZER;CN=Doyle's Coffee:mailto:${FROM_EMAIL}
ATTENDEE;CN=${escapeICS(clientName)};RSVP=TRUE:mailto:${clientEmail}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  return ics;
}

// =========================
// 📧 SEND INVOICE EMAIL
// =========================
async function sendInvoiceEmail({ to, customerName, invoiceId, fileName, notes }) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #4CAF50; color: white; padding: 20px; border-radius: 4px 4px 0 0;">
        <h2 style="margin: 0;">📄 Invoice from Doyle's Coffee</h2>
      </div>
      <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 4px 4px;">
        <p>Hi ${customerName},</p>
        <p>Please find your invoice attached below. We appreciate your business!</p>
        
        <div style="background-color: white; padding: 15px; border-left: 4px solid #4CAF50; margin: 20px 0;">
          <p><strong>Invoice ID:</strong> ${invoiceId}</p>
          <p><strong>File:</strong> ${fileName}</p>
          ${notes ? `<p><strong>Notes:</strong></p><p style="color: #666;">${notes}</p>` : ""}
        </div>

        <div style="background-color: white; padding: 15px; border: 1px solid #ddd; border-radius: 4px; margin: 20px 0;">
          <p style="margin: 0; color: #999; font-size: 12px;">If you have any questions about this invoice, please don't hesitate to contact us.</p>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px;">
          Best regards,<br>
          <strong>Doyle's Coffee & Break Room Services</strong>
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to,
    subject: `Invoice from Doyle's Coffee - ${invoiceId}`,
    html,
  });
}

module.exports = { sendEmail, sendVerificationEmail, generateICS, sendInvoiceEmail };
