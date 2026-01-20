# Invoice Management - Frontend Integration Guide

## Overview
The backend now supports admin-initiated invoice upload and sending functionality. Admins can upload invoice files (PDF or images) and send them to specific customers via email.

## Backend Implementation Summary

### New Database Fields (Invoice Model)
```javascript
{
  // ... existing fields
  isSent: Boolean,           // Tracks if invoice was sent
  sentAt: Date,              // When invoice was sent
  sentBy: ObjectId (User),   // Which admin sent it
  fileName: String,          // Original filename
}
```

### New API Endpoints

#### 1. **Upload Invoice Only**
**Endpoint:** `POST /api/invoices/upload`  
**Auth:** Required (Admin only)  
**Content-Type:** `multipart/form-data`

**Request Body:**
```javascript
{
  invoice: File,           // PDF or image file
  customerId: String,      // MongoDB User ID
  totalAmount: Number,     // Optional
  notes: String           // Optional
}
```

**Response:**
```javascript
{
  message: "Invoice uploaded successfully",
  invoice: {
    _id: String,
    fileName: String,
    fileUrl: String,       // e.g., "/uploads/invoices/1234567890.pdf"
    totalAmount: Number,
    customer: String,      // Customer name
    createdAt: Date
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:4000/api/invoices/upload \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -F "invoice=@path/to/invoice.pdf" \
  -F "customerId=65a1b2c3d4e5f6g7h8i9j0k1" \
  -F "totalAmount=150.00" \
  -F "notes=Payment due within 30 days"
```

---

#### 2. **Send Already Uploaded Invoice**
**Endpoint:** `POST /api/invoices/:invoiceId/send`  
**Auth:** Required (Admin only)  
**Content-Type:** `application/json`

**Request Body:**
```javascript
{
  customerId: String  // Optional, for verification
}
```

**Response:**
```javascript
{
  message: "Invoice sent successfully",
  invoice: {
    _id: String,
    customer: String,     // Email address
    isSent: true,
    sentAt: Date
  }
}
```

**Example cURL:**
```bash
curl -X POST http://localhost:4000/api/invoices/65a1b2c3d4e5f6g7h8i9j0k1/send \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customerId": "65a1b2c3d4e5f6g7h8i9j0k1"}'
```

---

#### 3. **Upload and Send in One Request** (Recommended)
**Endpoint:** `POST /api/invoices/upload-and-send`  
**Auth:** Required (Admin only)  
**Content-Type:** `multipart/form-data`

**Request Body:**
```javascript
{
  invoice: File,           // PDF or image file
  customerId: String,      // MongoDB User ID (required)
  totalAmount: Number,     // Optional
  notes: String           // Optional
}
```

**Response:**
```javascript
{
  message: "Invoice uploaded and sent successfully",
  invoice: {
    _id: String,
    fileName: String,
    fileUrl: String,
    totalAmount: Number,
    customer: String,       // Customer name
    customerEmail: String,  // Email address
    isSent: true,
    sentAt: Date,
    createdAt: Date
  }
}
```

---

#### 4. **Get All Invoices** (Admin only)
**Endpoint:** `GET /api/invoices/`  
**Auth:** Required (Admin only)

**Response:**
```javascript
[
  {
    _id: String,
    customer: {
      _id: String,
      name: String,
      email: String
    },
    fileName: String,
    fileUrl: String,
    totalAmount: Number,
    isSent: Boolean,
    sentAt: Date,
    sentBy: {
      _id: String,
      name: String,
      email: String
    },
    notes: String,
    createdAt: Date
  }
]
```

---

#### 5. **Get Customer's Invoices** (Customer only)
**Endpoint:** `GET /api/invoices/my-invoices/list`  
**Auth:** Required (Any user)

**Response:**
```javascript
[
  {
    _id: String,
    fileName: String,
    fileUrl: String,
    totalAmount: Number,
    isSent: Boolean,
    sentAt: Date,
    sentBy: {
      _id: String,
      name: String,
      email: String
    },
    notes: String,
    createdAt: Date
  }
]
```

---

#### 6. **Get Specific Customer's All Invoices** (Admin only)
**Endpoint:** `GET /api/invoices/customer/:customerId`  
**Auth:** Required (Admin only)

**Response:**
```javascript
{
  customer: {
    _id: String,
    name: String,
    email: String
  },
  invoices: [
    // ... invoice objects
  ]
}
```

---

#### 7. **Get Specific Invoice Details**
**Endpoint:** `GET /api/invoices/details/:invoiceId`  
**Auth:** Required (Admin or invoice customer)

**Response:**
```javascript
{
  _id: String,
  customer: {
    _id: String,
    name: String,
    email: String
  },
  fileName: String,
  fileUrl: String,
  totalAmount: Number,
  isSent: Boolean,
  sentAt: Date,
  sentBy: {
    _id: String,
    name: String,
    email: String
  },
  notes: String,
  createdAt: Date
}
```

---

#### 8. **Delete Invoice** (Admin only)
**Endpoint:** `DELETE /api/invoices/:invoiceId`  
**Auth:** Required (Admin only)

