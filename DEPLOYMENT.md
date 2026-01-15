Frontend: Vercel

Backend: Render

Domain: Cloudflare

Auth: JWT + refresh cookies

Cookie domain: .doylesbreakroomservices.com

## Required Environment Variables

**Authentication & Database:**
- `JWT_SECRET` - Secret key for JWT tokens
- `MONGO_URI` - MongoDB connection string
- `ACCESS_TOKEN_EXPIRES` - Access token expiration time (e.g., "20m")
- `REFRESH_TOKEN_DAYS` - Refresh token expiration in days (e.g., 14)

**Email (Resend):**
- `RESEND_API_KEY` - Your Resend API key (get from https://resend.com)
- `FROM_EMAIL` - Sender email address (e.g., "noreply@doyles.com")
- `EMAIL_FROM_NAME` - Display name for emails (default: "Doyle's Coffee")
- `FRONTEND_URL` - Frontend URL for email verification links

**Admin Notifications:**
- `ADMIN_EMAIL` - Email address for admin notifications