const nodemailer = require("nodemailer");

// Validate environment variables
const requiredEnvVars = ["EMAIL_USER", "EMAIL_PASS", "FRONTEND_URL"];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingVars.join(", ")}`);
}

// Create transporter for Brevo (Sendinblue)
const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // Your Brevo email
    pass: process.env.EMAIL_PASS, // Your Brevo SMTP key
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Email transporter verification failed:", error);
  } else {
    console.log("✅ Email server is ready to send messages");
  }
});

async function sendVerificationEmail(user, verificationToken) {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: `"${process.env.EMAIL_FROM_NAME || "Doyle's Coffee"}" <${process.env.EMAIL_USER}>`,
    to: user.email,
    subject: 'Verify Your Email Address',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Doyle's Coffee, ${user.name}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verificationUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0;">
          Verify Email
        </a>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          If you didn't create this account, please ignore this email.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Email sending failed:", error.message);
    throw error;
  }
}

module.exports = { sendVerificationEmail };
