# Invoice Management System - Architecture Overview

## Complete System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React/Vue/etc)                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌──────────────────────────┐        ┌──────────────────────────┐       │
│  │   ADMIN PANEL            │        │  CUSTOMER DASHBOARD      │       │
│  ├──────────────────────────┤        ├──────────────────────────┤       │
│  │ • Upload Form            │        │ • My Invoices List       │       │
│  │ • Invoice List Table     │        │ • Download Invoice       │       │
│  │ • Send Invoice Button    │        │ • View Details           │       │
│  │ • Delete Button          │        │ • Sent Date Display      │       │
│  │ • Customer Search        │        │                          │       │
│  │ • Download Button        │        │                          │       │
│  └──────────────────────────┘        └──────────────────────────┘       │
│           │                                      │                      │
│           └──────────────────┬───────────────────┘                      │
│                              │                                          │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
                    HTTP/REST API Calls
                    Authorization: Bearer Token
                               │
┌──────────────────────────────▼──────────────────────────────────────────┐
│                         BACKEND (Node.js/Express)                       │
├───────────────────────────────────────────────────────────────────────┬─┤
│                                                                       │ │
│  ROUTES (invoiceRoutes.js)                                          │ │
│  ├─ POST /api/invoices/upload-and-send ──────────┐                 │ │
│  ├─ POST /api/invoices/upload ──────────────┐    │                 │ │
│  ├─ POST /api/invoices/:id/send ──────┐    │    │                 │ │
│  ├─ GET  /api/invoices/               │    │    │                 │ │
│  ├─ GET  /api/invoices/my-invoices/list    │    │                 │ │
│  ├─ GET  /api/invoices/customer/:id        │    │                 │ │
│  ├─ GET  /api/invoices/details/:id         │    │                 │ │
│  ├─ DELETE /api/invoices/:id               │    │                 │ │
│  └─ GET  /api/invoices/:id/pdf             │    │                 │ │
│                                             │    │                 │ │
│  CONTROLLER (invoiceController.js)          │    │                 │ │
│  ├─ uploadAndSendInvoice() ◄───────────────┤    │                 │ │
│  ├─ uploadInvoice() ◄──────────────────────┤    │                 │ │
│  ├─ sendInvoiceToCustomer() ◄──────────────┤    │                 │ │
│  ├─ getAllInvoices()                        │    │                 │ │
│  ├─ getMyInvoices()                         │    │                 │ │
│  ├─ getCustomerInvoices()                   │    │                 │ │
│  ├─ getInvoice()                            │    │                 │ │
│  ├─ deleteInvoice()                         │    │                 │ │
│  └─ handleFileOperations()                  │    │                 │ │
│                 │                            │    │                 │ │
│                 ▼                            │    │                 │ │
│  MIDDLEWARE                                  │    │                 │ │
│  ├─ multer (config/multer.js) ◄─────────────┴────┴─────────┐        │ │
│  │   • File upload handling                                │        │ │
│  │   • File type validation                                │        │ │
│  │   • File size limit (10MB)                              │        │ │
│  │   • Storage to: uploads/invoices/                       │        │ │
│  │                                                         │        │ │
│  ├─ authenticateToken (middleware/auth.js) ◄──────────────┤        │ │
│  │   • JWT validation                                      │        │ │
│  │                                                         │        │ │
│  └─ requireRole (middleware/auth.js) ◄───────────────────┤         │ │
│      • Admin-only checks                                  │         │ │
│                                                           ▼         │ │
│  UTILS (utils/sendEmail.js)                                         │ │
│  ├─ sendInvoiceEmail()                                              │ │
│  │   • HTML email template                                          │ │
│  │   • Resend API integration                                       │ │
│  │   • Customer notification                                        │ │
│  │                                                                  │ │
│  └─ sendEmail() (generic)                                           │ │
│      • Resend SMTP service                                          │ │
│                                                                     │ │
└─────────────────────────────────────────────────────────────────────┘ │
│                                                                       │ │
│  DATABASE (MongoDB)                                                 │ │
│  ├─ Invoice Collection                                              │ │
│  │  ├─ _id: ObjectId                                                │ │
│  │  ├─ customer: User ID (reference)                                │ │
│  │  ├─ order: Order ID (reference, optional)                        │ │
│  │  ├─ fileName: String (original filename)                         │ │
│  │  ├─ fileUrl: String (path to uploaded file)                      │ │
│  │  ├─ totalAmount: Number                                          │ │
│  │  ├─ notes: String                                                │ │
│  │  ├─ isSent: Boolean (email sent status)                          │ │
│  │  ├─ sentAt: Date (when email sent)                               │ │
│  │  ├─ sentBy: User ID (admin who sent it)                          │ │
│  │  └─ createdAt: Date                                              │ │
│  │                                                                   │ │
│  ├─ User Collection (existing)                                      │ │
│  │  ├─ _id, name, email, role, etc.                                 │ │
│  │                                                                   │ │
│  └─ Order Collection (existing, optional reference)                 │ │
│      ├─ _id, customer, items, totalPrice, etc.                      │ │
│                                                                     │ │
│  FILE SYSTEM                                                        │ │
│  └─ uploads/invoices/                                               │ │
│      └─ [timestamp]-[random].pdf/jpg/png                            │ │
│                                                                     │ │
│  EMAIL SERVICE (Resend)                                             │ │
│  └─ Invoice email delivery                                          │ │
│      ├─ Recipient: customer.email                                   │ │
│      ├─ Template: HTML formatted                                    │ │
│      ├─ Content: Invoice ID, file name, notes                       │ │
│      └─ Status: Sent/Failed                                         │ │
│                                                                     │ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow Examples

