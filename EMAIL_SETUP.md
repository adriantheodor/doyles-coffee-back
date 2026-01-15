# Email Implementation with Resend - Setup Guide

## Overview
Quote meeting scheduling now sends automated emails to customers and admins using Resend.

## What's Implemented

### 1. **Generic Email Function** (`sendEmail`)
- Sends emails via Resend API
- Supports HTML content
- Can attach ICS calendar files
- Handles errors gracefully without breaking the request

### 2. **Calendar Invites** (`generateICS`)
- Creates `.ics` calendar events
- Includes meeting details: title, description, start/end times
- Client email is added as attendee
- Proper UTC formatting for compatibility

### 3. **Quote Meeting Emails**
When a quote is scheduled via `PUT /api/quotes/:id/schedule`:

**Customer Email:**
- Confirms meeting date/time
- Includes their phone number (for admin reference)
- Displays admin notes if provided
- Attaches calendar invite

**Admin Email:**
- Confirms meeting is scheduled
- Shows client name, company, phone
- Includes calendar event

## Setup Instructions

### 1. Get Resend API Key
- Go to https://resend.com
- Sign up for a free account
- Navigate to Settings → API Keys
- Create a new API key

### 2. Configure Environment Variables
Create/update your `.env` file:
```
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=noreply@yourdomain.com
EMAIL_FROM_NAME=Doyle's Coffee
FRONTEND_URL=https://your-frontend-domain.com
ADMIN_EMAIL=admin@doyles.com
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Deploy
Push changes and redeploy your backend.

## Email Endpoints

### Quote Scheduling
- **Route:** `PUT /api/quotes/:id/schedule`
- **Request Body:**
  ```json
  {
    "dateTime": "2025-01-20T14:00:00",
    "adminNotes": "Optional meeting notes"
  }
  ```
- **Emails Sent:**
  - ✅ Customer (with calendar invite)
  - ✅ Admin (confirmation)

### New Quote Request
- **Route:** `POST /api/quotes`
- **Emails Sent:**
  - ✅ Admin (notification of new lead)

## Testing

### In Development
1. Use a test email address in `.env` or modify requests
2. Check Resend dashboard for sent emails
3. Verify calendar invites open in calendar apps

### Production
- Monitor Resend dashboard for delivery failures
- Set up webhook notifications if needed (optional)

## Resend Documentation
- Full docs: https://resend.com/docs
- API Reference: https://resend.com/docs/api-reference
- Email testing guide: https://resend.com/docs/how-to-test-emails

## Notes
- Emails are sent asynchronously; request won't fail if email fails
- ICS files are generated on-the-fly with proper UTC formatting
- All emails use branded FROM_NAME and FROM_EMAIL
- Supports attachments for calendar events
