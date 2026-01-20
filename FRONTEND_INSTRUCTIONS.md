# Frontend Integration Checklist for Invoice Upload & Sending Feature

## Backend Ready ✅

The backend has been fully implemented with the following capabilities:

### **New Endpoints Available:**

1. **POST `/api/invoices/upload-and-send`** ⭐ (Recommended)
   - Upload invoice file + send to customer in one request
   - **Required fields:** `invoice` (file), `customerId`
   - **Optional fields:** `totalAmount`, `notes`
   - Returns: Invoice object with `isSent: true` and `sentAt` timestamp

2. **POST `/api/invoices/upload`**
   - Upload invoice only (send later)
   - Same required/optional fields as above

3. **POST `/api/invoices/:invoiceId/send`**
   - Send already-uploaded invoice to customer
   - Required body: `{ customerId }`

4. **GET `/api/invoices/`** (Admin)
   - Get all invoices with customer and admin info

5. **GET `/api/invoices/my-invoices/list`** (Customer)
   - Get customer's own invoices

6. **GET `/api/invoices/customer/:customerId`** (Admin)
   - Get all invoices for specific customer

7. **GET `/api/invoices/details/:invoiceId`**
   - Get specific invoice details

8. **DELETE `/api/invoices/:invoiceId`** (Admin)
   - Delete invoice and remove file

9. **GET `/api/invoices/:invoiceId/pdf`**
   - Download invoice as PDF

---

## UI/UX Components You Need to Build

### **For Admin Users:**

#### 1. **Invoice Upload Form**
```
┌─────────────────────────────────┐
│ INVOICE UPLOAD & SEND FORM      │
├─────────────────────────────────┤
│                                 │
│ Customer: [Dropdown ▼]          │
│          (fetch customers)      │
│                                 │
│ Invoice File: [Choose File]     │
│              (PDF/Image only)   │
│                                 │
│ Total Amount: [________]        │
│                                 │
│ Notes: [________________]       │
│        [________________]       │
│                                 │
│ [Upload Only] [Upload & Send]  │
│                                 │
└─────────────────────────────────┘
```

**What it should do:**
- Collect file, customer ID, amount, notes
- Call `POST /api/invoices/upload-and-send`
- Show success/error message
- Reload invoice list

#### 2. **Invoice Management Table**
```
┌────────────────────────────────────────────────────────────┐
│ ALL INVOICES                                               │
├──────┬───────────┬──────────┬────────┬──────────┬──────────┤
│ID    │Customer   │File Name │Amount  │Sent      │Actions   │
├──────┼───────────┼──────────┼────────┼──────────┼──────────┤
│123   │John Doe   │invoice.pdf│$150   │✓ Sent    │View      │
│      │           │          │        │1/20/26   │Download  │
│      │           │          │        │          │Delete    │
├──────┼───────────┼──────────┼────────┼──────────┼──────────┤
│124   │Jane Smith │invoice2.pdf│$200  │✗ Not Sent│View      │
│      │           │          │        │          │Send Now  │
│      │           │          │        │          │Delete    │
└──────┴───────────┴──────────┴────────┴──────────┴──────────┘
```

**Features:**
- Display all invoices (GET `/api/invoices/`)
- Show customer name, file, amount
- Show sent status and date
- Action buttons:
  - "View" → Show details
  - "Send Now" → Send unsent invoice (if not sent)
  - "Download" → Download PDF or file
  - "Delete" → Delete invoice (DELETE request)

#### 3. **Customer Invoices View** (Admin perspective)
- Click on customer in a dropdown/search
- Call `GET /api/invoices/customer/:customerId`
- Show all invoices for that customer
- Quick upload form on same page to send them new invoices

### **For Customer Users:**

#### 1. **My Invoices Dashboard**
```
┌────────────────────────────────────┐
│ MY INVOICES                        │
├────────┬──────────┬────────┬──────┤
│File    │Amount    │Sent On │Action│
├────────┼──────────┼────────┼──────┤
│invoice1│$150.00   │1/15/26 │View  │
│invoice2│$200.00   │1/10/26 │View  │
└────────┴──────────┴────────┴──────┘
```

**Features:**
- Fetch list from `GET /api/invoices/my-invoices/list`
- Show file name, amount, sent date
- "View" button downloads/displays the file
- "Download" option for the uploaded file

---

## Data Flow Diagram