### Example 1: Upload and Send Invoice

```
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND                                                        │
│ • Admin selects customer: John Doe (ID: 65abc123...)           │
│ • Admin selects file: invoice.pdf (5MB)                        │
│ • Admin enters: $150.00, "Payment due 30 days"                 │
│ • Admin clicks: "Upload & Send"                                │
│                                                                 │
│ Calls: POST /api/invoices/upload-and-send                      │
│ Headers: Authorization: Bearer {adminToken}                   │
│ Body: FormData                                                  │
│   - invoice: File (multipart)                                  │
│   - customerId: 65abc123...                                    │
│   - totalAmount: 150                                            │
│   - notes: "Payment due 30 days"                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND - REQUEST PROCESSING                                   │
│                                                                 │
│ 1. AUTHENTICATION                                              │
│    • Extract & validate JWT token                              │
│    • Check if role === "admin"                                 │
│    ✓ Passed                                                    │
│                                                                 │
│ 2. FILE UPLOAD (Multer middleware)                             │
│    • Receive multipart FormData                                │
│    • Validate file type (PDF, JPG, PNG)                        │
│    • Validate file size (< 10MB)                               │
│    • Generate unique filename: 1705779000123-987654321.pdf     │
│    • Save to: uploads/invoices/1705779000123-987654321.pdf     │
│    ✓ File saved                                                │
│                                                                 │
│ 3. VALIDATION                                                  │
│    • Check if customerId exists in User collection             │
│    • Fetch customer: { _id, name, email }                      │
│    ✓ Customer found: John Doe, john@example.com               │
│                                                                 │
│ 4. DATABASE INSERTION                                          │
│    • Create new Invoice document:                              │
│    {                                                            │
│      customer: 65abc123...,                                    │
│      fileName: "invoice.pdf",                                  │
│      fileUrl: "/uploads/invoices/1705779000123-987654321.pdf", │
│      totalAmount: 150,                                         │
│      notes: "Payment due 30 days",                             │
│      isSent: true,                                             │
│      sentAt: 2026-01-20T10:30:00Z,                             │
│      sentBy: 65admin123...                                     │
│    }                                                            │
│    • Save to MongoDB                                           │
│    ✓ Invoice created                                           │
│                                                                 │
│ 5. EMAIL NOTIFICATION                                          │
│    • Call sendInvoiceEmail() with:                             │
│      - to: "john@example.com"                                  │
│      - customerName: "John Doe"                                │
│      - invoiceId: "65inv123..."                                │
│      - fileName: "invoice.pdf"                                 │
│      - notes: "Payment due 30 days"                            │
│    • Resend API sends HTML email                               │
│    ✓ Email queued for delivery                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ BACKEND - RESPONSE (200 Created)                                │
│                                                                 │
│ {                                                               │
│   "message": "Invoice uploaded and sent successfully",          │
│   "invoice": {                                                  │
│     "_id": "65inv123...",                                       │
│     "fileName": "invoice.pdf",                                  │
│     "fileUrl": "/uploads/invoices/1705779000123-987654321.pdf", │
│     "totalAmount": 150,                                         │
│     "customer": "John Doe",                                     │
│     "customerEmail": "john@example.com",                        │
│     "isSent": true,                                             │
│     "sentAt": "2026-01-20T10:30:00Z",                           │
│     "createdAt": "2026-01-20T10:30:00Z"                         │
│   }                                                             │
│ }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ FRONTEND - RESPONSE HANDLING                                    │
│ • Parse successful response                                     │
│ • Show toast: "Invoice sent successfully"                       │
│ • Refresh invoice list                                          │
│ • Clear form inputs                                             │
│ • Scroll to show new invoice in list                            │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ CUSTOMER EMAIL                                                   │
│                                                                 │
│ From: Doyle's Coffee <no-reply@doyles.com>                     │
│ To: john@example.com                                            │
│ Subject: Invoice from Doyle's Coffee - 65inv123...             │
│                                                                 │
│ ┌──────────────────────────────────────────────┐               │
│ │ 📄 Invoice from Doyle's Coffee               │               │
│ │                                              │               │
│ │ Hi John,                                     │               │
│ │ Please find your invoice attached below.     │               │
│ │ We appreciate your business!                 │               │
│ │                                              │               │
│ │ Invoice ID: 65inv123...                      │               │
│ │ File: invoice.pdf                            │               │
│ │ Notes: Payment due 30 days                   │               │
│ │                                              │               │
│ │ If you have questions, contact us.           │               │
│ │ Best regards, Doyle's Coffee                 │               │
│ └──────────────────────────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│ CUSTOMER LATER: VIEWS "MY INVOICES"                             │
│ • Fetches: GET /api/invoices/my-invoices/list                  │
│ • Receives list including the invoice just sent                │
│ • Can download or view the PDF                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

```
Frontend Layer
├─ React/Vue/Angular (your choice)
├─ Axios/Fetch API
├─ Form handling (FormData for file uploads)
├─ UI Components (buttons, tables, modals)
└─ State management (Redux/Context/Vuex)
                │
             HTTP/REST
                │
