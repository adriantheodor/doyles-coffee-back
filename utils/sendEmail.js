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

module.exports = { sendEmail, generateICS };
