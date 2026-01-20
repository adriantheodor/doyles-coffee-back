# Frontend Component Blueprint

## Components You Need to Build

### Component 1: InvoiceUploadForm (Admin Only)

**Location:** `components/admin/InvoiceUploadForm.jsx` (or .tsx)

**Props:** `onUploadSuccess`, `refreshInvoiceList`

**State:**
- selectedCustomer
- selectedFile
- totalAmount
- notes
- isLoading
- error
- success

**UI Elements:**
1. Customer Dropdown
   - Fetch from: `GET /api/users?role=customer` (or wherever customers are)
   - Display: Name, with email as hint
   - Required field
   
2. File Input
   - Accept: `.pdf,.jpg,.jpeg,.png`
   - Show file name after selection
   - Validate file size (max 10MB)
   - Show file preview or icon
   
3. Amount Input
   - Type: number
   - Placeholder: "$0.00"
   - Optional
   
4. Notes Textarea
   - Placeholder: "Add notes about this invoice..."
   - Optional
   
5. Buttons
   - "Upload & Send Now" (primary)
   - "Cancel" (secondary)
   - Disable during upload

6. Messages
   - Error message (red, dismissible)
   - Success message (green)
   - Loading spinner during upload

**Functions:**
```javascript
const handleFileChange = (file) => {
  // Validate type and size
  // Store in state
}

const handleUpload = async () => {
  // Create FormData
  // Call POST /api/invoices/upload-and-send
  // Show success/error
  // Call onUploadSuccess()
}
```

---

### Component 2: InvoiceListTable (Admin Only)

**Location:** `components/admin/InvoiceListTable.jsx`

**Props:** `invoices`, `onDelete`, `onSend`, `onRefresh`, `loading`

**Features:**
1. Table with columns:
   - Customer Name (with email tooltip)
   - File Name (clickable to preview)
   - Total Amount
   - Status Badge (Sent ✓ / Not Sent ✗)
   - Sent Date (if sent)
   - Sent By (admin name)
   - Actions

2. Action Buttons (in each row):
   - "View" → Open details modal
   - "Download" → Download file or PDF
   - "Send Now" → Only if not sent
   - "Delete" → Confirm then delete

3. Sorting/Filtering (Optional but nice):
   - Sort by customer, date, status
   - Filter by sent status
   - Search by customer name

4. States:
   - Loading (show skeleton)
   - Empty (no invoices)
   - Loaded (display table)
   - Pagination (if many invoices)

**Functions:**
```javascript
const fetchInvoices = async () => {
  // GET /api/invoices/
  // Update state with invoices
}

const handleDelete = async (invoiceId) => {
  // Confirm delete
  // DELETE /api/invoices/{invoiceId}
  // Call onRefresh()
}

const handleSend = async (invoiceId) => {
  // POST /api/invoices/{invoiceId}/send
  // Show success
  // Call onRefresh()
}

const handleDownload = (fileUrl) => {
  // Option 1: Direct link
  // window.open(fileUrl)
  
  // Option 2: PDF generation
  // GET /api/invoices/{id}/pdf
}
```

---

### Component 3: MyInvoicesList (Customer Only)

**Location:** `components/customer/MyInvoicesList.jsx`

**Props:** None (uses own state)

**Features:**
1. Simple table showing:
   - File Name (clickable)
   - Total Amount
   - Sent Date
   - Download Button

2. No action buttons (read-only)

3. Messages:
   - "No invoices yet" when empty
   - Loading state

**Functions:**
```javascript
const fetchMyInvoices = async () => {
  // GET /api/invoices/my-invoices/list
  // Update state
}

const handleDownload = (fileUrl) => {
  // Open download link
}
```

---

### Component 4: InvoiceDetailsModal

**Location:** `components/shared/InvoiceDetailsModal.jsx`

**Props:** `invoice`, `isOpen`, `onClose`

**Display:**
- Invoice ID (copyable)
- Customer Name & Email
- File Name (downloadable)
- Total Amount
- Notes (if any)
- Sent Status
- Sent Date
- Sent By (admin name)
- Created Date
- Close Button

```jsx
<Modal isOpen={isOpen} onClose={onClose}>
  <h2>Invoice Details</h2>
  <div>
    <p><strong>ID:</strong> {invoice._id}</p>
    <p><strong>Customer:</strong> {invoice.customer.name}</p>
    <p><strong>Email:</strong> {invoice.customer.email}</p>
    <p><strong>File:</strong> 
       <a href={invoice.fileUrl}>{invoice.fileName}</a>
    </p>
    <p><strong>Amount:</strong> ${invoice.totalAmount}</p>
    <p><strong>Status:</strong> 
       {invoice.isSent ? '✓ Sent' : '✗ Not Sent'}
    </p>
    {invoice.isSent && (
      <p><strong>Sent At:</strong> {formatDate(invoice.sentAt)}</p>
    )}
    {invoice.notes && (
      <p><strong>Notes:</strong> {invoice.notes}</p>
    )}
  </div>
  <button onClick={onClose}>Close</button>
</Modal>
```

---

## Page Layouts

### Admin - Invoice Management Page