Backend Layer
├─ Node.js + Express
├─ Express Middleware
│  ├─ authenticateToken
│  ├─ requireRole
│  └─ multer (file upload)
├─ Controllers
│  └─ invoiceController.js
├─ Routes
│  └─ invoiceRoutes.js
├─ Models (Mongoose)
│  └─ Invoice.js
├─ Utils
│  └─ sendEmail.js (Resend)
└─ Configuration
   └─ multer.js (file upload config)
                │
          MongoDB Connection
                │
Database Layer
├─ MongoDB (Atlas/Local)
├─ Invoice Collection
├─ User Collection (reference)
└─ File Storage
   └─ uploads/invoices/

Email Service
├─ Resend API
├─ SMTP Configuration
└─ HTML Templates
```

---

## Security Measures

✅ **Authentication:**
- JWT token validation on all endpoints
- Admin role verification for admin operations

✅ **File Upload:**
- File type validation (whitelist: PDF, JPG, PNG)
- File size limit (10MB max)
- Unique filename generation (timestamp + random)
- Stored outside public web root initially

✅ **Authorization:**
- Customers can only access their own invoices
- Only admins can upload, send, delete
- Role-based access control (RBAC)

✅ **Data Validation:**
- Customer ID validation before saving
- Email validation through Resend
- Form data sanitization

---

## Error Scenarios & Handling

```javascript
// User tries to upload without admin role
POST /api/invoices/upload-and-send
Response: 403 Forbidden
{ message: "Forbidden: Insufficient role" }

// User tries to access another customer's invoice
GET /api/invoices/details/:invoiceId
Response: 403 Forbidden
{ message: "Not authorized" }

// File type is not allowed
Response: 400 Bad Request
{ message: "Invalid file type. Only PDF and image files (JPEG, PNG) are allowed." }

// File too large
Response: 400 Bad Request
{ message: "[actual multer error message]" }

// Customer not found
Response: 404 Not Found
{ message: "Customer not found" }

// No file provided
Response: 400 Bad Request
{ message: "No file uploaded" }
```

---

## Database Indexing (Performance)

For best performance, consider adding these indexes:

```javascript
// In Invoice model
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ isSent: 1 });
invoiceSchema.index({ createdAt: -1 });
invoiceSchema.index({ customer: 1, isSent: 1 });
```

---

## Scaling Considerations

- **File Storage:** Consider AWS S3 instead of local storage for production
- **Email Queuing:** Use job queue (Bull/RabbitMQ) for bulk email sending
- **Caching:** Add Redis caching for frequently accessed invoices
- **CDN:** Serve static files through CDN in production

---

## Development Checklist

- [ ] Dependencies installed (`npm install`)
- [ ] Multer configured
- [ ] Upload directory created (`uploads/invoices/`)
- [ ] Email service configured (RESEND_API_KEY in .env)
- [ ] Database models updated
- [ ] Routes created
- [ ] Controllers implemented
- [ ] Email templates ready
- [ ] Error handling complete
- [ ] Authentication/authorization working
- [ ] File upload working
- [ ] Email sending working
- [ ] Frontend integration complete
- [ ] End-to-end testing done

---

## You're All Set! 🚀

All backend infrastructure is ready. Now focus on building an intuitive frontend UI!
