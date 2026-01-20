# Frontend Development Checklist

## Pre-Development Setup

### Prerequisites
- [ ] Node.js and npm installed
- [ ] React/Vue/Angular project set up
- [ ] Backend is running on `http://localhost:4000`
- [ ] Have admin and customer test accounts
- [ ] Backend `.env` file configured with `RESEND_API_KEY`

### Environment Setup
- [ ] Set `REACT_APP_API_URL` in `.env` (e.g., `http://localhost:4000`)
- [ ] Have valid JWT tokens for testing

---

## Documentation Review

- [ ] Read `QUICK_REFERENCE.md`
- [ ] Read `SUMMARY_FOR_FRONTEND_DEV.md`
- [ ] Review `COMPONENT_BLUEPRINT.md`
- [ ] Skim `INVOICE_UPLOAD_API.md` for reference
- [ ] Understand `SYSTEM_ARCHITECTURE.md` flow

---

## Phase 1: Setup & Utilities

- [ ] Create `utils/invoiceAPI.js` with all API functions
- [ ] Create helper functions for:
  - [ ] `formatDate()` - format dates for display
  - [ ] `formatCurrency()` - format amounts as currency
  - [ ] `getStatusBadge()` - return sent/not sent badge
  - [ ] `handleDownload()` - trigger file downloads
- [ ] Set up error handling utilities
- [ ] Create loading spinner component

---

## Phase 2: Admin Upload Component

### InvoiceUploadForm.jsx
- [ ] Create form component with state
- [ ] Add customer dropdown
  - [ ] Fetch customers on component mount
  - [ ] Display name with email hint
  - [ ] Handle selection
- [ ] Add file input
  - [ ] Accept PDF/JPG/PNG only
  - [ ] Show selected file name
  - [ ] Validate file size before upload
  - [ ] Show file icon/preview (optional)
- [ ] Add amount input field
- [ ] Add notes textarea
- [ ] Add submit button
  - [ ] Disable while uploading
  - [ ] Show loading text "Uploading..."
- [ ] Add cancel button
- [ ] Handle success
  - [ ] Show success message
  - [ ] Call `onUploadSuccess()` callback
  - [ ] Clear form
- [ ] Handle errors
  - [ ] Display error message
  - [ ] Show file validation errors
  - [ ] Show upload errors
- [ ] Test with real file upload

---

## Phase 3: Admin Invoice List Component

### InvoiceListTable.jsx
- [ ] Create table component with state
- [ ] Fetch all invoices on mount
  - [ ] Call `GET /api/invoices/`
  - [ ] Handle loading state
  - [ ] Handle empty state
- [ ] Display columns:
  - [ ] Customer name (clickable for details)
  - [ ] File name
  - [ ] Total amount (formatted as currency)
  - [ ] Status (✓ Sent / ✗ Not Sent)
  - [ ] Sent date (formatted, only if sent)
  - [ ] Actions
- [ ] Add action buttons:
  - [ ] "View Details" → Open modal
  - [ ] "Send Now" → Only show if not sent
  - [ ] "Download" → Download file
  - [ ] "Delete" → With confirmation
- [ ] Implement "View Details" button
  - [ ] Open InvoiceDetailsModal
  - [ ] Pass invoice data
- [ ] Implement "Send Now" button
  - [ ] Call `POST /api/invoices/:id/send`
  - [ ] Show loading/success
  - [ ] Refresh list
- [ ] Implement "Download" button
  - [ ] Download file via `/uploads/invoices/` link OR
  - [ ] Generate PDF via `/api/invoices/:id/pdf`
- [ ] Implement "Delete" button
  - [ ] Show confirmation dialog
  - [ ] Call `DELETE /api/invoices/:id`
  - [ ] Remove from list
  - [ ] Show success message
- [ ] Add sorting (optional)
  - [ ] Sort by customer, date, status
- [ ] Add filtering (optional)
  - [ ] Filter by sent status
  - [ ] Filter by customer
- [ ] Add search (optional)
  - [ ] Search by customer name

---

## Phase 4: Customer Invoice Component

### MyInvoicesList.jsx
- [ ] Create component with state
- [ ] Fetch customer's invoices on mount
  - [ ] Call `GET /api/invoices/my-invoices/list`
  - [ ] Handle loading state
  - [ ] Handle empty state ("No invoices yet")
- [ ] Display simple table with columns:
  - [ ] File name (clickable for details)
  - [ ] Amount (formatted currency)
  - [ ] Sent date (formatted)
  - [ ] Download link/button
- [ ] Implement file download
  - [ ] Download via `/uploads/invoices/` link OR
  - [ ] Generate PDF via `/api/invoices/:id/pdf`
- [ ] No delete/send buttons (read-only)

---

## Phase 5: Shared Components

### InvoiceDetailsModal.jsx
- [ ] Create modal component
- [ ] Display invoice information:
  - [ ] Invoice ID (copyable)
  - [ ] Customer name & email
  - [ ] File name (clickable download)
  - [ ] Total amount
  - [ ] Notes (if any)
  - [ ] Sent status
  - [ ] Sent date (if sent)
  - [ ] Sent by (admin name)
  - [ ] Created date
- [ ] Add close button
- [ ] Make modal responsive

### LoadingSpinner.jsx (if needed)
- [ ] Simple loading indicator
- [ ] Used during API calls

---

## Phase 6: Pages & Routing

### AdminInvoiceManagementPage.jsx
- [ ] Combine InvoiceUploadForm + InvoiceListTable
- [ ] Layout with sections
- [ ] Pass callbacks between components
- [ ] Handle page state

### CustomerInvoicesPage.jsx
- [ ] Display MyInvoicesList component
- [ ] Simple layout

