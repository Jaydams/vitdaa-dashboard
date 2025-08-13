# Invoice Print & Download Functionality

## Overview

This document describes the implementation of print and download functionalities for orders/invoices in the restaurant management system.

## Features Implemented

### 1. Print Invoice
- **Function**: `printInvoice(order: Order)`
- **Location**: `lib/invoice-utils.ts`
- **Description**: Opens a new window with a formatted invoice and triggers the browser's print dialog
- **Features**:
  - Professional invoice layout with business branding
  - Complete order details including items, pricing, and customer information
  - Print-optimized CSS styling
  - Nigerian Naira (₦) currency formatting
  - Automatic window cleanup after printing

### 2. Download as PDF
- **Function**: `downloadInvoiceAsPDF(order: Order)`
- **Description**: Uses browser's "Save as PDF" functionality through the print dialog
- **Note**: In production, consider using a proper PDF library like jsPDF for more control

### 3. Download as JSON
- **Function**: `downloadInvoiceAsJSON(order: Order)`
- **Description**: Downloads complete order data as a JSON file
- **Use Case**: Data backup, API integration, or data analysis

### 4. Download as CSV
- **Function**: `downloadInvoiceAsCSV(order: Order)`
- **Description**: Downloads order data in CSV format for spreadsheet applications
- **Features**:
  - Includes all order details
  - Properly formatted currency values
  - Itemized breakdown of order items

## Components

### 1. Invoice Template Component
- **Location**: `components/shared/InvoiceTemplate.tsx`
- **Purpose**: Reusable invoice template for display and printing
- **Features**:
  - Responsive design
  - Professional layout
  - Complete order information display
  - Business branding integration

### 2. Invoice Actions Component
- **Location**: `app/(dashboard)/orders/[id]/_components/InvoiceActions.tsx`
- **Purpose**: Client-side component for handling print and download actions
- **Features**:
  - Loading states
  - Error handling with toast notifications
  - Multiple download format options

### 3. Updated Orders Table
- **Location**: `app/(dashboard)/orders/_components/orders-table/columns.tsx`
- **Features**:
  - Print button for each order
  - Dropdown menu with multiple download options
  - Integration with invoice utilities

## Usage

### From Orders Table
1. Navigate to `/orders`
2. Click the printer icon to print an invoice
3. Click the download icon to access download options:
   - Download as PDF
   - Download as JSON
   - Download as CSV
   - View Details

### From Order Detail Page
1. Navigate to a specific order detail page
2. Use the action buttons in the top-right corner:
   - "Print Invoice" button
   - "Download" dropdown with multiple format options

## Technical Implementation

### Print Functionality
```typescript
export function printInvoice(order: Order) {
  const printWindow = window.open('', '_blank');
  // Generate HTML content with proper styling
  // Write content to new window
  // Trigger print dialog
  // Clean up window
}
```

### Download Functionality
```typescript
export function downloadInvoiceAsJSON(order: Order) {
  const dataStr = JSON.stringify(order, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  // Create download link and trigger download
}
```

## Styling

### Print-Optimized CSS
- Clean, professional layout
- Proper page breaks
- Optimized for A4 paper
- Business branding integration
- Nigerian Naira currency formatting

### Invoice Layout
- Header with business information
- Customer and order details
- Itemized order table
- Payment summary
- Footer with contact information

## Business Information

The invoice template includes:
- **Business Name**: The Blueplate Restaurant
- **Address**: 123 Restaurant Street, Kaduna, Nigeria
- **Phone**: +234 801 234 5678
- **Email**: info@blueplate.com

## Currency Formatting

All monetary values are formatted using:
- **Currency**: Nigerian Naira (₦)
- **Locale**: en-NG (Nigerian English)
- **Format**: ₦1,234.56

## Error Handling

- Toast notifications for success/failure
- Loading states during operations
- Graceful fallbacks for failed operations
- User-friendly error messages

## Future Enhancements

1. **Advanced PDF Generation**: Integrate jsPDF for more control over PDF output
2. **Email Integration**: Send invoices directly via email
3. **Digital Signatures**: Add digital signature capabilities
4. **QR Code**: Include QR codes for digital payments
5. **Multi-language Support**: Support for multiple languages
6. **Custom Templates**: Allow business owners to customize invoice templates
7. **Bulk Operations**: Print/download multiple invoices at once

## Browser Compatibility

- **Print**: Works in all modern browsers
- **PDF Download**: Uses browser's built-in PDF generation
- **File Downloads**: Compatible with all modern browsers
- **Mobile**: Responsive design for mobile devices

## Security Considerations

- Client-side operations only (no server-side PDF generation)
- No sensitive data exposure
- Proper file type validation
- Secure download mechanisms

## Performance

- Lightweight implementation
- No external dependencies for basic functionality
- Efficient memory usage
- Fast rendering and download times 