```
ADMIN UPLOADS INVOICE
        ↓
  File Form Data
  - File (PDF/Image)
  - Customer ID
  - Amount (optional)
  - Notes (optional)
        ↓
POST /api/invoices/upload-and-send
        ↓
   Backend Processing:
   1. Validate file type
   2. Store file in uploads/invoices/
   3. Create Invoice record in DB
   4. Send email to customer
   5. Mark as isSent: true
        ↓
CUSTOMER RECEIVES EMAIL
        ↓
CUSTOMER LOGS IN & VIEWS INVOICE
        ↓
GET /api/invoices/my-invoices/list
        ↓
Display in "My Invoices" section
        ↓
Customer can download file or view PDF
```

---

## Important Response Structure

### When Invoice is Successfully Sent:

```json
{
  "message": "Invoice uploaded and sent successfully",
  "invoice": {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "fileName": "invoice_1234.pdf",
    "fileUrl": "/uploads/invoices/1234567890.pdf",
    "totalAmount": 150.00,
    "customer": "John Doe",
    "customerEmail": "john@example.com",
    "isSent": true,
    "sentAt": "2026-01-20T10:30:00.000Z",
    "createdAt": "2026-01-20T10:30:00.000Z"
  }
}
```

### When Fetching All Invoices (Admin):

```json
[
  {
    "_id": "65a1b2c3d4e5f6g7h8i9j0k1",
    "customer": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k2",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "fileName": "invoice_1234.pdf",
    "fileUrl": "/uploads/invoices/1234567890.pdf",
    "totalAmount": 150.00,
    "isSent": true,
    "sentAt": "2026-01-20T10:30:00.000Z",
    "sentBy": {
      "_id": "65a1b2c3d4e5f6g7h8i9j0k3",
      "name": "Admin User",
      "email": "admin@example.com"
    },
    "notes": "Payment due within 30 days",
    "createdAt": "2026-01-20T10:30:00.000Z"
  }
]
```

---

## File Upload Restrictions

- **Allowed types:** `.pdf`, `.jpg`, `.jpeg`, `.png`
- **Max size:** 10MB
- **Storage:** `uploads/invoices/` directory
- **Access:** `/uploads/invoices/filename.pdf` in browser

---

## Email Notification Details

When an invoice is sent, the customer receives an email containing:
- ✉️ Subject: `Invoice from Doyle's Coffee - [Invoice ID]`
- 📄 Invoice ID
- 📎 File name
- 📝 Notes (if provided)
- 🎨 Branded HTML email template

---

## Authentication Notes

- All endpoints require Bearer token in Authorization header
- Admin-only endpoints require `role: "admin"`
- Customers can only access their own invoices
- File uploads require admin role

---

## Setup Required

✅ Run: `npm install` (multer already added to package.json)  
✅ Create `uploads/invoices/` directory (will auto-create on first upload)  
✅ Ensure `.env` has `RESEND_API_KEY` for email sending

---

## Sample Frontend Code Snippets

### Upload Invoice:
```javascript
const handleUploadInvoice = async (file, customerId, amount, notes) => {
  const formData = new FormData();
  formData.append("invoice", file);
  formData.append("customerId", customerId);
  formData.append("totalAmount", amount);
  formData.append("notes", notes);

  const response = await fetch(`${API_URL}/api/invoices/upload-and-send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();
    console.log("Invoice sent successfully:", data.invoice);
    // Refresh invoice list, show success message, etc.
  } else {
    console.error("Upload failed");
  }
};
```

### Fetch Admin Invoices:
```javascript
const fetchAllInvoices = async () => {
  const response = await fetch(`${API_URL}/api/invoices/`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
```

### Fetch Customer Invoices:
```javascript
const fetchMyInvoices = async () => {
  const response = await fetch(`${API_URL}/api/invoices/my-invoices/list`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};
```

### Download Invoice File:
```javascript
const downloadInvoice = (fileUrl) => {
  window.open(`${API_URL}${fileUrl}`, "_blank");
};
```

---

## Testing the Backend

### Test Upload via cURL:
```bash
curl -X POST http://localhost:4000/api/invoices/upload-and-send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "invoice=@/path/to/test.pdf" \
  -F "customerId=65a1b2c3d4e5f6g7h8i9j0k1" \
  -F "totalAmount=150.00" \
  -F "notes=Test invoice"
```

### Test Fetch via cURL:
```bash
curl http://localhost:4000/api/invoices/ \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## Ready to Build! 🚀

The backend is fully implemented and ready. Focus on:
1. ✅ Creating the upload form UI
2. ✅ Building the invoice list table
3. ✅ Implementing file download
4. ✅ Adding success/error notifications
5. ✅ Creating customer invoice dashboard

All API logic is complete and tested!