### Routing
- [ ] Add routes in main app
  - [ ] `/admin/invoices` → AdminInvoiceManagementPage
  - [ ] `/my-invoices` → CustomerInvoicesPage
- [ ] Protect routes with role checks
  - [ ] Only admins can access `/admin/invoices`
  - [ ] Only logged-in users can access `/my-invoices`

---

## Phase 7: Styling

- [ ] Style upload form
  - [ ] Clean, modern layout
  - [ ] Clear labels and inputs
  - [ ] Button states (default, hover, disabled)
  - [ ] Error message styling (red)
  - [ ] Success message styling (green)
- [ ] Style invoice table
  - [ ] Clear, readable layout
  - [ ] Status badge styling
  - [ ] Action button styling
  - [ ] Hover effects
- [ ] Style modals
  - [ ] Centered, overlaid
  - [ ] Clear close button
  - [ ] Responsive width
- [ ] Mobile responsive
  - [ ] Stack form vertically on mobile
  - [ ] Horizontal scroll for table on mobile
  - [ ] Touch-friendly buttons

---

## Phase 8: Testing

### Unit Tests
- [ ] Test component rendering
- [ ] Test form validation
- [ ] Test button clicks
- [ ] Test state updates

### Integration Tests
- [ ] Test upload form end-to-end
  - [ ] Select file
  - [ ] Select customer
  - [ ] Submit form
  - [ ] Verify success message
  - [ ] Verify API called correctly
- [ ] Test invoice list
  - [ ] Load invoices
  - [ ] Display correctly
  - [ ] Click actions
- [ ] Test download functionality
  - [ ] File downloads successfully

### Manual Testing Checklist

**Admin User:**
- [ ] Can access admin invoice page
- [ ] Can see all invoices in list
- [ ] Can upload new invoice
- [ ] Customer receives email after upload
- [ ] Invoice appears in admin list with "Sent" status
- [ ] Can send unsent invoices
- [ ] Can delete invoices
- [ ] Can download invoices
- [ ] Can see invoice details in modal
- [ ] Cannot access customer invoice page

**Customer User:**
- [ ] Can access my invoices page
- [ ] Can see received invoices in list
- [ ] Cannot see admin features
- [ ] Can download received invoices
- [ ] Can view invoice details
- [ ] Invoice shows correct sent date
- [ ] Cannot upload or send invoices

**Error Handling:**
- [ ] Shows error for invalid file type
- [ ] Shows error for file too large
- [ ] Shows error when customer not selected
- [ ] Shows error when file not selected
- [ ] Shows error on failed upload
- [ ] Shows error on failed delete
- [ ] Shows error on failed send
- [ ] Error messages are user-friendly

**Edge Cases:**
- [ ] Upload very large PDF (near 10MB)
- [ ] Upload to non-existent customer ID
- [ ] Send invoice without customer selected
- [ ] Delete then refresh list
- [ ] Rapid button clicks (prevent duplicate submissions)
- [ ] Network disconnect during upload
- [ ] Very long customer names/notes

---

## Phase 9: Performance & Polish

- [ ] Prevent duplicate form submissions
- [ ] Disable buttons while loading
- [ ] Add loading skeletons for list
- [ ] Add pagination for large invoice lists
- [ ] Optimize images/icons
- [ ] Add tooltips for truncated text
- [ ] Add confirmation dialogs for destructive actions
- [ ] Add success toast notifications
- [ ] Add error toast notifications
- [ ] Smooth transitions/animations

---

## Phase 10: Documentation & Handoff

- [ ] Document component props/API
- [ ] Add comments to complex functions
- [ ] Create README for invoice feature
- [ ] Document any custom hooks
- [ ] Create storybook stories (optional)
- [ ] Create API response examples
- [ ] Document error handling
- [ ] Create troubleshooting guide

---

## Final Verification

- [ ] All components render without errors
- [ ] All API calls work correctly
- [ ] All error cases handled gracefully
- [ ] Mobile responsive
- [ ] No console warnings/errors
- [ ] Accessibility checks (ARIA labels, etc.)
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Performance acceptable (no slow uploads)
- [ ] Security checks (no exposed tokens in logs)

---

## Deployment Preparation

- [ ] Update API URL for production (`REACT_APP_API_URL`)
- [ ] Test in production environment
- [ ] Set up file upload storage (S3 if needed)
- [ ] Test email sending in production
- [ ] Monitor for errors in production
- [ ] Set up analytics/logging

---

## Timeline Estimate

- Phase 1 (Setup): 1-2 hours
- Phase 2 (Upload): 3-4 hours
- Phase 3 (Admin List): 4-5 hours
- Phase 4 (Customer): 2-3 hours
- Phase 5 (Shared): 1-2 hours
- Phase 6 (Routing): 1-2 hours
- Phase 7 (Styling): 3-4 hours
- Phase 8 (Testing): 3-4 hours
- Phase 9 (Polish): 2-3 hours
- Phase 10 (Docs): 1-2 hours

**Total: ~25-35 hours**

---

## Success Criteria

✅ Admin can upload and send invoices  
✅ Customers receive email notifications  
✅ Customers can view their invoices  
✅ Admin can manage all invoices  
✅ File downloads work correctly  
✅ All error cases handled  
✅ Mobile responsive  
✅ No console errors  

---

## Get Help

- API docs: `INVOICE_UPLOAD_API.md`
- Component guide: `COMPONENT_BLUEPRINT.md`
- Architecture: `SYSTEM_ARCHITECTURE.md`
- Quick ref: `QUICK_REFERENCE.md`

---

## Ready to Start?

1. ✅ Read the docs
2. ✅ Set up utilities
3. ✅ Build components in order
4. ✅ Test thoroughly
5. ✅ Deploy!

**You've got this! 🚀**