**Response:**
```javascript
{
  message: "Invoice deleted successfully"
}
```

---

#### 9. **Download Invoice as PDF**
**Endpoint:** `GET /api/invoices/:invoiceId/pdf`  
**Auth:** Required (Admin or invoice customer)

**Response:** PDF file stream

---

## Frontend Implementation Requirements

### 1. **Admin Invoice Management Panel**
You need to create an admin interface with:

- **Upload Form:**
  - File input (accept PDF and image files)
  - Customer selector dropdown (fetch from `/api/auth/users` or similar)
  - Total amount input
  - Notes textarea
  - Action buttons: "Upload Only" or "Upload & Send Now"

- **Invoice List:**
  - Table showing all uploaded invoices
  - Columns: Customer Name, File Name, Amount, Sent Status, Sent Date, Actions
  - Action buttons: "View", "Send Now" (if not sent), "Delete", "Download PDF"
  - Filter/search by customer name

- **Customer Details View:**
  - Endpoint: `GET /api/invoices/customer/:customerId`
  - Show all invoices for a specific customer
  - Ability to upload and send new invoices from this view

### 2. **Customer Invoice Dashboard**
Customers should see:

- **My Invoices Section:**
  - List of invoices sent to them
  - Columns: File Name, Amount, Sent Date, Download Link
  - Download button to view/download the PDF

### 3. **Key Frontend Implementation Steps**

#### Step A: File Upload Handling
```javascript
// Example using FormData
const uploadInvoice = async (file, customerId, totalAmount, notes) => {
  const formData = new FormData();
  formData.append("invoice", file);
  formData.append("customerId", customerId);
  formData.append("totalAmount", totalAmount);
  formData.append("notes", notes);

  const response = await fetch("http://your-api/api/invoices/upload-and-send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return response.json();
};
```

#### Step B: Fetch Customer List
```javascript
// You may need to create or expose an endpoint to get all customers
// Suggested endpoint: GET /api/users?role=customer (Admin only)
// Or use existing order/quote customers
```

#### Step C: Send Existing Invoice
```javascript
const sendInvoice = async (invoiceId, customerId) => {
  const response = await fetch(
    `http://your-api/api/invoices/${invoiceId}/send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ customerId }),
    }
  );

  return response.json();
};
```

#### Step D: Fetch Invoices
```javascript
// Admin - Get all invoices
const getAllInvoices = async () => {
  const response = await fetch("http://your-api/api/invoices/", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// Customer - Get their invoices
const getMyInvoices = async () => {
  const response = await fetch(
    "http://your-api/api/invoices/my-invoices/list",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.json();
};

// Admin - Get specific customer invoices
const getCustomerInvoices = async (customerId) => {
  const response = await fetch(
    `http://your-api/api/invoices/customer/${customerId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.json();
};
```

#### Step E: Download Invoice File
```javascript
// If the invoice has a fileUrl, you can create a download link
const downloadInvoice = (fileUrl) => {
  window.open(`http://your-api${fileUrl}`, "_blank");
};

// Or generate PDF from invoice details
const downloadInvoiceAsPDF = async (invoiceId) => {
  const response = await fetch(
    `http://your-api/api/invoices/${invoiceId}/pdf`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "invoice.pdf";
  a.click();
  window.URL.revokeObjectURL(url);
};
```

### 4. **File Upload Restrictions**
- Accepted types: PDF, JPEG, PNG, JPG
- Max file size: 10MB
- Files are saved to `uploads/invoices/` directory

### 5. **Error Handling**
Common error responses:
```javascript
// No file uploaded
{ message: "No file uploaded" }

// Customer not found
{ message: "Customer not found" }

// Invoice not found
{ message: "Invoice not found" }

// Not authorized
{ message: "Not authorized" }

// Invalid file type
{ message: "Invalid file type. Only PDF and image files (JPEG, PNG) are allowed." }
```

### 6. **Email Notification**
When an invoice is sent:
- Customer receives an email with the invoice details
- Email includes: Invoice ID, File name, Notes, and links back to platform
- Email is sent via Resend (ensure RESEND_API_KEY is set in .env)

### 7. **Important Notes**
- All file upload endpoints require admin authentication
- Customers can only see their own invoices
- Uploaded files are stored in `uploads/invoices/` directory
- Use the `isSent` and `sentAt` fields to display invoice status
- The `sentBy` field tracks which admin sent the invoice

---

## Testing Checklist

- [ ] Admin can upload invoice successfully
- [ ] Admin can send invoice to customer
- [ ] Customer receives email notification
- [ ] Customer can view their invoices
- [ ] Admin can delete invoices
- [ ] Files are properly stored
- [ ] Proper error handling for invalid files
- [ ] Authorization checks work correctly
- [ ] PDF generation works for invoices with orders

---

## Next Steps for Frontend Dev

1. Create Admin Dashboard → Invoice Management section
2. Create Admin Form for uploading invoices
3. Create Admin List view for all invoices
4. Create Customer Dashboard → My Invoices section
5. Implement file download functionality
6. Add error handling and user feedback
7. Style according to your design system
8. Test all CRUD operations
