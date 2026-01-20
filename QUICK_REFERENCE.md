# Quick Start Reference for Frontend Developer

## Invoice Upload Feature - Quick Reference

### Key Files Added/Modified:

**Backend Files:**
- ✅ `models/Invoice.js` - Added `isSent`, `sentAt`, `sentBy`, `fileName` fields
- ✅ `config/multer.js` - New file upload configuration
- ✅ `controllers/invoiceController.js` - New invoice management controller
- ✅ `routes/invoiceRoutes.js` - Updated with new endpoints
- ✅ `utils/sendEmail.js` - Added `sendInvoiceEmail()` function
- ✅ `package.json` - Added multer dependency
- ✅ `server.js` - Added `/uploads` static file serving
- ✅ `.gitignore` - Added `uploads/` directory

---

## 3 Main Workflows to Implement

### 1️⃣ **Admin Uploads & Sends Invoice**

**Flow:**
```
Admin fills form
    ↓
Clicks "Upload & Send"
    ↓
POST /api/invoices/upload-and-send
    ↓
Invoice stored + Customer gets email
    ↓
Show success message
    ↓
Refresh invoice list
```

**Required Form Fields:**
- Select customer (dropdown)
- Upload file (PDF/Image)
- Optional: Total amount, notes

---

### 2️⃣ **Admin Views All Invoices**

**Flow:**
```
Admin goes to "Invoices" page
    ↓
GET /api/invoices/
    ↓
Display table with all invoices
    ↓
Show: Customer, File, Amount, Sent Status, Sent Date
    ↓
Action buttons: View, Send Now*, Download, Delete
```

*"Send Now" only appears if `isSent === false`

---

### 3️⃣ **Customer Views Their Invoices**

**Flow:**
```
Customer logs in
    ↓
Views "My Invoices" section
    ↓
GET /api/invoices/my-invoices/list
    ↓
Display table with their invoices
    ↓
Show: File, Amount, Sent Date, Download link
    ↓
Customer can download/view invoice
```

---

## API Endpoints Summary

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| **POST** | `/api/invoices/upload-and-send` | Admin | Upload file + send email |
| **POST** | `/api/invoices/upload` | Admin | Upload file only |
| **POST** | `/api/invoices/:id/send` | Admin | Send existing invoice |
| **GET** | `/api/invoices/` | Admin | Get all invoices |
| **GET** | `/api/invoices/my-invoices/list` | Any | Get customer's invoices |
| **GET** | `/api/invoices/customer/:customerId` | Admin | Get invoices for specific customer |
| **GET** | `/api/invoices/details/:id` | Any* | Get invoice details |
| **DELETE** | `/api/invoices/:id` | Admin | Delete invoice |
| **GET** | `/api/invoices/:id/pdf` | Any* | Download as PDF |

*Any = Admin or invoice owner

---

## Response Codes to Handle

| Code | Meaning | Action |
|------|---------|--------|
| **201** | Created successfully | Show success, refresh list |
| **200** | Success | Show data/success |
| **400** | Bad request (no file, etc) | Show error message |
| **403** | Forbidden (not admin/owner) | Show "Access denied" |
| **404** | Not found | Show "Invoice not found" |
| **500** | Server error | Show "Failed to process" |

---

## File Upload Details

**Accepted file types:** `.pdf`, `.jpg`, `.jpeg`, `.png`  
**Max file size:** 10MB  
**Uploaded to:** `uploads/invoices/`  
**Access via:** `http://your-api/uploads/invoices/filename.ext`

---

## UI Components Checklist

### ✅ Admin Panel
- [ ] Invoice upload form
- [ ] Invoice list table
- [ ] Send invoice button
- [ ] Delete invoice button
- [ ] Download button
- [ ] View details modal/page
- [ ] Filter by customer
- [ ] Search functionality

### ✅ Customer Dashboard
- [ ] My invoices section
- [ ] Invoice list display
- [ ] Download button
- [ ] View/download PDF option
- [ ] Display sent date

---

## Common UI Patterns

### File Input:
```html
<input 
  type="file" 
  accept=".pdf,.jpg,.jpeg,.png" 
  id="invoiceFile"
/>
```

### Status Badge:
```html
<!-- If isSent is true -->
<span style="color: green">✓ Sent</span>

<!-- If isSent is false -->
<span style="color: red">✗ Not Sent</span>
```

### Download Link:
```html
<a href="/uploads/invoices/filename.pdf" download>
  Download Invoice
</a>
```

---

## Error Handling Examples

```javascript
// File too large
if (file.size > 10 * 1024 * 1024) {
  showError("File must be less than 10MB");
}

// Invalid file type
const validTypes = ["application/pdf", "image/jpeg", "image/png"];
if (!validTypes.includes(file.type)) {
  showError("Only PDF and image files are allowed");
}

// Response error
if (!response.ok) {
  const error = await response.json();
  showError(error.message);
}
```

---

## Loading States

- Show loading spinner while uploading
- Disable form while processing
- Show upload progress (if possible)
- Disable buttons while fetching data

---

## Email Notification

Customer receives email when invoice is sent containing:
- Invoice ID
- File name
- Notes (if any)
- Link to view invoices on platform

No action needed on frontend for this - backend handles it!

---

## Testing Checklist

Before submitting:
- [ ] Upload form submits successfully
- [ ] Customer receives email
- [ ] Invoice appears in admin list
- [ ] Invoice appears in customer's list
- [ ] Download button works
- [ ] Delete removes from list and deletes file
- [ ] Send button works for unsent invoices
- [ ] Error messages display correctly
- [ ] Form resets after successful upload
- [ ] Authorization checks work

---

## Support Files for Reference

1. **[INVOICE_UPLOAD_API.md](./INVOICE_UPLOAD_API.md)** - Complete API documentation with examples
2. **[FRONTEND_INSTRUCTIONS.md](./FRONTEND_INSTRUCTIONS.md)** - Detailed implementation guide

---

## Questions?

- API endpoints in: `routes/invoiceRoutes.js`
- Controllers in: `controllers/invoiceController.js`
- Database model in: `models/Invoice.js`
- Email setup in: `utils/sendEmail.js`

**All backend is ready to integrate! 🎉**