```
┌─────────────────────────────────────────────────┐
│ INVOICE MANAGEMENT                          [≡] │
├─────────────────────────────────────────────────┤
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ UPLOAD NEW INVOICE                          │ │
│ ├─────────────────────────────────────────────┤ │
│ │ Customer: [Select Customer ▼]               │ │
│ │ Invoice: [Choose File] invoice.pdf          │ │
│ │ Amount: [$________]                         │ │
│ │ Notes: [___________________]                │ │
│ │ [Upload & Send]  [Cancel]                   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │ ALL INVOICES                                │ │
│ │ [Search] [Filter by Status ▼]               │ │
│ ├────┬────────┬────────┬──────┬──────┬───────┤ │
│ │Cust│ File   │ Amount │Status│Date  │Action │ │
│ ├────┼────────┼────────┼──────┼──────┼───────┤ │
│ │John│inv1.pdf│$150.00 │✓Sent │1/20 │View   │ │
│ │    │        │        │1/20  │     │Del   │ │
│ ├────┼────────┼────────┼──────┼──────┼───────┤ │
│ │Jane│inv2.pdf│$200.00 │✗Not  │     │Send   │ │
│ │    │        │        │      │     │View   │ │
│ │    │        │        │      │     │Del    │ │
│ └────┴────────┴────────┴──────┴──────┴───────┘ │
│                                                 │
│ Showing 1-10 of 25    [< 1 2 3 ... >]          │
└─────────────────────────────────────────────────┘
```

### Customer - My Invoices Page

```
┌──────────────────────────────────┐
│ MY INVOICES                  [≡] │
├──────────────────────────────────┤
│                                  │
│ ┌──────────────────────────────┐ │
│ │ MY INVOICES                  │ │
│ ├─────────┬────────┬──────────┤ │
│ │File     │ Amount │ Sent Date│ │
│ ├─────────┼────────┼──────────┤ │
│ │inv1.pdf │$150.00 │ 1/20/26  │ │
│ │[View]   │        │[Download]│ │
│ ├─────────┼────────┼──────────┤ │
│ │inv2.pdf │$200.00 │ 1/15/26  │ │
│ │[View]   │        │[Download]│ │
│ └─────────┴────────┴──────────┘ │
│                                  │
└──────────────────────────────────┘
```

---

## API Integration Functions

### Utils File: `utils/invoiceAPI.js`

```javascript
const API_BASE = process.env.REACT_APP_API_URL;

export const invoiceAPI = {
  // Upload & Send
  uploadAndSendInvoice: async (formData, token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/upload-and-send`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Upload Only
  uploadInvoice: async (formData, token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/upload`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Get All (Admin)
  getAllInvoices: async (token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Get My Invoices (Customer)
  getMyInvoices: async (token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/my-invoices/list`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Get Customer Invoices (Admin)
  getCustomerInvoices: async (customerId, token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/customer/${customerId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Get Invoice Details
  getInvoice: async (invoiceId, token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/details/${invoiceId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Send Invoice
  sendInvoice: async (invoiceId, customerId, token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ customerId }),
      }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Delete Invoice
  deleteInvoice: async (invoiceId, token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  },

  // Download PDF
  downloadInvoicePDF: async (invoiceId, token) => {
    const response = await fetch(
      `${API_BASE}/api/invoices/${invoiceId}/pdf`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error(await response.text());
    return response.blob();
  },
};
```

---

## Example Component Code (React)

### InvoiceUploadForm Component

```jsx
import { useState } from 'react';
import { invoiceAPI } from '../../utils/invoiceAPI';

export default function InvoiceUploadForm({ onUploadSuccess }) {
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalAmount, setTotalAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!validTypes.includes(file.type)) {
        setError('Only PDF and image files are allowed');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedFile) {
      setError('Please select a customer and file');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('invoice', selectedFile);
      formData.append('customerId', selectedCustomer);
      if (totalAmount) formData.append('totalAmount', totalAmount);
      if (notes) formData.append('notes', notes);

      const result = await invoiceAPI.uploadAndSendInvoice(
        formData,
        localStorage.getItem('token')
      );

      setSuccess('Invoice uploaded and sent successfully!');
      // Reset form
      setSelectedCustomer('');
      setSelectedFile(null);
      setTotalAmount('');
      setNotes('');

      // Refresh list
      onUploadSuccess?.();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to upload invoice');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Upload Invoice</h2>

      {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
      {success && <div style={{ color: 'green', marginBottom: '10px' }}>{success}</div>}

      <div>
        <label>Customer *</label>
        <select
          value={selectedCustomer}
          onChange={(e) => setSelectedCustomer(e.target.value)}
          disabled={isLoading}
          required
        >
          <option value="">Select customer</option>
          {/* Options populated from API */}
        </select>
      </div>

      <div>
        <label>Invoice File *</label>
        <input
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          disabled={isLoading}
          required
        />
        {selectedFile && <p>Selected: {selectedFile.name}</p>}
      </div>

      <div>
        <label>Total Amount</label>
        <input
          type="number"
          step="0.01"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
          placeholder="$0.00"
          disabled={isLoading}
        />
      </div>

      <div>
        <label>Notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add notes..."
          disabled={isLoading}
        />
      </div>

      <div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Uploading...' : 'Upload & Send Now'}
        </button>
        <button type="reset" disabled={isLoading}>Cancel</button>
      </div>
    </form>
  );
}
```

---

## Folder Structure

```
frontend/
├── components/
│   ├── admin/
│   │   ├── InvoiceUploadForm.jsx
│   │   ├── InvoiceListTable.jsx
│   │   └── AdminInvoicePage.jsx
│   ├── customer/
│   │   ├── MyInvoicesList.jsx
│   │   └── CustomerInvoicePage.jsx
│   └── shared/
│       ├── InvoiceDetailsModal.jsx
│       └── LoadingSpinner.jsx
├── pages/
│   ├── AdminInvoices.jsx
│   └── MyInvoices.jsx
├── utils/
│   └── invoiceAPI.js
├── styles/
│   └── invoices.css
└── hooks/
    └── useInvoices.js (optional, for state management)
```

---

## That's It!

These are all the components and functions you need to build.  
All backend endpoints are documented and ready.

**Happy building! 🚀**
